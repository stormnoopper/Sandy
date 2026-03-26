'use client'

import { useEffect, useRef, useState } from 'react'
import mermaid from 'mermaid'
import { NodeViewContent, NodeViewWrapper, useEditorState } from '@tiptap/react'
import type { NodeViewProps } from '@tiptap/react'
import { fixMermaidQuotedLabels } from '@/lib/mermaid-quote-fix'
import { setCodeBlockInnerText } from '@/lib/tiptap-code-block-text'
import { toast } from '@/hooks/use-toast'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

let mermaidInitialized = false

function initMermaid() {
  if (mermaidInitialized) return
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'loose',
    fontFamily: 'inherit',
    theme: 'neutral',
  })
  mermaidInitialized = true
}

function isMermaidErrorSvg(svg: string): boolean {
  const textOnly = svg.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').toLowerCase()
  return (
    (textOnly.includes('syntax error') && textOnly.includes('mermaid version')) ||
    (textOnly.includes('lexical error') && textOnly.includes('mermaid version')) ||
    (textOnly.includes('parse error') && textOnly.includes('mermaid version'))
  )
}

export function MermaidCodeBlockView(props: NodeViewProps) {
  const { node, editor, getPos } = props
  const svgHostRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const lang = (node.attrs.language as string | null) || ''
  const source = node.textContent
  const renderSource = fixMermaidQuotedLabels(source)

  // Reactively track editor.isEditable so we can skip Mermaid rendering
  // while the editor is disabled (i.e. during AI generation streaming).
  const isEditable = useEditorState({
    editor,
    selector: ({ editor: e }) => e.isEditable,
  })

  useEffect(() => {
    if (open) setDraft(source)
  }, [open, source])

  useEffect(() => {
    initMermaid()
    if (lang !== 'mermaid') return

    // Skip all Mermaid rendering while the editor is disabled (generating).
    // Streaming sends incomplete Mermaid syntax which causes mermaid.render()
    // to hang and lock the UI thread. The page auto-reloads after generation,
    // at which point isEditable becomes true and diagrams render cleanly.
    if (!isEditable) return

    const host = svgHostRef.current
    if (!host) return

    let cancelled = false

    // Debounce as an extra safety net for rapid content changes.
    const timer = setTimeout(() => {
      if (cancelled) return

      host.innerHTML = ''
      const id = `mmd-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`

      mermaid
        .render(id, renderSource)
        .then(({ svg }) => {
          // Always remove any temporary element Mermaid may have left in the body
          // to prevent error SVGs from appearing outside the editor and locking scroll.
          document.getElementById(id)?.remove()
          if (cancelled) return
          if (isMermaidErrorSvg(svg)) {
            // Silently hide broken diagrams — user can click "คลิกเพื่อแก้ Flowchart" to fix.
            host.innerHTML = ''
            return
          }
          host.innerHTML = svg
        })
        .catch(() => {
          // Remove any Mermaid-created body element on error too.
          document.getElementById(id)?.remove()
          if (!cancelled) host.innerHTML = ''
        })
    }, 300)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [lang, renderSource, isEditable])

  // contentDOM is a real <code> appended inside NodeViewContent.
  if (lang !== 'mermaid') {
    return (
      <NodeViewWrapper className="my-3">
        <NodeViewContent
          as="div"
          spellCheck={false}
          className={`overflow-x-auto rounded-md border border-border bg-muted/30 p-3 text-sm font-mono whitespace-pre [overflow-wrap:anywhere] ${lang ? `language-${lang}` : ''}`}
        />
      </NodeViewWrapper>
    )
  }

  return (
    <NodeViewWrapper
      data-mermaid-block="true"
      className="mermaid-code-block my-4 rounded-md border border-border bg-muted/10 p-3"
    >
      {isEditable ? (
        <button
          type="button"
          className="w-full cursor-pointer text-left rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Open Mermaid flowchart editor"
          onClick={() => setOpen(true)}
        >
          <div
            ref={svgHostRef}
            className="mermaid-svg-host flex justify-center overflow-x-auto [&_svg]:h-auto [&_svg]:max-w-full"
            role="img"
            aria-label="Process flow diagram"
          />
        </button>
      ) : (
        <div className="flex h-28 animate-pulse items-center justify-center rounded bg-muted/40">
          <span className="text-xs text-muted-foreground">กำลังสร้าง flowchart...</span>
        </div>
      )}
      {isEditable && (
        <button
          type="button"
          className="mt-2 text-xs font-medium text-primary underline underline-offset-2"
          onClick={() => setOpen(true)}
        >
          คลิกเพื่อแก้ Flowchart
        </button>
      )}

      <NodeViewContent as="div" className="hidden" />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>แก้ไข Mermaid Flowchart</DialogTitle>
            <DialogDescription>แก้โค้ด Mermaid แล้วกดบันทึกเพื่ออัปเดตในเอกสาร</DialogDescription>
          </DialogHeader>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="rounded border border-border bg-background px-2 py-1 text-xs font-medium text-foreground hover:bg-muted/60"
              onClick={() => {
                const fixed = fixMermaidQuotedLabels(draft)
                setDraft(fixed)
                if (fixed === draft) {
                  toast({
                    title: 'ไม่พบจุดที่แก้อัตโนมัติได้',
                    description: 'ลองเปิด Mermaid Live เพื่อตรวจสอบ syntax',
                  })
                } else {
                  toast({ title: 'แก้ label อัตโนมัติสำเร็จ', description: 'แปลง " ใน label เป็น #quot; แล้ว' })
                }
              }}
            >
              แก้ label อัตโนมัติ
            </button>
            <button
              type="button"
              className="rounded border border-border bg-background px-2 py-1 text-xs font-medium text-foreground hover:bg-muted/60"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(draft)
                  toast({ title: 'คัดลอกโค้ดแล้ว' })
                } catch {
                  toast({ title: 'คัดลอกไม่สำเร็จ', variant: 'destructive' })
                }
              }}
            >
              คัดลอกโค้ด
            </button>
            <a
              className="text-xs font-medium text-primary underline underline-offset-2"
              href="https://mermaid.live"
              target="_blank"
              rel="noreferrer"
            >
              เปิด Mermaid Live
            </a>
          </div>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            spellCheck={false}
            className="min-h-[18rem] w-full rounded-md border border-border bg-background p-3 font-mono text-xs leading-relaxed text-foreground whitespace-pre"
          />
          <details className="text-xs text-muted-foreground">
            <summary className="cursor-pointer font-medium text-foreground/80">
              คำแนะนำสั้น (ลด parse error)
            </summary>
            <ul className="mt-1 list-disc space-y-0.5 pl-5">
              <li>
                ถ้ามี <code className="rounded bg-muted px-0.5">&quot;</code> ใน node label (
                <code className="rounded bg-muted px-0.5">[ ]</code>,{' '}
                <code className="rounded bg-muted px-0.5">{`{ }`}</code>,{' '}
                <code className="rounded bg-muted px-0.5">( )</code>) ให้กด <strong>แก้ label อัตโนมัติ</strong> เพื่อแปลงเป็น{' '}
                <code className="rounded bg-muted px-0.5">#quot;</code> ที่ Mermaid 11 รองรับ
              </li>
              <li>
                ลูกศร <code className="rounded bg-muted px-0.5">--&gt;</code> ต้องเป็น ASCII เท่านั้น ห้ามเป็น em-dash{' '}
                <code className="rounded bg-muted px-0.5">—</code>
              </li>
              <li>ตอนกดบันทึก ระบบจะ normalize arrow และ label ให้อัตโนมัติ</li>
            </ul>
          </details>
          <DialogFooter>
            <button
              type="button"
              className="rounded border border-border bg-background px-3 py-2 text-sm hover:bg-muted/60"
              onClick={() => setOpen(false)}
            >
              ยกเลิก
            </button>
            <button
              type="button"
              className="rounded bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
              onClick={() => {
                const pos = getPos()
                if (typeof pos !== 'number') return
                const normalized = fixMermaidQuotedLabels(draft)
                if (normalized === source) {
                  setOpen(false)
                  return
                }
                if (setCodeBlockInnerText(editor, pos, normalized)) {
                  if (normalized !== draft) {
                    toast({
                      title: 'บันทึก Flowchart แล้ว',
                      description: 'ระบบได้ normalize Mermaid label ให้อัตโนมัติ',
                    })
                  } else {
                    toast({ title: 'บันทึก Flowchart แล้ว' })
                  }
                  setOpen(false)
                }
              }}
            >
              บันทึก
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </NodeViewWrapper>
  )
}
