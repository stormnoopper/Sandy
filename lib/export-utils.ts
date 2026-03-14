import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  UnderlineType,
} from 'docx'
import { saveAs } from 'file-saver'
import { jsPDF } from 'jspdf'

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
  | { kind: 'heading'; level: 1 | 2 | 3; spans: InlineSpan[] }
  | { kind: 'paragraph'; spans: InlineSpan[]; align?: 'left' | 'center' | 'right' | 'justify' }
  | { kind: 'bullet'; spans: InlineSpan[] }
  | { kind: 'ordered'; spans: InlineSpan[]; index: number }

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

function parseHtmlToBlocks(html: string): Block[] {
  if (typeof window === 'undefined') return []
  const tmp = document.createElement('div')
  tmp.innerHTML = html
  const blocks: Block[] = []

  function walk(node: Element) {
    const tag = node.tagName?.toLowerCase()

    if (tag === 'h1' || tag === 'h2' || tag === 'h3') {
      const level = parseInt(tag[1]) as 1 | 2 | 3
      blocks.push({ kind: 'heading', level, spans: inlineSpans(node) })
    } else if (tag === 'p') {
      const spans = inlineSpans(node)
      if (spans.length || node.innerHTML.trim()) {
        blocks.push({ kind: 'paragraph', spans, align: alignOf(node) })
      }
    } else if (tag === 'ul') {
      for (const li of Array.from(node.querySelectorAll(':scope > li'))) {
        blocks.push({ kind: 'bullet', spans: inlineSpans(li as Element) })
      }
    } else if (tag === 'ol') {
      let idx = 1
      for (const li of Array.from(node.querySelectorAll(':scope > li'))) {
        blocks.push({ kind: 'ordered', spans: inlineSpans(li as Element), index: idx++ })
      }
    } else {
      // div or other wrapper — recurse into children
      for (const child of Array.from(node.children)) walk(child)
    }
  }

  for (const child of Array.from(tmp.children)) walk(child)
  return blocks
}

// ── DOCX export ────────────────────────────────────────────────────────────

function spansToRuns(spans: InlineSpan[]): TextRun[] {
  return spans.map(
    (s) =>
      new TextRun({
        text: s.text,
        bold: s.bold,
        italics: s.italic,
        underline: s.underline ? { type: UnderlineType.SINGLE } : undefined,
        size: 24,
      })
  )
}

export async function exportToDocx({ projectName, content, type }: ExportOptions) {
  const blocks = parseHtmlToBlocks(content)
  const children: Paragraph[] = []

  for (const block of blocks) {
    if (block.kind === 'heading') {
      const headingLevel =
        block.level === 1 ? HeadingLevel.HEADING_1
          : block.level === 2 ? HeadingLevel.HEADING_2
            : HeadingLevel.HEADING_3

      children.push(
        new Paragraph({
          children: spansToRuns(block.spans),
          heading: headingLevel,
          spacing: { before: 300, after: 150 },
        })
      )
    } else if (block.kind === 'paragraph') {
      const align =
        block.align === 'center' ? AlignmentType.CENTER
          : block.align === 'right' ? AlignmentType.RIGHT
            : block.align === 'justify' ? AlignmentType.BOTH
              : AlignmentType.LEFT

      children.push(
        new Paragraph({
          children: spansToRuns(block.spans),
          alignment: align,
          spacing: { after: 150 },
        })
      )
    } else if (block.kind === 'bullet') {
      children.push(
        new Paragraph({
          children: spansToRuns(block.spans),
          bullet: { level: 0 },
          spacing: { after: 100 },
        })
      )
    } else if (block.kind === 'ordered') {
      children.push(
        new Paragraph({
          children: spansToRuns(block.spans),
          numbering: { reference: 'default-numbering', level: 0 },
          spacing: { after: 100 },
        })
      )
    }
  }

  const doc = new Document({
    numbering: {
      config: [
        {
          reference: 'default-numbering',
          levels: [{ level: 0, format: 'decimal', text: '%1.', alignment: AlignmentType.START }],
        },
      ],
    },
    sections: [{ children }],
  })

  const blob = await Packer.toBlob(doc)
  saveAs(blob, `${projectName.replace(/\s+/g, '_')}_${type.toUpperCase()}_${new Date().toISOString().split('T')[0]}.docx`)
}

// ── PDF export ─────────────────────────────────────────────────────────────

export async function exportToPdf({ projectName, content, type }: ExportOptions) {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  const pageWidth = pdf.internal.pageSize.getWidth()
  const pageHeight = pdf.internal.pageSize.getHeight()
  const margin = 20
  const contentWidth = pageWidth - margin * 2
  let y = margin

  const newPageIfNeeded = (h: number) => {
    if (y + h > pageHeight - margin) { pdf.addPage(); y = margin }
  }

  const blocks = parseHtmlToBlocks(content)

  for (const block of blocks) {
    if (block.kind === 'heading') {
      const fs = block.level === 1 ? 18 : block.level === 2 ? 14 : 12
      pdf.setFontSize(fs); pdf.setFont('helvetica', 'bold')
      const text = block.spans.map((s) => s.text).join('')
      const lines = pdf.splitTextToSize(text, contentWidth)
      newPageIfNeeded(lines.length * (fs / 2.5) + 6)
      y += 4; pdf.text(lines, margin, y); y += lines.length * (fs / 2.5) + 4
    } else if (block.kind === 'paragraph') {
      pdf.setFontSize(11)
      const text = block.spans.map((s) => s.text).join('')
      if (!text.trim()) { y += 3; continue }
      const lines = pdf.splitTextToSize(text, contentWidth)
      newPageIfNeeded(lines.length * 5.5 + 2)

      // Render each span individually to preserve bold/italic
      let xOff = margin
      for (const span of block.spans) {
        pdf.setFont('helvetica', span.bold && span.italic ? 'bolditalic' : span.bold ? 'bold' : span.italic ? 'italic' : 'normal')
        const w = pdf.getTextWidth(span.text)
        if (xOff + w > margin + contentWidth) { y += 5.5; xOff = margin }
        pdf.text(span.text, xOff, y)
        xOff += w
      }
      y += 5.5 + 2
      xOff = margin
    } else if (block.kind === 'bullet') {
      pdf.setFontSize(11); pdf.setFont('helvetica', 'normal')
      const text = '  • ' + block.spans.map((s) => s.text).join('')
      const lines = pdf.splitTextToSize(text, contentWidth)
      newPageIfNeeded(lines.length * 5.5 + 1)
      pdf.text(lines, margin, y); y += lines.length * 5.5 + 1
    } else if (block.kind === 'ordered') {
      pdf.setFontSize(11); pdf.setFont('helvetica', 'normal')
      const text = `  ${block.index}. ` + block.spans.map((s) => s.text).join('')
      const lines = pdf.splitTextToSize(text, contentWidth)
      newPageIfNeeded(lines.length * 5.5 + 1)
      pdf.text(lines, margin, y); y += lines.length * 5.5 + 1
    }
  }

  pdf.save(`${projectName.replace(/\s+/g, '_')}_${type.toUpperCase()}_${new Date().toISOString().split('T')[0]}.pdf`)
}
