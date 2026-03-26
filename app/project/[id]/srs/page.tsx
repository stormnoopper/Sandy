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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { exportToDocx, exportToPdf } from '@/lib/export-utils'
import { getRichTextPreview, hasRichTextContent, htmlToText, textToHtml } from '@/lib/rich-text'
import { useProjectDataSelection } from '@/lib/use-project-data-selection'
import { stripDocumentMarker, hasDocumentMarker } from '@/lib/utils'
import { toast } from '@/hooks/use-toast'
import {
  ArrowLeft,
  FileCode,
  FileText,
  Check,
  Sparkles,
  Download,
  FileType,
  FileIcon,
  LayoutTemplate,
} from 'lucide-react'

interface SRSPageProps {
  params: Promise<{ id: string }>
}

const SRS_SECTIONS = [
  'Introduction',
  'Overall Description',
  'Functional Requirements',
  'Non-Functional Requirements',
  'External Interfaces',
  'System Constraints',
]

export default function SRSPage({ params }: SRSPageProps) {
  const { id } = use(params)
  const router = useRouter()
  const {
    projects,
    isHydrated,
    setCurrentProject,
    createSrsDraft,
    updateSrsDraft,
    deleteSrsDraft,
    setActiveSrsDraft,
    renameSrsDraft,
  } = useProjects()
  const [isGenerating, setIsGenerating] = useState(false)
  const [isComplete, setIsComplete] = useState(false)
  const [generateStatus, setGenerateStatus] = useState<'generating' | 'waiting' | 'continuing' | null>(null)
  const [content, setContent] = useState('')

  const project = projects.find((p) => p.id === id)
  const { selectedIds: selectedDataEntryIds, setSelectedIds: setSelectedDataEntryIds } =
    useProjectDataSelection(project?.dataEntries)
  const activeDraft = project?.srsDrafts.find((d) => d.id === project.activeSrsDraftId)
  const activeSow = project?.sowDrafts.find((d) => d.id === project.activeSowDraftId)
  const selectedDataEntries =
    project?.dataEntries.filter((entry) => selectedDataEntryIds.includes(entry.id)) ?? []
  const hasActiveSow = hasRichTextContent(activeSow?.content)

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
        updateSrsDraft(id, activeDraft.id, content)
      }, 500)
      return () => clearTimeout(timeout)
    }
  }, [content, id, project, activeDraft, updateSrsDraft])

  const handleCreateDraft = useCallback(
    (name: string) => {
      if (project && hasActiveSow) {
        createSrsDraft(id, name)
      }
    },
    [id, project, createSrsDraft, hasActiveSow]
  )

  const handleSelectDraft = useCallback(
    (draftId: string) => {
      if (project) {
        setActiveSrsDraft(id, draftId)
        const draft = project.srsDrafts.find((d) => d.id === draftId)
        if (draft) {
          setContent(draft.content)
        }
      }
    },
    [id, project, setActiveSrsDraft]
  )

  const handleGenerate = useCallback(async () => {
    if (!project || !activeDraft || !hasActiveSow) return

    const MAX_CONTINUATIONS = 10
    const CONTINUE_DELAY_MS = 5000

    const streamOnce = async (
      body: Record<string, unknown>,
      baseText: string
    ): Promise<{ finalText: string; complete: boolean; error?: string }> => {
      const response = await fetch('/api/generate-srs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const responseBody = await response.text()
        let message = 'Failed to generate SRS'
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
          setContent(textToHtml(cleaned, { mode: 'srs' }))
          return { finalText: cleaned, complete: true }
        }
        setContent(textToHtml(combined, { mode: 'srs' }))
      }

      return { finalText: baseText + streamed, complete: false }
    }

    setIsGenerating(true)
    // Regenerate from scratch: clear current editor content immediately.
    // Auto-save will persist the new content as streaming progresses.
    setContent('')
    setIsComplete(false)
    setGenerateStatus('generating')

    try {
      const sowContent = activeSow ? htmlToText(activeSow.content) : ''
      const initial = await streamOnce(
        {
          projectName: project.name,
          projectDescription: project.description,
          sow: sowContent,
          dataEntries: selectedDataEntries,
        },
        ''
      )

      if (initial.error) {
        toast({ title: 'Generation failed', description: initial.error, variant: 'destructive' })
        return
      }

      let currentText = initial.finalText
      let complete = initial.complete

      for (let i = 0; i < MAX_CONTINUATIONS && !complete; i++) {
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

      if (complete) {
        setIsComplete(true)
        // Reload the page after auto-save (500ms debounce) has time to persist the
        // final content, so all Mermaid diagrams render cleanly from saved state.
        setTimeout(() => {
          window.location.reload()
        }, 800)
      }
    } catch (error) {
      console.error('Error generating SRS:', error)
      toast({
        title: 'Generation failed',
        description: error instanceof Error ? error.message : 'Something went wrong',
        variant: 'destructive',
      })
    } finally {
      setIsGenerating(false)
      setGenerateStatus(null)
    }
  }, [project, activeDraft, activeSow, selectedDataEntries, hasActiveSow])

  const handleGenerateSection = useCallback(
    async (section: string) => {
      if (!project || !activeDraft || !hasActiveSow) return

      setIsGenerating(true)
      try {
        const sowContent = activeSow ? htmlToText(activeSow.content) : ''
        const existingSRS = htmlToText(content)
        
        const response = await fetch('/api/generate-srs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projectName: project.name,
            projectDescription: project.description,
            sow: sowContent,
            dataEntries: selectedDataEntries,
            existingSRS,
            section,
          }),
        })

        if (!response.ok) {
          const body = await response.text()
          let message = 'Failed to generate section'
          try {
            const json = JSON.parse(body)
            if (json.error) message = json.error
          } catch {
            if (body) message = body
          }
          toast({
            title: 'Generation failed',
            description: message,
            variant: 'destructive',
          })
          return
        }

        const reader = response.body?.getReader()
        if (!reader) {
          toast({
            title: 'Generation failed',
            description: 'No response stream',
            variant: 'destructive',
          })
          return
        }

        const decoder = new TextDecoder()
        let sectionContent = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          sectionContent += decoder.decode(value, { stream: true })
          if (hasDocumentMarker(sectionContent)) {
            sectionContent = stripDocumentMarker(sectionContent)
            break
          }
        }

        setContent((prev) => {
          const prevText = htmlToText(prev)
          if (prevText) {
            return textToHtml(`${prevText}\n\n## ${section}\n\n${sectionContent}`, { mode: 'srs' })
          }
          return textToHtml(`## ${section}\n\n${sectionContent}`, { mode: 'srs' })
        })
      } catch (error) {
        console.error('Error generating section:', error)
        toast({
          title: 'Generation failed',
          description: error instanceof Error ? error.message : 'Something went wrong',
          variant: 'destructive',
        })
      } finally {
        setIsGenerating(false)
      }
    },
    [project, activeDraft, activeSow, content, selectedDataEntries, hasActiveSow]
  )

  const handleExportDocx = useCallback(async () => {
    if (!project || !activeDraft) return
    await exportToDocx({
      projectName: project.name,
      content: htmlToText(content),
      type: 'srs',
    })
  }, [project, activeDraft, content])

  const handleExportPdf = useCallback(async () => {
    if (!project || !activeDraft) return
    await exportToPdf({
      projectName: project.name,
      content: htmlToText(content),
      type: 'srs',
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

  if (!hasActiveSow) {
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
                <FileCode className="h-5 w-5 text-chart-1" />
                <h1 className="text-xl font-semibold">System Requirements Specification</h1>
              </div>
              <p className="text-sm text-muted-foreground">{project.name}</p>
            </div>
          </div>
        </header>

        <div className="flex flex-1 items-center justify-center p-6">
          <div className="max-w-md rounded-lg border bg-muted/20 p-8 text-center">
            <h2 className="text-lg font-semibold">Create SOW before creating SRS</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              You need an active SOW with content before you can create or generate the System
              Requirements Specification.
            </p>
            <Button className="mt-4" asChild>
              <Link href={`/project/${id}/sow`}>Go to SOW</Link>
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
              <FileCode className="h-5 w-5 text-chart-1" />
              <h1 className="text-xl font-semibold">System Requirements Specification</h1>
            </div>
            <p className="text-sm text-muted-foreground">{project.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {activeSow && activeSow.content && (
            <Badge variant="outline" className="gap-1 border-chart-2 text-chart-2">
              <Check className="h-3 w-3" />
              SOW Available
            </Badge>
          )}
          <Badge variant="outline">
            Data {selectedDataEntries.length}/{project.dataEntries.length}
          </Badge>
          {activeDraft && content ? (
            <Button variant="outline" asChild>
              <Link href={`/project/${id}/prototype`}>
                <LayoutTemplate className="h-4 w-4" />
                Go to Prototype
              </Link>
            </Button>
          ) : (
            <Button variant="outline" disabled>
              <LayoutTemplate className="h-4 w-4" />
              Go to Prototype
            </Button>
          )}
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="hidden w-72 flex-shrink-0 overflow-y-auto border-r bg-muted/30 p-4 lg:block">
          <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <FileText className="h-4 w-4" />
                SOW Reference
              </CardTitle>
              <CardDescription className="text-xs">
                Active Statement of Work
              </CardDescription>
            </CardHeader>
            <CardContent>
              {activeSow && activeSow.content ? (
                <p className="line-clamp-6 text-xs text-muted-foreground">
                  {getRichTextPreview(activeSow.content, 300)}
                </p>
              ) : (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    No SOW draft available. Create one first for better SRS generation.
                  </p>
                  <Button variant="outline" size="sm" asChild className="w-full">
                    <Link href={`/project/${id}/sow`}>Create SOW First</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <ProjectDataSelector
            entries={project.dataEntries}
            selectedIds={selectedDataEntryIds}
            onChange={setSelectedDataEntryIds}
            description="Choose which project data entries to include together with the SOW."
          />

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Generate by Section</CardTitle>
              <CardDescription className="text-xs">
                Add individual sections with AI
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {SRS_SECTIONS.map((section) => (
                <Button
                  key={section}
                  variant="outline"
                  size="sm"
                  onClick={() => handleGenerateSection(section)}
                  disabled={isGenerating || !activeDraft || !hasActiveSow}
                  className="w-full justify-start gap-2 text-xs"
                >
                  <Sparkles className="h-3 w-3" />
                  {section}
                </Button>
              ))}
            </CardContent>
          </Card>
          </div>
        </aside>

        <main className="flex flex-1 flex-col overflow-hidden p-6">
          {/* Toolbar */}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
            <DraftSelector
              drafts={project.srsDrafts}
              activeDraftId={project.activeSrsDraftId}
              onSelectDraft={handleSelectDraft}
              onCreateDraft={handleCreateDraft}
              onRenameDraft={(draftId, name) => renameSrsDraft(id, draftId, name)}
              onDeleteDraft={(draftId) => {
                const wasActive = project?.activeSrsDraftId === draftId
                const hasOtherDrafts = (project?.srsDrafts.length ?? 0) > 1
                deleteSrsDraft(id, draftId)
                if (wasActive && !hasOtherDrafts) {
                  router.push(`/project/${id}`)
                }
              }}
              documentType="SRS"
            />

            <div className="flex items-center gap-2">
              <Button
                onClick={handleGenerate}
                disabled={isGenerating || !activeDraft || !hasActiveSow}
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
                  : 'Generate Full SRS'}
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

              {activeDraft && content ? (
                <Button variant="outline" asChild>
                  <Link href={`/project/${id}/prototype`}>
                    <LayoutTemplate className="h-4 w-4" />
                    Continue to Prototype
                  </Link>
                </Button>
              ) : (
                <Button variant="outline" disabled>
                  <LayoutTemplate className="h-4 w-4" />
                  Continue to Prototype
                </Button>
              )}
            </div>
          </div>

          {/* Editor */}
          {activeDraft ? (
            <RichTextEditor
              value={content}
              onChange={setContent}
              placeholder="Start writing your System Requirements Specification or click 'Generate Full SRS' to create one based on your SOW..."
              disabled={isGenerating}
              className="flex-1"
              proseVariant="srs"
            />
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 rounded-md border border-dashed bg-muted/30 p-8">
              <FileCode className="h-12 w-12 text-muted-foreground" />
              <div className="text-center">
                <h3 className="text-lg font-semibold">No Draft Selected</h3>
                <p className="text-sm text-muted-foreground">
                  Create a new draft to start writing your System Requirements Specification
                </p>
              </div>
              <Button onClick={() => handleCreateDraft('SRS Draft 1')} className="gap-2">
                Create First Draft
              </Button>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
