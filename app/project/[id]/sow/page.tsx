'use client'

import { use, useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useProjects } from '@/lib/project-context'
import { ProjectNotFound } from '@/components/project-not-found'
import { RichTextEditor } from '@/components/rich-text-editor'
import { DraftSelector } from '@/components/draft-selector'
import { ProjectDataSelector } from '@/components/project-data-selector'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { exportToDocx, exportToPdf } from '@/lib/export-utils'
import { htmlToText, textToHtml } from '@/lib/rich-text'
import { useProjectDataSelection } from '@/lib/use-project-data-selection'
import { stripDocumentMarker, hasDocumentMarker } from '@/lib/utils'
import { toast } from '@/hooks/use-toast'
import { VersionHistoryPanel } from '@/components/version-history-panel'
import { ShareDocumentDialog } from '@/components/share-document-dialog'
import { useSession } from 'next-auth/react'
import {
  ArrowLeft,
  FileText,
  ArrowRight,
  ListChecks,
  Sparkles,
  Download,
  FileType,
  FileIcon,
} from 'lucide-react'

interface SOWPageProps {
  params: Promise<{ id: string }>
}

export default function SOWPage({ params }: SOWPageProps) {
  const { id } = use(params)
  const router = useRouter()
  const { data: session } = useSession()
  const {
    projects,
    isHydrated,
    setCurrentProject,
    createSowDraft,
    updateSowDraft,
    deleteSowDraft,
    setActiveSowDraft,
    renameSowDraft,
  } = useProjects()
  const [isGenerating, setIsGenerating] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const [generateStatus, setGenerateStatus] = useState<'generating' | 'waiting' | 'continuing' | null>(null)
  const [content, setContent] = useState('')

  const project = projects.find((p) => p.id === id)
  const { selectedIds: selectedDataEntryIds, setSelectedIds: setSelectedDataEntryIds } =
    useProjectDataSelection(project?.dataEntries)
  const activeDraft = project?.sowDrafts.find((d) => d.id === project.activeSowDraftId)
  const selectedDataEntries =
    project?.dataEntries.filter((entry) => selectedDataEntryIds.includes(entry.id)) ?? []
  const hasProjectData = (project?.dataEntries.length ?? 0) > 0

  useEffect(() => {
    if (project) {
      setCurrentProject(project)
      if (activeDraft) {
        setContent(activeDraft.content)
        setIsComplete(hasDocumentMarker(htmlToText(activeDraft.content)))
      } else {
        setContent('')
        setIsComplete(false)
      }
    }
  }, [project, activeDraft, setCurrentProject])

  // Auto-save with debounce
  useEffect(() => {
    if (project && activeDraft && content !== activeDraft.content) {
      const timeout = setTimeout(() => {
        updateSowDraft(id, activeDraft.id, content)
      }, 500)
      return () => clearTimeout(timeout)
    }
  }, [content, id, project, activeDraft, updateSowDraft])

  const handleCreateDraft = useCallback(
    (name: string) => {
      if (project && hasProjectData) {
        createSowDraft(id, name)
      }
    },
    [id, project, createSowDraft, hasProjectData]
  )

  const handleSelectDraft = useCallback(
    (draftId: string) => {
      if (project) {
        setActiveSowDraft(id, draftId)
        const draft = project.sowDrafts.find((d) => d.id === draftId)
        if (draft) {
          setContent(draft.content)
        }
      }
    },
    [id, project, setActiveSowDraft]
  )

  const handleGenerate = useCallback(async () => {
    if (!project || !activeDraft || selectedDataEntries.length === 0) return

    const MAX_CONTINUATIONS = 10
    const CONTINUE_DELAY_MS = 5000

    const streamOnce = async (
      body: Record<string, unknown>,
      baseText: string
    ): Promise<{ finalText: string; complete: boolean; error?: string }> => {
      const response = await fetch('/api/generate-sow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const responseBody = await response.text()
        let message = 'Failed to generate SOW'
        try {
          const json = JSON.parse(responseBody)
          if (json.error) message = json.error
        } catch {
          if (responseBody) message = responseBody
        }
        return { finalText: baseText, complete: false, error: message }
      }

      const reader = response.body?.getReader()
      if (!reader) return { finalText: baseText, complete: false, error: 'No response stream' }

      const decoder = new TextDecoder()
      let streamed = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        streamed += decoder.decode(value, { stream: true })
        const combined = baseText + streamed
        if (hasDocumentMarker(combined)) {
          const cleaned = stripDocumentMarker(combined)
          setContent(textToHtml(cleaned))
          return { finalText: cleaned, complete: true }
        }
        setContent(textToHtml(combined))
      }

      return { finalText: baseText + streamed, complete: false }
    }

    setIsGenerating(true)
    setContent('')
    setIsComplete(false)
    setGenerateStatus('generating')

    const startTime = Date.now()
    let finalStatus: 'completed' | 'failed' | 'cancelled' = 'failed'
    let finalOutputLength = 0
    let continuationCount = 0

    try {
      const initial = await streamOnce(
        {
          projectName: project.name,
          projectDescription: project.description,
          dataEntries: selectedDataEntries,
        },
        ''
      )

      if (initial.error) {
        toast({ title: 'Generation failed', description: initial.error, variant: 'destructive' })
        finalStatus = 'failed'
        return
      }

      let currentText = initial.finalText
      let complete = initial.complete

      for (let i = 0; i < MAX_CONTINUATIONS && !complete; i++) {
        continuationCount++
        setGenerateStatus('waiting')
        await new Promise((resolve) => setTimeout(resolve, CONTINUE_DELAY_MS))
        setGenerateStatus('continuing')

        const cont = await streamOnce({ continueFrom: currentText }, currentText)

        if (cont.error) {
          toast({ title: 'Continue failed', description: cont.error, variant: 'destructive' })
          break
        }

        currentText = cont.finalText
        complete = cont.complete
      }

      finalOutputLength = currentText.length
      if (complete) {
        setIsComplete(true)
        finalStatus = 'completed'
        // Auto-save a version snapshot after successful generation
        void fetch(`/api/projects/${id}/versions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            draftId: activeDraft.id,
            draftType: 'sow',
            content: textToHtml(currentText),
            label: `AI generation — ${new Date().toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' })}`,
          }),
        })
      } else {
        finalStatus = 'failed'
      }
    } catch (error) {
      console.error('Error generating SOW:', error)
      finalStatus = 'failed'
      toast({
        title: 'Generation failed',
        description: error instanceof Error ? error.message : 'Something went wrong',
        variant: 'destructive',
      })
    } finally {
      setIsGenerating(false)
      setGenerateStatus(null)
      // Record analytics
      void fetch(`/api/projects/${id}/generation-history`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentType: 'sow',
          draftId: activeDraft.id,
          model: 'glm-4.5-air',
          dataEntryCount: selectedDataEntries.length,
          outputLength: finalOutputLength,
          durationMs: Date.now() - startTime,
          continuationCount,
          status: finalStatus,
        }),
      })
    }
  }, [project, activeDraft, selectedDataEntries, id])

  const handleExportDocx = useCallback(async () => {
    if (!project || !activeDraft) return
    await exportToDocx({
      projectName: project.name,
      content,
      type: 'sow',
    })
  }, [project, activeDraft, content])

  const handleExportPdf = useCallback(async () => {
    if (!project || !activeDraft) return
    await exportToPdf({
      projectName: project.name,
      content,
      type: 'sow',
    })
  }, [project, activeDraft, content])

  if (!isHydrated) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="text-muted-foreground">Loading…</div>
      </div>
    )
  }
  if (!project) {
    return <ProjectNotFound />
  }

  if (!hasProjectData) {
    return (
      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex flex-col gap-4 border-b bg-background px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href={`/project/${id}`}>
                <ArrowLeft className="h-4 w-4" />
                <span className="sr-only">Back to project</span>
              </Link>
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-chart-2" />
                <h1 className="text-xl font-semibold">Statement of Work</h1>
              </div>
              <p className="text-sm text-muted-foreground">{project.name}</p>
            </div>
          </div>
        </header>

        <div className="flex flex-1 items-center justify-center p-6">
          <div className="max-w-md rounded-lg border bg-muted/20 p-8 text-center">
            <h2 className="text-lg font-semibold">Add project data before creating SOW</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              You need at least one Project Data entry before you can create or generate a Statement
              of Work.
            </p>
            <Button className="mt-4" asChild>
              <Link href={`/project/${id}`}>Back to Project Data</Link>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <header className="flex flex-col gap-4 border-b bg-background px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/project/${id}`}>
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Back to project</span>
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-chart-2" />
              <h1 className="text-xl font-semibold">Statement of Work</h1>
            </div>
            <p className="text-sm text-muted-foreground">{project.name}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="gap-1">
            <ListChecks className="h-3 w-3" />
            {selectedDataEntries.length}/{project.dataEntries.length} entries
          </Badge>
          {activeDraft && content ? (
            <Button variant="outline" size="sm" asChild className="gap-1">
              <Link href={`/project/${id}/srs`}>
                Continue to SRS
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          ) : (
            <Button variant="outline" size="sm" className="gap-1" disabled>
              Continue to SRS
              <ArrowRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="hidden w-72 flex-shrink-0 border-r bg-muted/30 p-4 lg:block">
          <ProjectDataSelector
            entries={project.dataEntries}
            selectedIds={selectedDataEntryIds}
            onChange={setSelectedDataEntryIds}
            description="Choose which project data entries to send into SOW generation."
          />
        </aside>

        <main className="flex flex-1 flex-col overflow-hidden p-6">
          {/* Toolbar */}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
            <DraftSelector
              drafts={project.sowDrafts}
              activeDraftId={project.activeSowDraftId}
              onSelectDraft={handleSelectDraft}
              onCreateDraft={handleCreateDraft}
              onRenameDraft={(draftId, name) => renameSowDraft(id, draftId, name)}
              onDeleteDraft={(draftId) => {
                const wasActive = project?.activeSowDraftId === draftId
                const hasOtherDrafts = (project?.sowDrafts.length ?? 0) > 1
                deleteSowDraft(id, draftId)
                if (wasActive && !hasOtherDrafts) {
                  router.push(`/project/${id}`)
                }
              }}
              documentType="SOW"
            />

            <div className="flex flex-wrap items-center gap-2">
              {activeDraft && (
                <VersionHistoryPanel
                  projectId={id}
                  draftId={activeDraft.id}
                  draftType="sow"
                  currentContent={content}
                  userName={session?.user?.name ?? undefined}
                />
              )}

              {activeDraft && content && (
                <ShareDocumentDialog
                  projectId={id}
                  projectName={project.name}
                  documentType="sow"
                  draftId={activeDraft.id}
                  draftName={activeDraft.name}
                />
              )}

              <Button
                onClick={handleGenerate}
                disabled={isGenerating || !activeDraft || selectedDataEntries.length === 0}
                className="gap-2"
              >
                {isGenerating ? (
                  <Spinner className="size-4" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                {isGenerating
                  ? generateStatus === 'waiting'
                    ? 'Waiting 5s...'
                    : generateStatus === 'continuing'
                      ? 'Continuing...'
                      : 'Generating...'
                  : 'Generate with AI'}
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" disabled={!activeDraft || !content} className="gap-2">
                    <Download className="h-4 w-4" />
                    Export
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleExportDocx} className="gap-2">
                    <FileType className="h-4 w-4" />
                    Export as DOCX
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExportPdf} className="gap-2">
                    <FileIcon className="h-4 w-4" />
                    Export as PDF
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Editor */}
          {activeDraft ? (
            <RichTextEditor
              value={content}
              onChange={setContent}
              placeholder="Start writing your Statement of Work or click 'Generate with AI' to create one based on your project data..."
              disabled={isGenerating}
              className="flex-1"
            />
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 rounded-md border border-dashed bg-muted/30 p-8">
              <FileText className="h-12 w-12 text-muted-foreground" />
              <div className="text-center">
                <h3 className="text-lg font-semibold">No Draft Selected</h3>
                <p className="text-sm text-muted-foreground">
                  Create a new draft to start writing your Statement of Work
                </p>
              </div>
              <Button onClick={() => handleCreateDraft('SOW Draft 1')} className="gap-2">
                Create First Draft
              </Button>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
