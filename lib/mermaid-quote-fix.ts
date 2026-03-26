/**
 * Sanitizes Mermaid source code to fix common issues produced by:
 *  - Tiptap's Typography extension (converts `--` → em-dash, `->` → →, smart quotes)
 *  - AI-generated code with raw `"` inside node labels
 *
 * Idempotent: calling this function multiple times produces the same result.
 */
export function fixMermaidQuotedLabels(source: string): string {
  let s = source

  // ── 1. Reverse Tiptap Typography arrow conversions ───────────────────────
  // Typography converts `--` → `—` (U+2014 em-dash) and `->` → `→` (U+2192)
  // so `-->` can become `—→` or `—>`.
  s = s.replace(/\u2014\u2192/g, '-->') // —→ → -->
  s = s.replace(/\u2014>/g, '-->') //      —> → -->
  s = s.replace(/\u2013\u2192/g, '->') //  –→ → ->
  s = s.replace(/\u2013>/g, '->') //       –> → ->

  // ── 2. Reverse smart-quote conversions ───────────────────────────────────
  // Typography converts straight `"` → curly `"` / `"` (U+201C / U+201D)
  s = s.replace(/[\u201c\u201d]/g, '"') // " " → "
  s = s.replace(/[\u2018\u2019]/g, "'") // ' ' → '

  // ── 3. Fix raw `"` inside node / edge labels ─────────────────────────────
  // Mermaid 11 requires labels containing `"` to be wrapped in `"..."` and
  // inner quotes escaped as `#quot;` (NOT doubled `""`).
  const replacer = (full: string, id: string, content: string): string => {
    const openChar = full.charAt(id.length)
    const closeChar = openChar === '[' ? ']' : openChar === '{' ? '}' : ')'

    // No raw quote and no previously-doubled quote → nothing to do.
    if (!content.includes('"')) return full

    let inner = content.trim()

    // Unwrap labels that are already wrapped in `"..."` so we can re-normalise.
    if (inner.startsWith('"') && inner.endsWith('"') && inner.length >= 2) {
      inner = inner.slice(1, -1)
      // Undo previous `""` doubling (from the old version of this function).
      inner = inner.replace(/""/g, '"')
    }

    // If after unwrapping there are no quotes left, re-wrap cleanly.
    if (!inner.includes('"')) {
      return `${id}${openChar}"${inner}"${closeChar}`
    }

    // Escape remaining `"` with Mermaid's HTML-entity syntax.
    const escaped = inner.replace(/"/g, '#quot;')
    return `${id}${openChar}"${escaped}"${closeChar}`
  }

  s = s.replace(/\b([A-Za-z_]\w*)\[([^\]\n]+)\]/g, replacer)
  s = s.replace(/\b([A-Za-z_]\w*)\{([^}\n]+)\}/g, replacer)
  s = s.replace(/\b([A-Za-z_]\w*)\(([^)\n]+)\)/g, replacer)

  // ── 4. Fix raw `"` in edge-text labels:  A -- "text" --> B ───────────────
  // Convert to pipe syntax:  A -->|"text"| B  (Mermaid parses pipe labels as STR tokens)
  // Replace `"` in the pipe label with `#quot;` as well.
  s = s.replace(/--\s*([^|\n][^\n]*?"[^\n]*?)\s*-->/g, (_full, edgeText: string) => {
    const normalized = edgeText.trim().replace(/\s+/g, ' ').replace(/"/g, '#quot;')
    return `-->|${normalized}|`
  })

  return s
}
