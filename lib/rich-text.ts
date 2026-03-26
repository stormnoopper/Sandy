'use client'

// Must match INDENT_REM in lib/tiptap-indent.ts
const INDENT_REM = 1.5

function getIndentTabs(el: Element): string {
  const style = el.getAttribute('style') ?? ''
  const match = style.match(/margin-left:\s*([\d.]+)rem/)
  if (!match) return ''
  const level = Math.round(parseFloat(match[1]) / INDENT_REM)
  return '\t'.repeat(Math.max(0, level))
}

export function htmlToText(html: string): string {
  if (typeof window === 'undefined') return html
  const temp = document.createElement('div')
  temp.innerHTML = html

  function walk(node: Node): string {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent || ''
    if (node.nodeType !== Node.ELEMENT_NODE) return ''
    const el = node as Element
    const tag = el.tagName.toLowerCase()
    const children = Array.from(el.childNodes).map(walk).join('')
    const tabs = getIndentTabs(el)

    switch (tag) {
      case 'h1': return `${tabs}# ${children}\n\n`
      case 'h2': return `${tabs}### ${children}\n\n`
      case 'h3': return `${tabs}${children}\n\n`
      case 'h4': return `${tabs}#### ${children}\n\n`
      case 'h5': return `${tabs}##### ${children}\n\n`
      case 'hr': return `---\n\n`
      case 'p': return `${tabs}${children}\n\n`
      case 'br': return '\n'
      case 'b':
      case 'strong': return `**${children}**`
      case 'i':
      case 'em': return `*${children}*`
      case 'u': return children
      case 'blockquote': return children
      case 'ul':
      case 'ol': return children
      case 'li': {
        const parent = el.parentElement
        if (parent?.tagName.toLowerCase() === 'ol') {
          return `${Array.from(parent.children).indexOf(el) + 1}. ${children}\n`
        }
        return `- ${children}\n`
      }
      case 'th': return ` ${children} |`
      case 'td': return ` ${children} |`
      case 'tr': {
        const inThead = el.parentElement?.tagName.toLowerCase() === 'thead'
        const row = `|${children}\n`
        if (inThead) {
          const colCount = el.querySelectorAll('th').length
          const sep = '|' + ' --- |'.repeat(colCount)
          return row + sep + '\n'
        }
        return row
      }
      case 'thead':
      case 'tbody': return children
      case 'table': return `\n${children}\n`
      case 'pre': {
        const codeEl = el.querySelector(':scope > code')
        if (codeEl) {
          const cls = codeEl.className || ''
          const m = cls.match(/language-([\w-]+)/)
          const lang = m ? m[1] : ''
          const inner = codeEl.textContent ?? ''
          return `\n\`\`\`${lang}\n${inner}\n\`\`\`\n\n`
        }
        return `${tabs}${children}\n\n`
      }
      case 'div': return `${children}\n`
      default: return children
    }
  }

  return walk(temp).trim()
}

export type TextToHtmlMode = 'default' | 'srs'

function escapeHtmlRaw(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function textToHtml(text: string, options?: { mode?: TextToHtmlMode }): string {
  const mode = options?.mode ?? 'default'
  const lines = text.split('\n')
  const output: string[] = []
  let inList = false
  let listType = ''
  let tableRows: string[] = []
  let inTableOfContents = false
  let codeFenceOpen = false
  let codeFenceLang = ''
  const codeFenceLines: string[] = []

  const closeList = () => {
    if (inList) {
      output.push(`</${listType}>`)
      inList = false
      listType = ''
    }
  }

  const flushCodeFence = () => {
    if (!codeFenceOpen) return
    const body = codeFenceLines.join('\n')
    const lang = (codeFenceLang || 'text').trim().toLowerCase()
    const safe = escapeHtmlRaw(body)
    const cls = lang && lang !== 'text' ? `language-${lang}` : 'language-text'
    closeList()
    flushTable()
    output.push(`<pre><code class="${cls}">${safe}</code></pre>`)
    codeFenceLines.length = 0
    codeFenceLang = ''
    codeFenceOpen = false
  }

  const flushTable = () => {
    if (tableRows.length === 0) return
    const [headerRow, ...dataRows] = tableRows
    const headerCells = headerRow.split('|').slice(1, -1).map((c) => c.trim())
    // TipTap table cells require block content (e.g. <p>); bare text would not parse as a table.
    const headerHtml = headerCells.map((c) => `<th><p>${inline(c)}</p></th>`).join('')
    const dataHtml = dataRows
      .map((row) => {
        const cells = row.split('|').slice(1, -1).map((c) => c.trim())
        return (
          '<tr>' +
          cells.map((c) => `<td><p>${inline(c) || '—'}</p></td>`).join('') +
          '</tr>'
        )
      })
      .join('')
    output.push(
      `<table><thead><tr>${headerHtml}</tr></thead><tbody>${dataHtml}</tbody></table>`
    )
    tableRows = []
  }

  const splitByColon = (input: string): { before: string; after: string } | null => {
    // Require at least one whitespace after colon to avoid splitting cases like URLs.
    const colonIndex = input.search(/[:：]\s+/)
    if (colonIndex === -1) return null
    const before = input.slice(0, colonIndex).trim()
    const after = input.slice(colonIndex).replace(/^[:：]\s+/, '').trim()
    return { before, after }
  }

  for (const rawLine of lines) {
    // Strip leading tabs and spaces, calculate indent level from tabs only
    const tabMatch = rawLine.match(/^(\t*)/)
    const indentLevel = tabMatch ? tabMatch[1].length : 0
    const line = rawLine.slice(indentLevel).replace(/^ +/, '') // also strip leading spaces
    const iStyle = indentLevel > 0
      ? ` style="margin-left: ${(indentLevel * INDENT_REM).toFixed(2)}rem"`
      : ''

    // Strip markdown code fences coming from LLM (e.g. ```markdown ... ```).
    // This prevents the literal "markdown" label from appearing in the editor.
    const trimmed = line.trim()
    const fenceMatch = trimmed.match(/^(`{3,}|~{3,})\s*([\w-]*)\s*$/)
    if (fenceMatch) {
      if (codeFenceOpen) {
        flushCodeFence()
      } else {
        closeList()
        flushTable()
        codeFenceOpen = true
        codeFenceLang = fenceMatch[2] || ''
        codeFenceLines.length = 0
      }
      continue
    }
    if (codeFenceOpen) {
      codeFenceLines.push(rawLine)
      continue
    }
    if (/^<!--/.test(trimmed)) {
      continue
    }

    // Markdown table separator row (| :--- | --- |) — skip, signals end of header
    if (/^\|[\s|:*-]+\|/.test(line.trim()) && !/[a-zA-Zก-๙]/.test(line)) {
      continue
    }

    // Markdown table data row (| cell | cell |)
    if (/^\|.+\|/.test(line.trim())) {
      closeList()
      tableRows.push(line.trim())
      continue
    }

    // Non-table line — flush any buffered table first
    flushTable()

    // Table of Contents header (make it bold)
    if (/^#{1,2}\s*(table of contents|toc|สารบัญ)\s*:?$/i.test(line.trim())) {
      closeList()
      inTableOfContents = true
      const tocTitle = line.trim().replace(/^#{1,2}\s*/i, '').replace(/:$/,'')
      output.push(`<h2${iStyle}>${inline(tocTitle)}</h2>`)
      continue
    }

    // Headings — check deepest first to avoid prefix collision
    if (line.startsWith('##### ')) {
      closeList()
      const content = line.slice(6)
      if (mode === 'srs') {
        output.push(`<h5${iStyle}>${inline(content)}</h5>`)
      } else if (/^\d+\.\d+(?:\.\d+)/.test(content)) {
        // ##### x.y.z. text → p, indent level 2
        output.push(`<p${iStyle || ` style="margin-left: ${(4 * INDENT_REM).toFixed(2)}rem"`}>${inline(content)}</p>`)
      } else {
        output.push(`<p${iStyle}>${inline(content)}</p>`)
      }
    } else if (line.startsWith('#### ')) {
      closeList()
      const content = line.slice(5)
      if (mode === 'srs') {
        output.push(`<h4${iStyle}>${inline(content)}</h4>`)
      } else if (/^\d+\.\d+(?:\.\d+)/.test(content)) {
        // #### x.y.z. text → p, indent level 2
        output.push(`<p${iStyle || ` style="margin-left: ${(4 * INDENT_REM).toFixed(2)}rem"`}>${inline(content)}</p>`)
      } else if (/^\d+\.\d+/.test(content)) {
        // #### x.y. text → h3, indent level 1
        const styleAttr = iStyle || ` style="margin-left: ${(2 * INDENT_REM).toFixed(2)}rem"`
        output.push(`<h3${styleAttr}>${inline(content)}</h3>`)
      } else {
        const styleAttr = iStyle || ` style="margin-left: ${(2 * INDENT_REM).toFixed(2)}rem"`
        output.push(`<h3${styleAttr}>${inline(content)}</h3>`)
      }
    } else if (line.startsWith('### ')) {
      closeList()
      const content = line.slice(4)
      if (/^\d+\.\d+(?:\.\d+)/.test(content)) {
        // ### x.y.z. text → p, indent level 2
        output.push(`<p${iStyle || ` style="margin-left: ${(4 * INDENT_REM).toFixed(2)}rem"`}>${inline(content)}</p>`)
      } else if (/^\d+\.\d+/.test(content)) {
        // ### x.y. text → h3 sub-section (AI wrapped sub-section in ###)
        const styleAttr = iStyle || ` style="margin-left: ${(2 * INDENT_REM).toFixed(2)}rem"`
        output.push(`<h3${styleAttr}>${inline(content)}</h3>`)
      } else if (mode === 'srs') {
        // SRS: ### Prerequisite / ### Business Logic / etc.
        output.push(`<h3${iStyle}>${inline(content)}</h3>`)
      } else {
        // ### 1. text → h2 main section heading
        output.push(`<h2${iStyle}>${inline(content)}</h2>`)
      }
    } else if (line.startsWith('## ')) {
      closeList()
      if (mode === 'srs') {
        output.push(`<h2${iStyle}>${inline(line.slice(3))}</h2>`)
      } else {
        // SOW: ## ใช้เป็นย่อหน้า (ไม่ใช่หัวข้อระดับ h2)
        output.push(`<p${iStyle}>${inline(line.slice(3))}</p>`)
      }
    } else if (line.startsWith('# ')) {
      closeList()
      if (mode === 'srs') {
        output.push(`<h1${iStyle}>${inline(line.slice(2))}</h1>`)
      } else {
        // SOW: # ใช้เป็นย่อหน้า
        output.push(`<p${iStyle}>${inline(line.slice(2))}</p>`)
      }
    } else if (/^-{3,}$/.test(line.trim())) {
      if (inTableOfContents) inTableOfContents = false
      closeList()
      output.push('<hr/>')
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      const content = line.slice(2)
      // Numbered sub-items (e.g. "2.1 text", "2.1.1 text", "6.1 text") → no bullet, auto-indented
      const numMatch = content.match(/^(\d+\.\d+(?:\.\d+)*) /)
      if (numMatch) {
        closeList()
        const dots = (numMatch[1].match(/\./g) || []).length
        const styleAttr = iStyle || ` style="margin-left: ${(dots * INDENT_REM).toFixed(2)}rem"`
        output.push(`<p${styleAttr}>${inline(content)}</p>`)
      } else {
        if (!inList || listType !== 'ul') {
          closeList()
          output.push('<ul>')
          inList = true
          listType = 'ul'
        }
        output.push(`<li>${inline(content)}</li>`)
      }
    } else if (/^(\d+\.){3,} /.test(line)) {
      // x.y.z. or deeper (trailing dot) → p, indent level 2 (6rem)
      closeList()
      output.push(`<p${iStyle || ` style="margin-left: ${(4 * INDENT_REM).toFixed(2)}rem"`}>${inline(line)}</p>`)
    } else if (/^(\d+\.){2} /.test(line)) {
      // x.y. (trailing dot) → h3 sub-section, indent level 1 (3rem)
      closeList()
      const styleAttr = iStyle || ` style="margin-left: ${(2 * INDENT_REM).toFixed(2)}rem"`
      if (inTableOfContents) {
        output.push(`<p class="tocItem"${styleAttr}>${inline(line)}</p>`)
      } else {
        const split = splitByColon(line)
        if (split) {
          output.push(`<h3${styleAttr}>${inline(split.before)}</h3>`)
          if (split.after) output.push(`<p class="subItemContent"${styleAttr}>${inline(split.after)}</p>`)
        } else {
          output.push(`<h3${styleAttr}>${inline(line)}</h3>`)
        }
      }
    } else if (/^\d+\.\d+(?:\.\d+)+ /.test(line)) {
      // x.y.z or deeper (no trailing dot) → p, indent level 2 (6rem)
      closeList()
      const numPart = line.match(/^(\d+\.\d+(?:\.\d+)+) /)?.[1] ?? ''
      const dots = (numPart.match(/\./g) || []).length
      const styleAttr = iStyle || ` style="margin-left: ${((dots + 2) * INDENT_REM).toFixed(2)}rem"`
      output.push(`<p${styleAttr}>${inline(line)}</p>`)
    } else if (/^\d+\.\d+ /.test(line)) {
      // x.y (no trailing dot) → h3 sub-section, indent level 1 (3rem)
      closeList()
      const styleAttr = iStyle || ` style="margin-left: ${(2 * INDENT_REM).toFixed(2)}rem"`
      if (inTableOfContents) {
        output.push(`<p class="tocItem"${styleAttr}>${inline(line)}</p>`)
      } else {
        const split = splitByColon(line)
        if (split) {
          output.push(`<h3${styleAttr}>${inline(split.before)}</h3>`)
          if (split.after) output.push(`<p class="subItemContent"${styleAttr}>${inline(split.after)}</p>`)
        } else {
          output.push(`<h3${styleAttr}>${inline(line)}</h3>`)
        }
      }
    } else if (/^\d+\. /.test(line)) {
      if (inTableOfContents) {
        closeList()
        output.push(`<p class="tocItem"${iStyle}>${inline(line)}</p>`)
      } else {
        if (!inList || listType !== 'ol') {
          closeList()
          output.push('<ol>')
          inList = true
          listType = 'ol'
        }
        output.push(`<li>${inline(line.replace(/^\d+\. /, ''))}</li>`)
      }
    } else if (line.trim()) {
      closeList()
      output.push(`<p${iStyle}>${inline(line)}</p>`)
    }
  }

  flushTable()
  flushCodeFence()
  closeList()
  return output.join('')
}

export function hasRichTextContent(html: string | null | undefined): boolean {
  if (!html) return false
  return htmlToText(html).trim().length > 0
}

export function getRichTextPreview(html: string | null | undefined, maxLength = 150): string {
  const plainText = htmlToText(html || '').trim()
  if (!plainText) return ''
  return plainText.length > maxLength ? `${plainText.slice(0, maxLength)}...` : plainText
}

function inline(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
}
