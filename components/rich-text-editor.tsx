'use client'

import { useEffect } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import UnderlineExtension from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import {
  Bold, Italic, Underline, List, ListOrdered,
  Heading1, Heading2, Heading3,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Undo, Redo, Type,
} from 'lucide-react'

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  readOnly?: boolean
  className?: string
}

// A4 width at 96 dpi — content never exceeds this width
const A4_W = 794
const PAGE_PAD = 60

const proseClass = [
  '[&_.ProseMirror]:outline-none [&_.ProseMirror]:w-full [&_.ProseMirror]:min-h-[200px]',
  '[&_.ProseMirror_h1]:text-2xl [&_.ProseMirror_h1]:font-bold [&_.ProseMirror_h1]:mt-4 [&_.ProseMirror_h1]:mb-2',
  '[&_.ProseMirror_h2]:text-xl [&_.ProseMirror_h2]:font-semibold [&_.ProseMirror_h2]:mt-3 [&_.ProseMirror_h2]:mb-2',
  '[&_.ProseMirror_h3]:text-lg [&_.ProseMirror_h3]:font-semibold [&_.ProseMirror_h3]:mt-3 [&_.ProseMirror_h3]:mb-1',
  '[&_.ProseMirror_p]:my-2 [&_.ProseMirror_p]:leading-relaxed',
  '[&_.ProseMirror_ul]:list-disc [&_.ProseMirror_ul]:pl-6 [&_.ProseMirror_ul]:my-2',
  '[&_.ProseMirror_ol]:list-decimal [&_.ProseMirror_ol]:pl-6 [&_.ProseMirror_ol]:my-2',
  '[&_.ProseMirror_li]:my-0.5',
  '[&_.ProseMirror_strong]:font-bold [&_.ProseMirror_em]:italic [&_.ProseMirror_u]:underline',
].join(' ')

export function RichTextEditor({
  value,
  onChange,
  placeholder = 'Start typing...',
  disabled = false,
  readOnly = false,
  className,
}: RichTextEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      UnderlineExtension,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
    ],
    content: value || '',
    editable: !disabled && !readOnly,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class: 'outline-none w-full',
        'data-placeholder': placeholder,
      },
    },
  })

  useEffect(() => {
    if (editor && editor.getHTML() !== value)
      editor.commands.setContent(value || '', { emitUpdate: false })
  }, [value, editor])

  useEffect(() => {
    if (editor) editor.setEditable(!disabled && !readOnly)
  }, [editor, disabled, readOnly])

  // ── Read-only view ──────────────────────────────────────────────────────
  if (readOnly) {
    return (
      <div
        className={cn(
          'rounded-md border bg-background overflow-auto p-4 text-sm text-foreground',
          '[&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mt-4 [&_h1]:mb-2 [&_h1]:block',
          '[&_h2]:text-xl [&_h2]:font-semibold [&_h2]:mt-3 [&_h2]:mb-2 [&_h2]:block',
          '[&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mt-3 [&_h3]:mb-1 [&_h3]:block',
          '[&_p]:my-2 [&_p]:block [&_p]:leading-relaxed',
          '[&_ul]:list-disc [&_ul]:pl-6 [&_ul]:my-2 [&_ul]:block',
          '[&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:my-2 [&_ol]:block',
          '[&_li]:my-0.5',
          className
        )}
        dangerouslySetInnerHTML={{ __html: value || '' }}
      />
    )
  }

  if (!editor) return null

  const TB = ({
    icon: Icon, title, onClick, isActive,
  }: { icon: React.ElementType; title: string; onClick: () => void; isActive?: boolean }) => (
    <Button type="button" variant={isActive ? 'secondary' : 'ghost'} size="sm"
      className="h-8 w-8 p-0" title={title} disabled={disabled}
      onMouseDown={(e) => { e.preventDefault(); onClick() }}>
      <Icon className="h-4 w-4" />
      <span className="sr-only">{title}</span>
    </Button>
  )

  return (
    <div className={cn('flex flex-col overflow-hidden', disabled && 'opacity-50 pointer-events-none', className)}>

      {/* ── Toolbar ──────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-0.5 rounded-t-md border border-b-0 bg-muted/30 p-1 sticky top-0 z-10">
        <TB icon={Bold} title="Bold (Ctrl+B)" onClick={() => editor.chain().focus().toggleBold().run()} isActive={editor.isActive('bold')} />
        <TB icon={Italic} title="Italic (Ctrl+I)" onClick={() => editor.chain().focus().toggleItalic().run()} isActive={editor.isActive('italic')} />
        <TB icon={Underline} title="Underline (Ctrl+U)" onClick={() => editor.chain().focus().toggleUnderline().run()} isActive={editor.isActive('underline')} />
        <Separator orientation="vertical" className="mx-1 h-6" />
        <TB icon={Type} title="Normal text" onClick={() => editor.chain().focus().setParagraph().run()} isActive={editor.isActive('paragraph')} />
        <TB icon={Heading1} title="Heading 1" onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} isActive={editor.isActive('heading', { level: 1 })} />
        <TB icon={Heading2} title="Heading 2" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} isActive={editor.isActive('heading', { level: 2 })} />
        <TB icon={Heading3} title="Heading 3" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} isActive={editor.isActive('heading', { level: 3 })} />
        <Separator orientation="vertical" className="mx-1 h-6" />
        <TB icon={List} title="Bullet list" onClick={() => editor.chain().focus().toggleBulletList().run()} isActive={editor.isActive('bulletList')} />
        <TB icon={ListOrdered} title="Numbered list" onClick={() => editor.chain().focus().toggleOrderedList().run()} isActive={editor.isActive('orderedList')} />
        <Separator orientation="vertical" className="mx-1 h-6" />
        <TB icon={AlignLeft} title="Align left" onClick={() => editor.chain().focus().setTextAlign('left').run()} isActive={editor.isActive({ textAlign: 'left' })} />
        <TB icon={AlignCenter} title="Align center" onClick={() => editor.chain().focus().setTextAlign('center').run()} isActive={editor.isActive({ textAlign: 'center' })} />
        <TB icon={AlignRight} title="Align right" onClick={() => editor.chain().focus().setTextAlign('right').run()} isActive={editor.isActive({ textAlign: 'right' })} />
        <TB icon={AlignJustify} title="Justify" onClick={() => editor.chain().focus().setTextAlign('justify').run()} isActive={editor.isActive({ textAlign: 'justify' })} />
        <Separator orientation="vertical" className="mx-1 h-6" />
        <TB icon={Undo} title="Undo (Ctrl+Z)" onClick={() => editor.chain().focus().undo().run()} />
        <TB icon={Redo} title="Redo (Ctrl+Y)" onClick={() => editor.chain().focus().redo().run()} />
      </div>

      {/* ── Gray workspace with unlimited growing white A4-width page ──── */}
      <div className="flex-1 overflow-auto rounded-b-md border bg-[#c0c0c0] dark:bg-[#2c2c2c] py-8">
        {/* Single white card — A4 width, grows freely with content */}
        <div
          className={cn('mx-auto bg-white shadow-md text-sm text-foreground', proseClass)}
          style={{ width: A4_W, padding: PAGE_PAD, boxSizing: 'border-box' }}
        >
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  )
}
