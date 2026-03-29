import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  UnderlineType,
  Table,
  TableRow,
  TableCell,
  WidthType,
  ShadingType,
  BorderStyle,
  ImageRun,
} from 'docx'
import { saveAs } from 'file-saver'
import { jsPDF } from 'jspdf'
import html2canvas from 'html2canvas'
import mermaid from 'mermaid'
import { fixMermaidQuotedLabels } from '@/lib/mermaid-quote-fix'

interface ExportOptions {
  projectName: string
  /** Raw HTML string from the rich text editor */
  content: string
  type: 'sow' | 'srs'
}

// ── HTML → structured nodes ────────────────────────────────────────────────

type InlineSpan = {
  text: string
  bold?: boolean
  italic?: boolean
  underline?: boolean
}

type Block =
  | { kind: 'heading'; level: 1 | 2 | 3 | 4 | 5; spans: InlineSpan[] }
  | { kind: 'paragraph'; spans: InlineSpan[]; align?: 'left' | 'center' | 'right' | 'justify' }
  | { kind: 'bullet'; spans: InlineSpan[]; depth: number }
  | { kind: 'ordered'; spans: InlineSpan[]; index: number; depth: number }
  | { kind: 'table'; rows: Array<{ isHeader: boolean; cells: InlineSpan[][] }> }
  | { kind: 'code'; text: string }
  | { kind: 'mermaid'; source: string }
  | { kind: 'hr' }

function inlineSpans(el: Element, inherited: Omit<InlineSpan, 'text'> = {}): InlineSpan[] {
  const spans: InlineSpan[] = []
  for (const child of Array.from(el.childNodes)) {
    if (child.nodeType === Node.TEXT_NODE) {
      const t = child.textContent || ''
      if (t) spans.push({ text: t, ...inherited })
    } else if (child.nodeType === Node.ELEMENT_NODE) {
      const c = child as Element
      const tag = c.tagName.toLowerCase()
      const next: Omit<InlineSpan, 'text'> = {
        bold: inherited.bold || tag === 'strong' || tag === 'b',
        italic: inherited.italic || tag === 'em' || tag === 'i',
        underline: inherited.underline || tag === 'u',
      }
      spans.push(...inlineSpans(c, next))
    }
  }
  return spans
}

function alignOf(el: Element): 'left' | 'center' | 'right' | 'justify' | undefined {
  const style = (el as HTMLElement).style?.textAlign
  if (style === 'center') return 'center'
  if (style === 'right') return 'right'
  if (style === 'justify') return 'justify'
  return undefined
}

function walkList(listEl: Element, kind: 'bullet' | 'ordered', depth: number, blocks: Block[]) {
  let idx = 1
  for (const li of Array.from(listEl.querySelectorAll(':scope > li'))) {
    const nestedUl = li.querySelector(':scope > ul')
    const nestedOl = li.querySelector(':scope > ol')
    const liClone = li.cloneNode(true) as Element
    liClone.querySelector('ul')?.remove()
    liClone.querySelector('ol')?.remove()
    const spans = inlineSpans(liClone)
    if (spans.length) {
      if (kind === 'bullet') {
        blocks.push({ kind: 'bullet', spans, depth })
      } else {
        blocks.push({ kind: 'ordered', spans, index: idx++, depth })
      }
    }
    if (nestedUl) walkList(nestedUl, 'bullet', depth + 1, blocks)
    if (nestedOl) walkList(nestedOl, 'ordered', depth + 1, blocks)
  }
}

function parseHtmlToBlocks(html: string): Block[] {
  if (typeof window === 'undefined') return []
  const tmp = document.createElement('div')
  tmp.innerHTML = html
  const blocks: Block[] = []

  function walk(node: Element) {
    const tag = node.tagName?.toLowerCase()

    if (tag === 'h1' || tag === 'h2' || tag === 'h3' || tag === 'h4' || tag === 'h5') {
      const level = parseInt(tag[1]) as 1 | 2 | 3 | 4 | 5
      blocks.push({ kind: 'heading', level, spans: inlineSpans(node) })
    } else if (tag === 'p') {
      const spans = inlineSpans(node)
      if (spans.length || node.innerHTML.trim()) {
        blocks.push({ kind: 'paragraph', spans, align: alignOf(node) })
      }
    } else if (tag === 'ul') {
      walkList(node, 'bullet', 0, blocks)
    } else if (tag === 'ol') {
      walkList(node, 'ordered', 0, blocks)
    } else if (tag === 'table') {
      const rows: Array<{ isHeader: boolean; cells: InlineSpan[][] }> = []
      for (const tr of Array.from(node.querySelectorAll('thead > tr'))) {
        rows.push({ isHeader: true, cells: Array.from(tr.querySelectorAll('th, td')).map((c) => inlineSpans(c)) })
      }
      for (const tr of Array.from(node.querySelectorAll('tbody > tr'))) {
        rows.push({ isHeader: false, cells: Array.from(tr.querySelectorAll('th, td')).map((c) => inlineSpans(c)) })
      }
      if (rows.length) blocks.push({ kind: 'table', rows })
    } else if (tag === 'pre') {
      const codeEl = node.querySelector('code')
      // Use codeEl.textContent directly to avoid picking up extra whitespace from <pre>
      const text = (codeEl ?? node).textContent || ''
      if (!text.trim()) return
      const lang = codeEl?.className?.match(/language-([\w-]+)/)?.[1] ?? ''
      if (lang === 'mermaid') {
        blocks.push({ kind: 'mermaid', source: fixMermaidQuotedLabels(text.trim()) })
      } else {
        blocks.push({ kind: 'code', text })
      }
    } else if (tag === 'hr') {
      blocks.push({ kind: 'hr' })
    } else {
      for (const child of Array.from(node.children)) walk(child)
    }
  }

  for (const child of Array.from(tmp.children)) walk(child)
  return blocks
}

// ── Mermaid rendering helpers ──────────────────────────────────────────────

let mermaidReady = false
function ensureMermaid() {
  if (mermaidReady) return
  mermaid.initialize({ startOnLoad: false, securityLevel: 'loose', theme: 'neutral', fontFamily: 'Tahoma, Arial, sans-serif' })
  mermaidReady = true
}

/**
 * Normalizes common mermaid source corruption before passing to mermaid.render().
 * - Fixes missing space between "graph" and direction (e.g. "graphTD;" → "graph TD\n")
 * - Strips trailing semicolon from the declaration line
 */
function normalizeMermaidSource(source: string): string {
  let s = source.trim()
  // Fix "graphTD" / "graphLR" / "graphTB" etc. (direction glued to keyword)
  s = s.replace(
    /^(graph)(TD|LR|TB|BT|RL)(;?)(\s|$)/im,
    (_, kw, dir, _semi, rest) => `${kw} ${dir.toUpperCase()}${rest === '\n' || rest === '' ? '\n' : '\n'}`
  )
  // Fix "flowchart TD;" → "flowchart TD\n"
  s = s.replace(
    /^(flowchart\s+(?:TD|LR|TB|BT|RL));(\s|$)/im,
    (_, decl, rest) => `${decl}${rest === '\n' || rest === '' ? '\n' : '\n'}`
  )
  return s
}

/** Renders a Mermaid source string to PNG and returns { data, width, height } for DOCX ImageRun. */
async function mermaidToPngData(source: string): Promise<{ data: Uint8Array; width: number; height: number } | null> {
  ensureMermaid()
  const normalized = normalizeMermaidSource(source)
  const id = `mmd-export-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
  try {
    const { svg } = await mermaid.render(id, normalized)
    document.getElementById(id)?.remove()

    // Parse SVG using DOMParser to get proper dimensions from viewBox/width/height
    const parser = new DOMParser()
    const svgDoc = parser.parseFromString(svg, 'image/svg+xml')
    const svgEl = svgDoc.querySelector('svg')
    if (!svgEl) return null

    let w = parseFloat(svgEl.getAttribute('width') ?? '0')
    let h = parseFloat(svgEl.getAttribute('height') ?? '0')
    if (!w || !h) {
      const vb = svgEl.getAttribute('viewBox')?.split(/[\s,]+/)
      if (vb && vb.length >= 4) { w = parseFloat(vb[2]); h = parseFloat(vb[3]) }
    }
    if (!w) w = 500
    if (!h) h = 300

    // Scale to fit A4 content width — 280px looks good in docx with standard margins
    const MAX_W = 280
    const scale = w > MAX_W ? MAX_W / w : 1
    const finalW = Math.round(w * scale)
    const finalH = Math.round(h * scale)

    // Set explicit pixel dimensions so canvas renders at correct size
    svgEl.setAttribute('width', `${finalW}`)
    svgEl.setAttribute('height', `${finalH}`)
    const serialized = new XMLSerializer().serializeToString(svgEl)

    // Use base64 data URL (avoids blob URL security restrictions on canvas)
    const svgBase64 = btoa(unescape(encodeURIComponent(serialized)))
    const svgDataUrl = `data:image/svg+xml;base64,${svgBase64}`

    // Render SVG → canvas → PNG
    const canvas = document.createElement('canvas')
    canvas.width = finalW
    canvas.height = finalH
    const ctx = canvas.getContext('2d')!

    await new Promise<void>((resolve, reject) => {
      const img = new Image()
      img.onload = () => { ctx.drawImage(img, 0, 0, finalW, finalH); resolve() }
      img.onerror = () => reject(new Error('SVG → Image load failed'))
      img.src = svgDataUrl
    })

    const pngDataUrl = canvas.toDataURL('image/png')
    const base64 = pngDataUrl.split(',')[1]
    const bin = atob(base64)
    const bytes = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
    return { data: bytes, width: finalW, height: finalH }
  } catch {
    document.getElementById(id)?.remove()
    return null
  }
}

/** Replaces <pre><code class="language-mermaid"> blocks in-place with rendered SVG for html2canvas. */
async function renderMermaidInContainer(container: HTMLElement): Promise<void> {
  ensureMermaid()
  // PDF container width is 794px with 70px padding on each side → 654px usable
  const PDF_MAX_W = 500
  const preEls = Array.from(container.querySelectorAll('pre'))
  for (const pre of preEls) {
    const codeEl = pre.querySelector('code')
    if (!codeEl?.className?.includes('language-mermaid')) continue
    const source = normalizeMermaidSource(fixMermaidQuotedLabels((codeEl.textContent || '').trim()))
    if (!source) continue
    const id = `mmd-export-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
    try {
      const { svg } = await mermaid.render(id, source)
      document.getElementById(id)?.remove()

      const parser = new DOMParser()
      const svgDoc = parser.parseFromString(svg, 'image/svg+xml')
      const svgEl = svgDoc.querySelector('svg')
      if (!svgEl) continue

      // Constrain to PDF content width
      let w = parseFloat(svgEl.getAttribute('width') ?? '0')
      let h = parseFloat(svgEl.getAttribute('height') ?? '0')
      if (!w || !h) {
        const vb = svgEl.getAttribute('viewBox')?.split(/[\s,]+/)
        if (vb && vb.length >= 4) { w = parseFloat(vb[2]); h = parseFloat(vb[3]) }
      }
      if (w && h && w > PDF_MAX_W) {
        const s = PDF_MAX_W / w
        svgEl.setAttribute('width', `${Math.round(w * s)}`)
        svgEl.setAttribute('height', `${Math.round(h * s)}`)
      }

      const wrapper = document.createElement('div')
      wrapper.style.cssText = 'text-align:center;margin:12px 0;'
      wrapper.innerHTML = new XMLSerializer().serializeToString(svgEl)
      pre.replaceWith(wrapper)
    } catch {
      document.getElementById(id)?.remove()
    }
  }
}

// ── DOCX export ────────────────────────────────────────────────────────────

const THAI_FONT = 'Tahoma'
const MONO_FONT = 'Courier New'

function spansToRuns(spans: InlineSpan[], fontSize = 24): TextRun[] {
  if (spans.length === 0) return [new TextRun({ text: '', font: THAI_FONT, size: fontSize })]
  return spans.map(
    (s) =>
      new TextRun({
        text: s.text,
        bold: s.bold,
        italics: s.italic,
        underline: s.underline ? { type: UnderlineType.SINGLE } : undefined,
        font: THAI_FONT,
        size: fontSize,
      })
  )
}

export async function exportToDocx({ projectName, content, type }: ExportOptions) {
  const blocks = parseHtmlToBlocks(content)
  const docChildren: (Paragraph | Table)[] = []

  for (const block of blocks) {
    if (block.kind === 'heading') {
      const headingLevel =
        block.level === 1 ? HeadingLevel.HEADING_1
          : block.level === 2 ? HeadingLevel.HEADING_2
          : block.level === 3 ? HeadingLevel.HEADING_3
          : block.level === 4 ? HeadingLevel.HEADING_4
          : HeadingLevel.HEADING_5

      docChildren.push(
        new Paragraph({
          children: spansToRuns(block.spans),
          heading: headingLevel,
          spacing: { before: 240, after: 120 },
        })
      )
    } else if (block.kind === 'paragraph') {
      const align =
        block.align === 'center' ? AlignmentType.CENTER
          : block.align === 'right' ? AlignmentType.RIGHT
          : block.align === 'justify' ? AlignmentType.BOTH
          : AlignmentType.LEFT

      docChildren.push(
        new Paragraph({
          children: spansToRuns(block.spans),
          alignment: align,
          spacing: { after: 120 },
        })
      )
    } else if (block.kind === 'bullet') {
      docChildren.push(
        new Paragraph({
          children: spansToRuns(block.spans),
          bullet: { level: block.depth },
          spacing: { after: 80 },
        })
      )
    } else if (block.kind === 'ordered') {
      docChildren.push(
        new Paragraph({
          children: spansToRuns(block.spans),
          numbering: { reference: 'default-numbering', level: block.depth },
          spacing: { after: 80 },
        })
      )
    } else if (block.kind === 'table') {
      const maxCols = Math.max(...block.rows.map((r) => r.cells.length), 1)
      const colWidth = Math.floor(8640 / maxCols)

      const tableRows = block.rows.map(
        (row) =>
          new TableRow({
            children: Array.from({ length: maxCols }, (_, ci) => {
              const cellSpans = row.cells[ci] ?? []
              return new TableCell({
                children: [new Paragraph({ children: spansToRuns(cellSpans, 20), spacing: { after: 0 } })],
                shading: row.isHeader
                  ? { type: ShadingType.SOLID, color: 'E8E8E8', fill: 'E8E8E8' }
                  : undefined,
                width: { size: colWidth, type: WidthType.DXA },
              })
            }),
          })
      )

      docChildren.push(new Table({ rows: tableRows, width: { size: 8640, type: WidthType.DXA } }))
      docChildren.push(new Paragraph({ children: [], spacing: { after: 160 } }))
    } else if (block.kind === 'code') {
      for (const line of block.text.split('\n')) {
        docChildren.push(
          new Paragraph({
            children: [new TextRun({ text: line || ' ', font: MONO_FONT, size: 20 })],
            spacing: { after: 0 },
            border: {
              left: { style: BorderStyle.SINGLE, size: 12, color: 'CCCCCC', space: 8 },
            },
            indent: { left: 360 },
          })
        )
      }
      docChildren.push(new Paragraph({ children: [], spacing: { after: 120 } }))
    } else if (block.kind === 'mermaid') {
      const png = await mermaidToPngData(block.source)
      if (png) {
        docChildren.push(
          new Paragraph({
            children: [
              new ImageRun({
                data: png.data,
                transformation: { width: png.width, height: png.height },
              }),
            ],
            alignment: AlignmentType.CENTER,
            spacing: { before: 160, after: 160 },
          })
        )
      } else {
        // Fallback: show as code block if render fails
        for (const line of block.source.split('\n')) {
          docChildren.push(
            new Paragraph({
              children: [new TextRun({ text: line || ' ', font: MONO_FONT, size: 20 })],
              spacing: { after: 0 },
              indent: { left: 360 },
            })
          )
        }
        docChildren.push(new Paragraph({ children: [], spacing: { after: 120 } }))
      }
    } else if (block.kind === 'hr') {
      docChildren.push(
        new Paragraph({
          children: [],
          border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: 'CCCCCC', space: 1 } },
          spacing: { before: 120, after: 120 },
        })
      )
    }
  }

  const doc = new Document({
    numbering: {
      config: [
        {
          reference: 'default-numbering',
          levels: [
            { level: 0, format: 'decimal', text: '%1.', alignment: AlignmentType.START },
            { level: 1, format: 'decimal', text: '%1.%2.', alignment: AlignmentType.START },
            { level: 2, format: 'decimal', text: '%1.%2.%3.', alignment: AlignmentType.START },
          ],
        },
      ],
    },
    sections: [{ children: docChildren }],
  })

  const blob = await Packer.toBlob(doc)
  saveAs(blob, `${projectName.replace(/\s+/g, '_')}_${type.toUpperCase()}_${new Date().toISOString().split('T')[0]}.docx`)
}

// ── PDF export ─────────────────────────────────────────────────────────────

export async function exportToPdf({ projectName, content, type }: ExportOptions) {
  const styleEl = document.createElement('style')
  styleEl.textContent = `
    .pdf-export-container { box-sizing: border-box; }
    .pdf-export-container h1 { font-size: 20px; font-weight: bold; margin: 20px 0 10px; }
    .pdf-export-container h2 { font-size: 16px; font-weight: bold; margin: 16px 0 8px; }
    .pdf-export-container h3 { font-size: 13px; font-weight: bold; margin: 12px 0 6px; }
    .pdf-export-container h4, .pdf-export-container h5 { font-size: 12px; font-weight: bold; margin: 10px 0 4px; }
    .pdf-export-container p { margin: 0 0 8px; }
    .pdf-export-container ul { margin: 0 0 8px; padding-left: 24px; }
    .pdf-export-container ol { margin: 0 0 8px; padding-left: 24px; }
    .pdf-export-container li { margin-bottom: 4px; }
    .pdf-export-container strong { font-weight: bold; }
    .pdf-export-container em { font-style: italic; }
    .pdf-export-container table { border-collapse: collapse; width: 100%; margin: 8px 0; }
    .pdf-export-container th, .pdf-export-container td { border: 1px solid #ccc; padding: 6px 8px; font-size: 12px; }
    .pdf-export-container th { background: #f0f0f0; font-weight: bold; }
    .pdf-export-container hr { border: none; border-top: 1px solid #ccc; margin: 12px 0; }
    .pdf-export-container pre { background: #f5f5f5; padding: 10px; border-radius: 4px; font-size: 11px; margin: 8px 0; overflow: hidden; }
  `
  document.head.appendChild(styleEl)

  const container = document.createElement('div')
  container.className = 'pdf-export-container'
  container.style.cssText = [
    'position: fixed',
    'top: -99999px',
    'left: -99999px',
    'width: 794px',
    'padding: 60px 70px',
    'background: #ffffff',
    'color: #000000',
    'font-family: "Tahoma", "Arial Unicode MS", Arial, sans-serif',
    'font-size: 13px',
    'line-height: 1.7',
  ].join(';')
  // Override all CSS custom properties that use oklch() to plain hex values so
  // html2canvas (which does not support oklch) can parse styles without errors.
  const oklchOverrides: Record<string, string> = {
    '--background': '#ffffff',
    '--foreground': '#171717',
    '--card': '#ffffff',
    '--card-foreground': '#171717',
    '--popover': '#ffffff',
    '--popover-foreground': '#171717',
    '--primary': '#1a1a1a',
    '--primary-foreground': '#fafafa',
    '--secondary': '#f5f5f5',
    '--secondary-foreground': '#1a1a1a',
    '--muted': '#f5f5f5',
    '--muted-foreground': '#737373',
    '--accent': '#f5f5f5',
    '--accent-foreground': '#1a1a1a',
    '--destructive': '#ef4444',
    '--destructive-foreground': '#fafafa',
    '--border': '#e5e5e5',
    '--input': '#e5e5e5',
    '--ring': '#a3a3a3',
  }
  for (const [prop, val] of Object.entries(oklchOverrides)) {
    container.style.setProperty(prop, val)
  }
  container.innerHTML = content
  document.body.appendChild(container)

  // Pre-render Mermaid diagrams to SVG before html2canvas captures the container
  await renderMermaidInContainer(container)

  try {
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
      onclone: (clonedDoc) => {
        // Strip any stylesheets containing oklch so the cloned document
        // doesn't trigger the unsupported color function error.
        const sheets = Array.from(clonedDoc.styleSheets)
        for (const sheet of sheets) {
          try {
            const rules = Array.from(sheet.cssRules || [])
            for (const rule of rules) {
              if (rule.cssText && rule.cssText.includes('oklch')) {
                sheet.deleteRule(Array.from(sheet.cssRules).indexOf(rule))
              }
            }
          } catch {
            // Cross-origin sheets may throw; ignore safely
          }
        }
      },
    })

    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    const margin = 15
    const usableWidth = pageWidth - margin * 2
    const usableHeight = pageHeight - margin * 2

    // How many canvas pixels equal 1 mm in the PDF
    const pxPerMm = canvas.width / usableWidth
    // How many canvas pixels fit in one PDF page's usable height
    const pageHeightInPx = Math.round(usableHeight * pxPerMm)
    const totalPages = Math.ceil(canvas.height / pageHeightInPx)

    for (let i = 0; i < totalPages; i++) {
      if (i > 0) pdf.addPage()

      const srcY = i * pageHeightInPx
      const srcHeight = Math.min(pageHeightInPx, canvas.height - srcY)

      const pageCanvas = document.createElement('canvas')
      pageCanvas.width = canvas.width
      pageCanvas.height = srcHeight
      const ctx = pageCanvas.getContext('2d')!
      ctx.drawImage(canvas, 0, srcY, canvas.width, srcHeight, 0, 0, canvas.width, srcHeight)

      const pageImgData = pageCanvas.toDataURL('image/jpeg', 0.95)
      // Convert slice height back from px to mm
      const pageImgHeight = srcHeight / pxPerMm

      pdf.addImage(pageImgData, 'JPEG', margin, margin, usableWidth, pageImgHeight)
    }

    pdf.save(`${projectName.replace(/\s+/g, '_')}_${type.toUpperCase()}_${new Date().toISOString().split('T')[0]}.pdf`)
  } finally {
    document.body.removeChild(container)
    document.head.removeChild(styleEl)
  }
}
