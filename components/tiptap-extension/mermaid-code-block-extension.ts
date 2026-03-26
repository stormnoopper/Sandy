import { CodeBlock } from '@tiptap/extension-code-block'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { MermaidCodeBlockView } from '@/components/tiptap-extension/mermaid-code-block-view'

export const CodeBlockWithMermaid = CodeBlock.extend({
  addNodeView() {
    return ReactNodeViewRenderer(MermaidCodeBlockView, {
      contentDOMElementTag: 'code',
    })
  },
})
