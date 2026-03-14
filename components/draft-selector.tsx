'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import type { DocumentDraft } from '@/lib/types'
import { ChevronDown, Plus, Pencil, Trash2, FileText, Check } from 'lucide-react'
import { format } from 'date-fns'

interface DraftSelectorProps {
  drafts: DocumentDraft[]
  activeDraftId: string | null
  onSelectDraft: (draftId: string) => void
  onCreateDraft: (name: string) => void
  onRenameDraft: (draftId: string, name: string) => void
  onDeleteDraft: (draftId: string) => void
  documentType: 'SOW' | 'SRS'
}

export function DraftSelector({
  drafts,
  activeDraftId,
  onSelectDraft,
  onCreateDraft,
  onRenameDraft,
  onDeleteDraft,
  documentType,
}: DraftSelectorProps) {
  const [showNewDialog, setShowNewDialog] = useState(false)
  const [showRenameDialog, setShowRenameDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [selectedDraft, setSelectedDraft] = useState<DocumentDraft | null>(null)
  const [newName, setNewName] = useState('')

  const activeDraft = drafts.find((d) => d.id === activeDraftId)

  const handleCreate = () => {
    if (newName.trim()) {
      onCreateDraft(newName.trim())
      setNewName('')
      setShowNewDialog(false)
    }
  }

  const handleRename = () => {
    if (selectedDraft && newName.trim()) {
      onRenameDraft(selectedDraft.id, newName.trim())
      setNewName('')
      setSelectedDraft(null)
      setShowRenameDialog(false)
    }
  }

  const handleDelete = () => {
    if (selectedDraft) {
      onDeleteDraft(selectedDraft.id)
      setSelectedDraft(null)
      setShowDeleteDialog(false)
    }
  }

  const openRenameDialog = (draft: DocumentDraft) => {
    setSelectedDraft(draft)
    setNewName(draft.name)
    setShowRenameDialog(true)
  }

  const openDeleteDialog = (draft: DocumentDraft) => {
    setSelectedDraft(draft)
    setShowDeleteDialog(true)
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="min-w-[200px] justify-between gap-2">
              <div className="flex items-center gap-2 truncate">
                <FileText className="h-4 w-4 shrink-0" />
                <span className="truncate">
                  {activeDraft?.name || `Select ${documentType} Draft`}
                </span>
              </div>
              <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-[280px]">
            {drafts.length === 0 ? (
              <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                No drafts yet. Create your first draft.
              </div>
            ) : (
              drafts.map((draft) => (
                <DropdownMenuItem
                  key={draft.id}
                  className="flex items-center justify-between gap-2 p-2"
                  onSelect={() => onSelectDraft(draft.id)}
                >
                  <div className="flex flex-1 flex-col gap-0.5 overflow-hidden">
                    <div className="flex items-center gap-2">
                      {draft.id === activeDraftId && (
                        <Check className="h-3 w-3 shrink-0 text-primary" />
                      )}
                      <span className="truncate font-medium">{draft.name}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      Updated {format(draft.updatedAt, 'MMM d, yyyy h:mm a')}
                    </span>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0"
                      onClick={(e) => {
                        e.stopPropagation()
                        openRenameDialog(draft)
                      }}
                    >
                      <Pencil className="h-3 w-3" />
                      <span className="sr-only">Rename</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation()
                        openDeleteDialog(draft)
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                      <span className="sr-only">Delete</span>
                    </Button>
                  </div>
                </DropdownMenuItem>
              ))
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="gap-2"
              onSelect={() => {
                setNewName(`${documentType} Draft ${drafts.length + 1}`)
                setShowNewDialog(true)
              }}
            >
              <Plus className="h-4 w-4" />
              Create New Draft
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Badge variant="secondary" className="shrink-0">
          {drafts.length} {drafts.length === 1 ? 'draft' : 'drafts'}
        </Badge>
      </div>

      {/* New Draft Dialog */}
      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New {documentType} Draft</DialogTitle>
            <DialogDescription>
              Enter a name for your new draft. You can rename it later.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Draft name"
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={!newName.trim()}>
              Create Draft
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Dialog */}
      <Dialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Draft</DialogTitle>
            <DialogDescription>Enter a new name for this draft.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Draft name"
              onKeyDown={(e) => e.key === 'Enter' && handleRename()}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRenameDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleRename} disabled={!newName.trim()}>
              Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Draft</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedDraft?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-white hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
