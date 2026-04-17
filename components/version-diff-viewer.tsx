'use client'

import { useMemo } from 'react'
import { format } from 'date-fns'
import { diffWords } from 'diff'
import { X } from 'lucide-react'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { htmlToText } from '@/lib/rich-text'
import type { DocumentVersion } from '@/lib/types'

interface VersionDiffViewerProps {
  mode: 'preview' | 'diff'
  versionA: DocumentVersion
  versionB?: DocumentVersion
  onClose: () => void
}

export function VersionDiffViewer({ mode, versionA, versionB, onClose }: VersionDiffViewerProps) {
  const diffResult = useMemo(() => {
    if (mode !== 'diff' || !versionB) return null
    const textA = htmlToText(versionA.content)
    const textB = htmlToText(versionB.content)
    return diffWords(textA, textB)
  }, [mode, versionA, versionB])

  const previewText = useMemo(() => {
    if (mode !== 'preview') return ''
    return htmlToText(versionA.content)
  }, [mode, versionA])

  const removedCount = diffResult?.filter((c) => c.removed).reduce((acc, c) => acc + c.count!, 0) ?? 0
  const addedCount = diffResult?.filter((c) => c.added).reduce((acc, c) => acc + c.count!, 0) ?? 0

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="flex max-h-[90vh] max-w-4xl flex-col gap-0 p-0 [&>button]:hidden">
        <DialogHeader className="border-b px-6 py-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <DialogTitle>
                {mode === 'preview' ? 'Snapshot Preview' : 'Version Comparison'}
              </DialogTitle>
              {mode === 'preview' ? (
                <p className="mt-1 text-sm text-muted-foreground">
                  {versionA.label || 'Snapshot'} —{' '}
                  {format(versionA.createdAt, 'dd MMM yyyy, HH:mm')}
                </p>
              ) : (
                <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">
                    {versionA.label || format(versionA.createdAt, 'dd MMM HH:mm')}
                  </span>
                  <span>→</span>
                  <span className="font-medium text-foreground">
                    {versionB?.label || format(versionB!.createdAt, 'dd MMM HH:mm')}
                  </span>
                  {diffResult && (
                    <div className="flex gap-1">
                      <Badge variant="outline" className="border-green-500 text-green-600 text-xs">
                        +{addedCount} words
                      </Badge>
                      <Badge variant="outline" className="border-red-500 text-red-600 text-xs">
                        -{removedCount} words
                      </Badge>
                    </div>
                  )}
                </div>
              )}
            </div>
            <DialogClose asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                onClick={onClose}
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </Button>
            </DialogClose>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 overflow-auto">
          <div className="px-6 py-4">
            {mode === 'preview' ? (
              <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-foreground">
                {previewText}
              </pre>
            ) : (
              <div className="space-y-1">
                {diffResult && (
                  <>
                    <div className="mb-4 flex gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <span className="inline-block h-3 w-3 rounded bg-green-100 dark:bg-green-900/40" />
                        Added
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="inline-block h-3 w-3 rounded bg-red-100 dark:bg-red-900/40" />
                        Removed
                      </span>
                    </div>
                    <p className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                      {diffResult.map((part, i) => {
                        if (part.added) {
                          return (
                            <mark
                              key={i}
                              className="rounded bg-green-100 px-0.5 text-green-800 dark:bg-green-900/40 dark:text-green-300"
                            >
                              {part.value}
                            </mark>
                          )
                        }
                        if (part.removed) {
                          return (
                            <del
                              key={i}
                              className="rounded bg-red-100 px-0.5 text-red-800 line-through dark:bg-red-900/40 dark:text-red-300"
                            >
                              {part.value}
                            </del>
                          )
                        }
                        return <span key={i}>{part.value}</span>
                      })}
                    </p>
                  </>
                )}
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
