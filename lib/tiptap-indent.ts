import { Extension } from '@tiptap/core'

const MAX_INDENT = 8
export const INDENT_REM = 1.5

function selectionInTable(state: { selection: { $from: { depth: number; node: (d: number) => { type: { name: string } } } } }): boolean {
  const { $from } = state.selection
  for (let d = $from.depth; d > 0; d--) {
    const name = $from.node(d).type.name
    if (name === 'table' || name === 'tableCell' || name === 'tableHeader') return true
  }
  return false
}

export const IndentExtension = Extension.create({
  name: 'indent',

  addGlobalAttributes() {
    return [
      {
        types: ['paragraph', 'heading'],
        attributes: {
          indent: {
            default: 0,
            parseHTML: (el: Element) => {
              const style = el.getAttribute('style') ?? ''
              const match = style.match(/margin-left:\s*([\d.]+)rem/)
              if (!match) return 0
              return Math.round(parseFloat(match[1]) / INDENT_REM)
            },
            renderHTML: (attrs: Record<string, unknown>) => {
              const level = typeof attrs.indent === 'number' ? attrs.indent : 0
              if (level <= 0) return {}
              return { style: `margin-left: ${(level * INDENT_REM).toFixed(2)}rem` }
            },
          },
        },
      },
    ]
  },

  addKeyboardShortcuts() {
    return {
      Tab: () => {
        const { state } = this.editor.view
        if (selectionInTable(state)) return false

        const { $from } = state.selection
        const node = $from.node()

        if (!node) return false

        // Let list items handle their own nesting
        if (node.type.name === 'listItem') {
          return this.editor.commands.sinkListItem('listItem')
        }

        if (!['paragraph', 'heading'].includes(node.type.name)) return false

        const current = (node.attrs.indent as number) || 0
        if (current >= MAX_INDENT) return true

        return this.editor.commands.updateAttributes(node.type.name, {
          indent: current + 1,
        })
      },

      'Shift-Tab': () => {
        const { state } = this.editor.view
        if (selectionInTable(state)) return false

        const { $from } = state.selection
        const node = $from.node()

        if (!node) return false

        if (node.type.name === 'listItem') {
          return this.editor.commands.liftListItem('listItem')
        }

        if (!['paragraph', 'heading'].includes(node.type.name)) return false

        const current = (node.attrs.indent as number) || 0
        if (current <= 0) return false

        return this.editor.commands.updateAttributes(node.type.name, {
          indent: current - 1,
        })
      },
    }
  },
})
