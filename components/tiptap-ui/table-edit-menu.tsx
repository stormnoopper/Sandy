'use client'

import { useCurrentEditor } from '@tiptap/react'
import { Table2Icon } from 'lucide-react'
import { Button } from '@/components/tiptap-ui-primitive/button'
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export function TableEditMenu() {
  const { editor } = useCurrentEditor()
  if (!editor) return null

  const inTable = editor.isActive('table')

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          tooltip={inTable ? 'Table: rows & columns' : 'Insert table'}
          disabled={!editor.isEditable}
          className={cn(inTable && 'bg-accent/60')}
        >
          <Table2Icon className="tiptap-button-icon" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel>Table</DropdownMenuLabel>
        <DropdownMenuItem
          onClick={() =>
            editor.chain().focus().insertTable({ rows: 3, cols: 4, withHeaderRow: true }).run()
          }
        >
          Insert 3×4 (with header)
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={!inTable}
          onClick={() => editor.chain().focus().addColumnBefore().run()}
        >
          Add column before
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={!inTable}
          onClick={() => editor.chain().focus().addColumnAfter().run()}
        >
          Add column after
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={!inTable}
          onClick={() => editor.chain().focus().deleteColumn().run()}
        >
          Delete column
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={!inTable}
          onClick={() => editor.chain().focus().addRowBefore().run()}
        >
          Add row before
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={!inTable}
          onClick={() => editor.chain().focus().addRowAfter().run()}
        >
          Add row after
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={!inTable}
          onClick={() => editor.chain().focus().deleteRow().run()}
        >
          Delete row
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={!inTable}
          onClick={() => editor.chain().focus().mergeOrSplit().run()}
        >
          Merge / split cells
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={!inTable}
          onClick={() => editor.chain().focus().toggleHeaderRow().run()}
        >
          Toggle header row
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={!inTable}
          className="text-destructive focus:text-destructive"
          onClick={() => editor.chain().focus().deleteTable().run()}
        >
          Delete table
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
