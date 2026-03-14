'use client'

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

    switch (tag) {
      case 'h1':
        return `# ${children}\n\n`
      case 'h2':
        return `## ${children}\n\n`
      case 'h3':
        return `### ${children}\n\n`
      case 'p':
        return `${children}\n\n`
      case 'br':
        return '\n'
      case 'b':
      case 'strong':
        return `**${children}**`
      case 'i':
      case 'em':
        return `*${children}*`
      case 'u':
        return children
      case 'ul':
      case 'ol':
        return children
      case 'li': {
        const parent = el.parentElement
        if (parent?.tagName.toLowerCase() === 'ol') {
          return `${Array.from(parent.children).indexOf(el) + 1}. ${children}\n`
        }
        return `- ${children}\n`
      }
      case 'div':
        return `${children}\n`
      default:
        return children
    }
  }

  return walk(temp).trim()
}

export function textToHtml(text: string): string {
  const lines = text.split('\n')
  const output: string[] = []
  let inList = false
  let listType = ''

  for (const line of lines) {
    if (line.startsWith('# ')) {
      if (inList) {
        output.push(`</${listType}>`)
        inList = false
      }
      output.push(`<h1>${line.slice(2)}</h1>`)
    } else if (line.startsWith('## ')) {
      if (inList) {
        output.push(`</${listType}>`)
        inList = false
      }
      output.push(`<h2>${line.slice(3)}</h2>`)
    } else if (line.startsWith('### ')) {
      if (inList) {
        output.push(`</${listType}>`)
        inList = false
      }
      output.push(`<h3>${line.slice(4)}</h3>`)
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      if (!inList || listType !== 'ul') {
        if (inList) output.push(`</${listType}>`)
        output.push('<ul>')
        inList = true
        listType = 'ul'
      }
      output.push(`<li>${inline(line.slice(2))}</li>`)
    } else if (line.match(/^\d+\. /)) {
      if (!inList || listType !== 'ol') {
        if (inList) output.push(`</${listType}>`)
        output.push('<ol>')
        inList = true
        listType = 'ol'
      }
      output.push(`<li>${inline(line.replace(/^\d+\. /, ''))}</li>`)
    } else if (line.trim()) {
      if (inList) {
        output.push(`</${listType}>`)
        inList = false
      }
      output.push(`<p>${inline(line)}</p>`)
    }
  }

  if (inList) output.push(`</${listType}>`)
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
