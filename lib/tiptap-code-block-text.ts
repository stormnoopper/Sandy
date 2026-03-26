import type { Editor } from '@tiptap/core'

/** Replace the inner text of a `codeBlock` at `pos` (node start position). */
export function setCodeBlockInnerText(editor: Editor, pos: number, newText: string): boolean {
  const node = editor.state.doc.nodeAt(pos)
  if (!node || node.type.name !== 'codeBlock') return false
  const from = pos + 1
  const to = from + node.content.size
  return editor
    .chain()
    .focus()
    .command(({ tr, state }) => {
      tr.replaceWith(from, to, state.schema.text(newText))
      return true
    })
    .run()
}
