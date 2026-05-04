"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { Wand2Icon, Loader2Icon } from "lucide-react"
import { DOMSerializer } from "@tiptap/pm/model"

// --- Editor & Hooks ---
import { useTiptapEditor } from "@/hooks/use-tiptap-editor"
import { useProjects } from "@/lib/project-context"

// --- UI Primitives ---
import { Button } from "@/components/tiptap-ui-primitive/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"

// --- Utils ---
import { htmlToText, textToHtml } from "@/lib/rich-text"

export function RegenerateButton({ editor: providedEditor }: { editor?: any }) {
  const { editor } = useTiptapEditor(providedEditor)

  let currentProject = null
  try {
    const context = useProjects()
    currentProject = context.currentProject
  } catch (e) {
    // Ignore error if not in a ProjectProvider
  }

  const [isOpen, setIsOpen] = useState(false)
  const [customInstruction, setCustomInstruction] = useState("")
  const [selectedHtml, setSelectedHtml] = useState("")
  const [hasSelection, setHasSelection] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [streamingText, setStreamingText] = useState("")
  const selectionRangeRef = useRef<{ from: number; to: number } | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Track selection state to enable/disable the button
  useEffect(() => {
    if (!editor) return

    const updateSelection = () => {
      const { empty } = editor.state.selection
      setHasSelection(!empty)
    }

    editor.on("selectionUpdate", updateSelection)
    updateSelection()

    return () => {
      editor.off("selectionUpdate", updateSelection)
    }
  }, [editor])

  const handleOpen = useCallback(() => {
    if (!editor || editor.state.selection.empty) return

    // Save the selection coordinates before opening the dialog
    selectionRangeRef.current = {
      from: editor.state.selection.from,
      to: editor.state.selection.to,
    }

    // Properly serialize the selected Tiptap fragment to HTML
    const slice = editor.state.selection.content()
    const dom = DOMSerializer.fromSchema(editor.schema).serializeFragment(slice.content)
    const tempDiv = document.createElement("div")
    tempDiv.appendChild(dom)

    // Convert the HTML to Markdown so the AI can understand the formatting
    const markdownText = htmlToText(tempDiv.innerHTML)

    setSelectedHtml(markdownText)
    setStreamingText("")
    setIsOpen(true)
  }, [editor])

  const handleClose = () => {
    if (isLoading) {
      abortControllerRef.current?.abort()
    }
    setIsOpen(false)
    setCustomInstruction("")
    setStreamingText("")
    selectionRangeRef.current = null
  }

  const handleSubmit = async () => {
    if (!customInstruction.trim() || !selectedHtml) return
    if (!editor || !selectionRangeRef.current) return

    setIsLoading(true)
    setStreamingText("")

    const controller = new AbortController()
    abortControllerRef.current = controller

    try {
      const response = await fetch("/api/regenerate-section", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          existingContent: selectedHtml,
          prompt: customInstruction,
          projectName: currentProject?.name,
          projectDescription: currentProject?.description,
          dataEntries: currentProject?.dataEntries,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`API Error ${response.status}: ${errorText}`)
      }

      if (!response.body) {
        throw new Error("No response body from server")
      }

      // Read the stream
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let fullText = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        fullText += chunk
        setStreamingText(fullText)
      }

      // Strip the [DOCUMENT_COMPLETE] token if present
      let finalMarkdown = fullText
      if (finalMarkdown.includes("[DOCUMENT_COMPLETE]")) {
        finalMarkdown = finalMarkdown.replace("[DOCUMENT_COMPLETE]", "").trim()
      }

      // Convert markdown back to HTML and insert into editor at the saved selection range
      const newHtml = textToHtml(finalMarkdown, { mode: "srs" })

      if (selectionRangeRef.current) {
        editor
          .chain()
          .focus()
          .setTextSelection(selectionRangeRef.current)
          .insertContent(newHtml)
          .run()
      }

      // Close dialog and reset
      setIsOpen(false)
      setCustomInstruction("")
      setStreamingText("")
      selectionRangeRef.current = null
    } catch (err: any) {
      if (err?.name === "AbortError") {
        console.log("Regeneration aborted by user")
      } else {
        console.error("Regeneration failed:", err)
        // Optionally show an error message to the user
        setStreamingText(`Error: ${err.message}`)
      }
    } finally {
      setIsLoading(false)
    }
  }

  if (!editor) return null

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        disabled={!hasSelection}
        onClick={handleOpen}
        tooltip="Regenerate Selected Section"
      >
        <Wand2Icon className="tiptap-button-icon" />
      </Button>

      <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleClose() }}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>แก้ไขส่วนที่เลือกด้วย AI</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="text-sm text-muted-foreground">
              ระบุคำสั่งที่ต้องการให้ AI ปรับแก้ข้อความที่เลือกไว้
            </div>

            {/* Preview of selected text */}
            {selectedHtml && (
              <div className="bg-muted/50 border rounded-md p-3 text-xs text-muted-foreground max-h-[120px] overflow-y-auto whitespace-pre-wrap font-mono">
                <span className="text-xs font-semibold text-foreground/60 block mb-1">ข้อความที่เลือก:</span>
                {selectedHtml.slice(0, 400)}{selectedHtml.length > 400 ? "..." : ""}
              </div>
            )}

            <Textarea
              placeholder="เช่น แปลเป็นภาษาอังกฤษ, ทำให้เป็นทางการมากขึ้น, เพิ่ม Mermaid diagram..."
              value={customInstruction}
              onChange={(e) => setCustomInstruction(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && !isLoading) {
                  e.preventDefault()
                  handleSubmit()
                }
              }}
              disabled={isLoading}
              rows={3}
            />

            {isLoading && (
              <div className="bg-muted p-3 rounded-md text-sm whitespace-pre-wrap max-h-[200px] overflow-y-auto">
                <div className="flex items-center gap-2 mb-2 text-muted-foreground">
                  <Loader2Icon className="h-3 w-3 animate-spin" />
                  <span className="text-xs animate-pulse">กำลังสร้างเนื้อหา...</span>
                </div>
                {streamingText && (
                  <span className="font-mono text-xs">{streamingText.slice(-500)}</span>
                )}
              </div>
            )}

            {!isLoading && streamingText && streamingText.startsWith("Error:") && (
              <div className="bg-destructive/10 border border-destructive/30 text-destructive p-3 rounded-md text-sm">
                {streamingText}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={handleClose} disabled={false}>
              {isLoading ? "ยกเลิก" : "ปิด"}
            </Button>
            <Button onClick={handleSubmit} disabled={isLoading || !customInstruction.trim()}>
              {isLoading ? (
                <>
                  <Loader2Icon className="h-4 w-4 animate-spin mr-2" />
                  กำลังสร้าง...
                </>
              ) : (
                <>
                  <Wand2Icon className="h-4 w-4 mr-2" />
                  แก้ไข
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
