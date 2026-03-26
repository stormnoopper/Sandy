'use client'

import { cn } from '@/lib/utils'
import { SimpleEditor } from '@/components/tiptap-templates/simple/simple-editor'

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  readOnly?: boolean
  className?: string
  /** Stronger heading hierarchy + spacing for SRS markdown (`#` / `##` / `###` / `####`). */
  proseVariant?: 'default' | 'srs'
}

// A4 width at 96 dpi — content never exceeds this width
const A4_W = 794
const PAGE_PAD = 60
const TOOLBAR_H = 44

const proseClassDefault = [
  '[&_.ProseMirror]:outline-none [&_.ProseMirror]:w-full [&_.ProseMirror]:min-h-[200px]',
  // h2 = main section heading (### 1. บทนำ)
  '[&_.ProseMirror_h2]:text-xl [&_.ProseMirror_h2]:font-bold [&_.ProseMirror_h2]:mt-10 [&_.ProseMirror_h2]:mb-2',
  // h3 = sub-section heading (1.1. หัวข้อย่อย) — indent comes from inline style
  '[&_.ProseMirror_h3]:text-base [&_.ProseMirror_h3]:font-semibold [&_.ProseMirror_h3]:mt-4 [&_.ProseMirror_h3]:mb-1',
  // h1, h4, h5 kept for manual editor use
  '[&_.ProseMirror_h1]:text-2xl [&_.ProseMirror_h1]:font-bold [&_.ProseMirror_h1]:mt-8 [&_.ProseMirror_h1]:mb-3',
  '[&_.ProseMirror_h4]:text-base [&_.ProseMirror_h4]:font-semibold [&_.ProseMirror_h4]:mt-4 [&_.ProseMirror_h4]:mb-1',
  '[&_.ProseMirror_h5]:text-sm [&_.ProseMirror_h5]:font-semibold [&_.ProseMirror_h5]:mt-3 [&_.ProseMirror_h5]:mb-0.5 [&_.ProseMirror_h5]:text-foreground/70',
  // Paragraph & inline
  '[&_.ProseMirror_p]:my-1.5 [&_.ProseMirror_p]:leading-relaxed',
  '[&_.tocItem]:font-normal',
  '[&_.subItemContent]:font-normal',
  '[&_.ProseMirror_strong]:font-bold [&_.ProseMirror_em]:italic [&_.ProseMirror_u]:underline',
  // Lists
  '[&_.ProseMirror_ul]:list-disc [&_.ProseMirror_ul]:pl-6 [&_.ProseMirror_ul]:my-2',
  '[&_.ProseMirror_ol]:list-decimal [&_.ProseMirror_ol]:pl-6 [&_.ProseMirror_ol]:my-2',
  '[&_.ProseMirror_li]:my-1 [&_.ProseMirror_li]:leading-relaxed',
  // Blockquote — used for indented sub-items (x.y.z.)
  '[&_.ProseMirror_blockquote]:pl-4 [&_.ProseMirror_blockquote]:ml-4 [&_.ProseMirror_blockquote]:border-l-2 [&_.ProseMirror_blockquote]:border-muted-foreground/20 [&_.ProseMirror_blockquote]:text-foreground/80',
  '[&_.ProseMirror_blockquote_p]:my-0.5',
  // HR
  '[&_.ProseMirror_hr]:border-t [&_.ProseMirror_hr]:border-muted-foreground/20 [&_.ProseMirror_hr]:my-6',
  // Tables
  '[&_.ProseMirror_table]:w-full [&_.ProseMirror_table]:border-collapse [&_.ProseMirror_table]:my-4 [&_.ProseMirror_table]:text-sm',
  '[&_.ProseMirror_th]:border [&_.ProseMirror_th]:border-muted-foreground/30 [&_.ProseMirror_th]:bg-muted/40 [&_.ProseMirror_th]:px-3 [&_.ProseMirror_th]:py-2 [&_.ProseMirror_th]:font-semibold [&_.ProseMirror_th]:text-left',
  '[&_.ProseMirror_td]:border [&_.ProseMirror_td]:border-muted-foreground/30 [&_.ProseMirror_td]:px-3 [&_.ProseMirror_td]:py-2',
].join(' ')

const proseClassSrs = [
  '[&_.ProseMirror]:outline-none [&_.ProseMirror]:w-full [&_.ProseMirror]:min-h-[200px] [&_.ProseMirror]:overflow-x-auto',
  // Cover + module titles
  '[&_.ProseMirror_h1]:text-2xl [&_.ProseMirror_h1]:font-bold [&_.ProseMirror_h1]:tracking-tight [&_.ProseMirror_h1]:mt-8 [&_.ProseMirror_h1]:mb-2 [&_.ProseMirror_h1]:pb-2 [&_.ProseMirror_h1]:first:mt-0 [&_.ProseMirror_h1]:border-b [&_.ProseMirror_h1]:border-border/70',
  // Section: Revision History, Overview, etc.
  '[&_.ProseMirror_h2]:text-lg [&_.ProseMirror_h2]:font-bold [&_.ProseMirror_h2]:mt-10 [&_.ProseMirror_h2]:mb-3 [&_.ProseMirror_h2]:text-foreground',
  // Feature blocks: Prerequisite, Roles, …
  '[&_.ProseMirror_h3]:text-base [&_.ProseMirror_h3]:font-semibold [&_.ProseMirror_h3]:mt-8 [&_.ProseMirror_h3]:mb-2 [&_.ProseMirror_h3]:text-foreground',
  // Page Flow: List / Create / Detail
  '[&_.ProseMirror_h4]:text-sm [&_.ProseMirror_h4]:font-semibold [&_.ProseMirror_h4]:mt-5 [&_.ProseMirror_h4]:mb-1.5 [&_.ProseMirror_h4]:uppercase [&_.ProseMirror_h4]:tracking-wide [&_.ProseMirror_h4]:text-muted-foreground',
  '[&_.ProseMirror_h5]:text-xs [&_.ProseMirror_h5]:font-semibold [&_.ProseMirror_h5]:mt-3 [&_.ProseMirror_h5]:mb-1 [&_.ProseMirror_h5]:text-foreground/80',
  '[&_.ProseMirror_p]:my-2 [&_.ProseMirror_p]:leading-relaxed',
  '[&_.tocItem]:font-normal',
  '[&_.subItemContent]:font-normal',
  '[&_.ProseMirror_strong]:font-bold [&_.ProseMirror_em]:italic [&_.ProseMirror_u]:underline',
  '[&_.ProseMirror_ul]:list-disc [&_.ProseMirror_ul]:pl-6 [&_.ProseMirror_ul]:my-3',
  '[&_.ProseMirror_ol]:list-decimal [&_.ProseMirror_ol]:pl-6 [&_.ProseMirror_ol]:my-3',
  '[&_.ProseMirror_li]:my-0.5 [&_.ProseMirror_li]:leading-relaxed',
  '[&_.ProseMirror_blockquote]:pl-4 [&_.ProseMirror_blockquote]:ml-4 [&_.ProseMirror_blockquote]:border-l-2 [&_.ProseMirror_blockquote]:border-muted-foreground/20 [&_.ProseMirror_blockquote]:text-foreground/80',
  '[&_.ProseMirror_blockquote_p]:my-0.5',
  '[&_.ProseMirror_hr]:border-t [&_.ProseMirror_hr]:border-muted-foreground/20 [&_.ProseMirror_hr]:my-8',
  '[&_.ProseMirror_table]:w-full [&_.ProseMirror_table]:min-w-[28rem] [&_.ProseMirror_table]:border-collapse [&_.ProseMirror_table]:my-6 [&_.ProseMirror_table]:text-xs sm:[&_.ProseMirror_table]:text-sm',
  '[&_.ProseMirror_th]:border [&_.ProseMirror_th]:border-muted-foreground/30 [&_.ProseMirror_th]:bg-muted/50 [&_.ProseMirror_th]:px-2.5 [&_.ProseMirror_th]:py-2 [&_.ProseMirror_th]:font-semibold [&_.ProseMirror_th]:text-left [&_.ProseMirror_th]:align-top',
  '[&_.ProseMirror_td]:border [&_.ProseMirror_td]:border-muted-foreground/30 [&_.ProseMirror_td]:px-2.5 [&_.ProseMirror_td]:py-2 [&_.ProseMirror_td]:align-top',
].join(' ')

export function RichTextEditor({
  value,
  onChange,
  placeholder = 'Start typing...',
  disabled = false,
  readOnly = false,
  className,
  proseVariant = 'default',
}: RichTextEditorProps) {
  const proseClass = proseVariant === 'srs' ? proseClassSrs : proseClassDefault

  return (
    <div className={cn('flex flex-col overflow-hidden', disabled && 'opacity-50 pointer-events-none', className)}>
      {/* Ensure toolbar is not sticky/overlaying content when user scrolls. */}
      <style jsx global>{`
        .tiptap-editor-surface {
          --tt-toolbar-bg-color: #c0c0c0;
          --tt-toolbar-border-color: rgba(0, 0, 0, 0.08);
        }

        .dark .tiptap-editor-surface {
          --tt-toolbar-bg-color: #2c2c2c;
          --tt-toolbar-border-color: rgba(255, 255, 255, 0.15);
        }

        .tiptap-toolbar[data-variant="floating"],
        .tiptap-toolbar[data-variant="fixed"] {
          overflow-x: visible !important;
          flex-wrap: wrap !important;
          white-space: normal !important;
        }
      `}</style>
      {/* ── Gray workspace with unlimited growing white A4-width page ──── */}
      <div className="tiptap-editor-surface flex-1 overflow-auto rounded-b-md border bg-[#c0c0c0] dark:bg-[#2c2c2c] pt-0 pb-8">
        {/* Infinity A4: Toolbar sits on gray bar, editor content is the white paper */}
        <div
          className={cn('relative w-full text-sm text-foreground', proseClass)}
          style={{
            width: '100%',
            boxSizing: 'border-box',
          }}
        >
          <SimpleEditor
            embedded
            value={value || ''}
            onChange={onChange}
            disabled={disabled}
            readOnly={readOnly}
            placeholder={placeholder}
            showThemeToggle={false}
            toolbarVariant="fixed"
            editorContentClassName="bg-white shadow-md rounded-md mx-auto"
            editorContentStyle={{
              maxWidth: A4_W,
              width: '100%',
              paddingTop: PAGE_PAD + TOOLBAR_H,
              paddingBottom: PAGE_PAD,
              paddingLeft: PAGE_PAD,
              paddingRight: PAGE_PAD,
              boxSizing: 'border-box',
            }}
          />
        </div>
      </div>
    </div>
  )
}
