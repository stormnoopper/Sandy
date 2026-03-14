'use client'

import { use, useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { DraftSelector } from '@/components/draft-selector'
import { ProjectDataSelector } from '@/components/project-data-selector'
import { ProjectNotFound } from '@/components/project-not-found'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useProjects } from '@/lib/project-context'
import { getRichTextPreview, hasRichTextContent, htmlToText } from '@/lib/rich-text'
import { useProjectDataSelection } from '@/lib/use-project-data-selection'
import { buildPrototypePrompt } from '@/prompts/prototype'
import { ArrowLeft, Copy, LayoutTemplate, Sparkles } from 'lucide-react'

interface PrototypePageProps {
  params: Promise<{ id: string }>
}

export default function PrototypePage({ params }: PrototypePageProps) {
  const { id } = use(params)
  const {
    projects,
    setCurrentProject,
    createSrsDraft,
    deleteSrsDraft,
    renameSrsDraft,
    setActiveSrsDraft,
    upsertPrototype,
  } = useProjects()

  const [prompt, setPrompt] = useState('')
  const [isCopying, setIsCopying] = useState(false)
  const [baseSrsDraftId, setBaseSrsDraftId] = useState('')

  const project = projects.find((project) => project.id === id)
  const { selectedIds: selectedDataEntryIds, setSelectedIds: setSelectedDataEntryIds } =
    useProjectDataSelection(project?.dataEntries)
  const activeSrsDraft = project?.srsDrafts.find((draft) => draft.id === project.activeSrsDraftId)
  const baseSrsDraft =
    project?.srsDrafts.find((draft) => draft.id === baseSrsDraftId) ?? activeSrsDraft ?? null
  const selectedDataEntries =
    project?.dataEntries.filter((entry) => selectedDataEntryIds.includes(entry.id)) ?? []
  const hasAnySrsContent = project?.srsDrafts.some((draft) => hasRichTextContent(draft.content)) ?? false
  const activePrototype = useMemo(
    () =>
      activeSrsDraft
        ? project?.prototypes.find((prototype) => prototype.srsDraftId === activeSrsDraft.id) ?? null
        : null,
    [project, activeSrsDraft]
  )

  useEffect(() => {
    if (project) {
      setCurrentProject(project)
    }
  }, [project, setCurrentProject])

  useEffect(() => {
    if (!project) return

    const selectedExists = project.srsDrafts.some((draft) => draft.id === baseSrsDraftId)
    if (selectedExists) return

    setBaseSrsDraftId(project.activeSrsDraftId ?? project.srsDrafts[0]?.id ?? '')
  }, [project, baseSrsDraftId])

  useEffect(() => {
    setPrompt(activePrototype?.prompt ?? '')
  }, [activePrototype?.id, activePrototype?.prompt])

  useEffect(() => {
    if (!project || !activeSrsDraft) return
    if (prompt === (activePrototype?.prompt ?? '')) return

    const timeout = setTimeout(() => {
      upsertPrototype(project.id, activeSrsDraft.id, prompt)
    }, 500)

    return () => clearTimeout(timeout)
  }, [project, activeSrsDraft, activePrototype?.prompt, prompt, upsertPrototype])

  const handleCreateDraft = useCallback(
    (name: string) => {
      if (project && hasAnySrsContent) {
        createSrsDraft(id, name)
      }
    },
    [createSrsDraft, id, project, hasAnySrsContent]
  )

  const handleSelectDraft = useCallback(
    (draftId: string) => {
      if (project) {
        setActiveSrsDraft(id, draftId)
      }
    },
    [id, project, setActiveSrsDraft]
  )

  const handleGeneratePrompt = useCallback(() => {
    if (!project || !activeSrsDraft || !baseSrsDraft) return

    const srsText = htmlToText(baseSrsDraft.content).trim()
    if (!srsText) return

    const generatedPrompt = buildPrototypePrompt({
      projectName: project.name,
      projectDescription: project.description,
      baseSrsDraftName: baseSrsDraft.name,
      srsText,
      dataEntries: selectedDataEntries,
    })

    setPrompt(generatedPrompt)
    upsertPrototype(project.id, activeSrsDraft.id, generatedPrompt)
  }, [project, activeSrsDraft, baseSrsDraft, upsertPrototype, selectedDataEntries])

  const handleCopy = useCallback(async () => {
    if (!prompt) return

    try {
      setIsCopying(true)
      await navigator.clipboard.writeText(prompt)
    } catch (error) {
      console.error('Error copying prototype prompt:', error)
    } finally {
      setIsCopying(false)
    }
  }, [prompt])

  if (!project) {
    return <ProjectNotFound />
  }

  if (!hasAnySrsContent) {
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
                <LayoutTemplate className="h-5 w-5 text-chart-4" />
                <h1 className="text-xl font-semibold">Prototype</h1>
              </div>
              <p className="text-sm text-muted-foreground">{project.name}</p>
            </div>
          </div>
        </header>

        <div className="flex flex-1 items-center justify-center p-6">
          <div className="max-w-md rounded-lg border bg-muted/20 p-8 text-center">
            <h2 className="text-lg font-semibold">Create SRS before creating Prototype</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              You need at least one SRS draft with content before you can generate a prototype prompt.
            </p>
            <Button className="mt-4" asChild>
              <Link href={`/project/${id}/srs`}>Go to SRS</Link>
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
              <LayoutTemplate className="h-5 w-5 text-chart-4" />
              <h1 className="text-xl font-semibold">Prototype</h1>
            </div>
            <p className="text-sm text-muted-foreground">{project.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">
            {project.prototypes.length} saved
          </Badge>
          <Badge variant="outline">
            Data {selectedDataEntries.length}/{project.dataEntries.length}
          </Badge>
          {baseSrsDraft && (
            <Badge variant="outline" className="border-chart-1 text-chart-1">
              Base: {baseSrsDraft.name}
            </Badge>
          )}
          <Button variant="outline" size="sm" asChild>
            <Link href={`/project/${id}/srs`}>Back to SRS</Link>
          </Button>
        </div>
      </header>

      <main className="flex flex-1 flex-col gap-4 overflow-hidden p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <DraftSelector
            drafts={project.srsDrafts}
            activeDraftId={project.activeSrsDraftId}
            onSelectDraft={handleSelectDraft}
            onCreateDraft={handleCreateDraft}
            onRenameDraft={(draftId, name) => renameSrsDraft(id, draftId, name)}
            onDeleteDraft={(draftId) => deleteSrsDraft(id, draftId)}
            documentType="SRS"
          />

          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={handleGeneratePrompt}
              disabled={!activeSrsDraft || !baseSrsDraft || !baseSrsDraft.content}
            >
              <Sparkles className="mr-2 h-4 w-4" />
              Generate Prototype Prompt
            </Button>
            <Button variant="outline" onClick={handleCopy} disabled={!prompt || isCopying}>
              <Copy className="mr-2 h-4 w-4" />
              {isCopying ? 'Copied' : 'Copy Prompt'}
            </Button>
          </div>
        </div>

        {!activeSrsDraft ? (
          <Card className="flex-1">
            <CardContent className="flex h-full flex-col items-center justify-center gap-4 p-8">
              <LayoutTemplate className="h-12 w-12 text-muted-foreground" />
              <div className="text-center">
                <h2 className="text-lg font-semibold">No SRS Draft Selected</h2>
                <p className="text-sm text-muted-foreground">
                  Create or select an SRS draft first. Each SRS draft can have one saved prototype prompt.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid flex-1 gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Base SRS</CardTitle>
                  <CardDescription>
                    Choose which SRS draft to use as the source for prototype generation.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Select value={baseSrsDraftId} onValueChange={setBaseSrsDraftId}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select base SRS draft" />
                    </SelectTrigger>
                    <SelectContent>
                      {project.srsDrafts.map((draft) => (
                        <SelectItem key={draft.id} value={draft.id}>
                          {draft.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div>
                    <p className="font-medium">{baseSrsDraft?.name ?? 'No base SRS selected'}</p>
                    <p className="text-sm text-muted-foreground">
                      The generated prompt will be saved to the currently active prototype document.
                    </p>
                  </div>
                  <div className="rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
                    {baseSrsDraft?.content
                      ? getRichTextPreview(baseSrsDraft.content, 220)
                      : 'This SRS draft is empty. Generate or write the SRS first.'}
                  </div>
                  <div className="rounded-md border bg-background p-3 text-sm">
                    <span className="font-medium">Saving target:</span>{' '}
                    {activeSrsDraft ? activeSrsDraft.name : 'No active SRS selected'}
                  </div>
                </CardContent>
              </Card>

              <ProjectDataSelector
                entries={project.dataEntries}
                selectedIds={selectedDataEntryIds}
                onChange={setSelectedDataEntryIds}
                title="Project Data for Prototype"
                description="Choose which project data entries should also shape the prototype prompt."
              />
            </div>

            <Card className="flex min-h-0 flex-col">
              <CardHeader>
                <CardTitle className="text-base">Prototype Prompt</CardTitle>
                <CardDescription>
                  Edit freely. Changes are saved to the database for the active SRS draft.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-1 min-h-0">
                <Textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Generate a prototype prompt from the active SRS, or write your own here."
                  rows={24}
                  className="field-sizing-fixed h-[70vh] min-h-[70vh] max-h-[70vh] overflow-y-auto resize-none font-mono text-sm leading-6"
                />
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  )
}
