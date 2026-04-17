'use client'

import { useState, useEffect, useCallback } from 'react'
import { format } from 'date-fns'
import { History, Eye, GitCompare, Loader2, Clock, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
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
import { VersionDiffViewer } from '@/components/version-diff-viewer'
import type { DocumentVersion } from '@/lib/types'

interface VersionHistoryPanelProps {
  projectId: string
  draftId: string
  draftType: 'sow' | 'srs'
  currentContent: string
  userName?: string
}

export function VersionHistoryPanel({
  projectId,
  draftId,
  draftType,
  currentContent,
  userName,
}: VersionHistoryPanelProps) {
  const [open, setOpen] = useState(false)
  const [versions, setVersions] = useState<DocumentVersion[]>([])
  const [loading, setLoading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [pendingDeleteVersion, setPendingDeleteVersion] = useState<DocumentVersion | null>(null)
  const [previewVersion, setPreviewVersion] = useState<DocumentVersion | null>(null)
  const [compareVersions, setCompareVersions] = useState<[DocumentVersion, DocumentVersion] | null>(null)
  const [selectedForCompare, setSelectedForCompare] = useState<DocumentVersion | null>(null)

  const fetchVersions = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/versions?draftId=${draftId}`)
      if (res.ok) {
        const json = await res.json()
        setVersions(
          json.versions.map((v: any) => ({ ...v, createdAt: new Date(v.createdAt) }))
        )
      }
    } finally {
      setLoading(false)
    }
  }, [projectId, draftId])

  useEffect(() => {
    if (open) fetchVersions()
  }, [open, fetchVersions])

  const handleSaveSnapshot = useCallback(async () => {
    const label = `Manual snapshot — ${format(new Date(), 'dd MMM yyyy HH:mm')}`
    const res = await fetch(`/api/projects/${projectId}/versions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ draftId, draftType, content: currentContent, label }),
    })
    if (res.ok) {
      await fetchVersions()
    }
  }, [projectId, draftId, draftType, currentContent, fetchVersions])

  const handleCompareSelect = useCallback(
    (version: DocumentVersion) => {
      if (!selectedForCompare) {
        setSelectedForCompare(version)
      } else if (selectedForCompare.id !== version.id) {
        setCompareVersions([selectedForCompare, version])
        setSelectedForCompare(null)
      } else {
        setSelectedForCompare(null)
      }
    },
    [selectedForCompare]
  )

  const handleDeleteSnapshot = useCallback(
    async (version: DocumentVersion) => {
      setDeletingId(version.id)
      try {
        const res = await fetch(
          `/api/projects/${projectId}/versions?versionId=${encodeURIComponent(version.id)}`,
          {
            method: 'DELETE',
          }
        )
        if (res.ok) {
          setVersions((prev) => prev.filter((v) => v.id !== version.id))
          if (selectedForCompare?.id === version.id) {
            setSelectedForCompare(null)
          }
          if (previewVersion?.id === version.id) {
            setPreviewVersion(null)
          }
          if (compareVersions?.some((v) => v.id === version.id)) {
            setCompareVersions(null)
          }
        }
      } finally {
        setDeletingId(null)
        setPendingDeleteVersion(null)
      }
    },
    [projectId, compareVersions, previewVersion, selectedForCompare]
  )

  return (
    <>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <History className="h-4 w-4" />
            History
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="flex w-[460px] flex-col p-0 sm:max-w-[460px]">
          <SheetHeader className="space-y-1 border-b px-5 py-4">
            <SheetTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Version History
            </SheetTitle>
          </SheetHeader>

          <div className="flex items-center justify-between gap-3 border-b bg-muted/20 px-5 py-3">
            <p className="text-sm font-medium text-muted-foreground">
              {versions.length} snapshot{versions.length !== 1 ? 's' : ''}
            </p>
            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-2 bg-background"
              onClick={handleSaveSnapshot}
              disabled={!currentContent}
            >
              <Clock className="h-3.5 w-3.5" />
              Save Snapshot
            </Button>
          </div>

          {selectedForCompare && (
            <div className="mx-5 mt-3 rounded-md border border-chart-1/40 bg-chart-1/10 px-3 py-2 text-sm">
              <span className="font-medium">Compare mode:</span> select another version to compare
              with <em>{selectedForCompare.label || format(selectedForCompare.createdAt, 'dd MMM HH:mm')}</em>
              <Button
                variant="ghost"
                size="sm"
                className="ml-2 h-5 px-1 text-xs"
                onClick={() => setSelectedForCompare(null)}
              >
                Cancel
              </Button>
            </div>
          )}

          {loading ? (
            <div className="flex flex-1 items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : versions.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 px-5 text-center">
              <History className="h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No snapshots yet.</p>
              <p className="text-xs text-muted-foreground">
                Snapshots are saved automatically after AI generation and manually via &quot;Save
                Snapshot&quot;.
              </p>
            </div>
          ) : (
            <ScrollArea className="flex-1">
              <div className="space-y-3 px-5 py-4">
                {versions.map((version) => (
                  <div
                    key={version.id}
                    className={`rounded-xl border p-3.5 transition-all ${
                      selectedForCompare?.id === version.id
                        ? 'border-chart-1 bg-chart-1/10 shadow-sm'
                        : 'bg-card hover:border-muted-foreground/20 hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1 space-y-1">
                        <p className="truncate text-sm font-medium">
                          {version.label || 'Snapshot'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(version.createdAt, 'dd MMM yyyy, HH:mm')}
                        </p>
                        {version.createdByName && (
                          <p className="text-xs text-muted-foreground">{version.createdByName}</p>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-1 rounded-lg border bg-background p-1 shadow-sm">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          title="Preview"
                          onClick={() => setPreviewVersion(version)}
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          title="Select for compare"
                          onClick={() => handleCompareSelect(version)}
                        >
                          <GitCompare className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          title="Delete snapshot"
                          disabled={deletingId === version.id}
                          onClick={() => setPendingDeleteVersion(version)}
                        >
                          {deletingId === version.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </Button>
                      </div>
                    </div>
                    <div className="mt-2.5 flex items-center justify-between">
                      <Badge variant="outline" className="text-xs">
                        {Math.round(version.content.length / 100) / 10}k chars
                      </Badge>
                    </div>
                    {selectedForCompare?.id === version.id && (
                      <p className="mt-2 text-xs font-medium text-chart-1">
                        Selected for comparison
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </SheetContent>
      </Sheet>

      {previewVersion && (
        <VersionDiffViewer
          mode="preview"
          versionA={previewVersion}
          onClose={() => setPreviewVersion(null)}
        />
      )}

      {compareVersions && (
        <VersionDiffViewer
          mode="diff"
          versionA={compareVersions[0]}
          versionB={compareVersions[1]}
          onClose={() => setCompareVersions(null)}
        />
      )}

      <AlertDialog
        open={!!pendingDeleteVersion}
        onOpenChange={(open) => {
          if (!open && !deletingId) setPendingDeleteVersion(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete snapshot?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete{' '}
              <span className="font-medium text-foreground">
                {pendingDeleteVersion?.label ||
                  (pendingDeleteVersion
                    ? format(pendingDeleteVersion.createdAt, 'dd MMM yyyy, HH:mm')
                    : 'this snapshot')}
              </span>
              . This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!deletingId}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="min-w-24 bg-destructive font-medium text-white hover:bg-destructive/90"
              disabled={!pendingDeleteVersion || !!deletingId}
              onClick={(e) => {
                e.preventDefault()
                if (!pendingDeleteVersion) return
                void handleDeleteSnapshot(pendingDeleteVersion)
              }}
            >
              {deletingId ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Deleting...
                </span>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
