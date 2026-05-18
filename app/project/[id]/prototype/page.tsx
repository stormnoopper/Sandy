'use client'

import { use, useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { DraftSelector } from '@/components/draft-selector'
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
import { Spinner } from '@/components/ui/spinner'
import { useProjects } from '@/lib/project-context'
import { getRichTextPreview, hasRichTextContent, htmlToText } from '@/lib/rich-text'
import {
  buildPrototypePrompt,
  PROTOTYPE_BUILD_TARGET_OPTIONS,
} from '@/prompts/prototype'
import { ArrowLeft, Copy, LayoutTemplate, Sparkles } from 'lucide-react'
import { toast } from '@/hooks/use-toast'

interface PrototypePageProps {
  params: Promise<{ id: string }>
}

export default function PrototypePage({ params }: PrototypePageProps) {
  const { id } = use(params)
  const {
    projects,
    isHydrated,
    setCurrentProject,
    createSrsDraft,
    deleteSrsDraft,
    renameSrsDraft,
    setActiveSrsDraft,
    upsertPrototype,
  } = useProjects()

  const [prompt, setPrompt] = useState('')
  const [isCopying, setIsCopying] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [prototypeBuildTarget, setPrototypeBuildTarget] = useState<string>('Cursor')

  const project = projects.find((project) => project.id === id)
  const activeSrsDraft = project?.srsDrafts.find((draft) => draft.id === project.activeSrsDraftId)
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

  const handleGeneratePrompt = useCallback(async () => {
    if (!project || !activeSrsDraft) return

    const srsText = htmlToText(activeSrsDraft.content).trim()
    if (!srsText) return

    const metaPrompt = buildPrototypePrompt({
      projectName: project.name,
      projectDescription: project.description,
      baseSrsDraftName: activeSrsDraft.name,
      srsText,
      buildTarget: prototypeBuildTarget,
    })

    setIsGenerating(true)
    setPrompt('')

    try {
      const response = await fetch('/api/generate-prototype', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: metaPrompt }),
      })

      if (!response.ok) {
        const responseBody = await response.text()
        let message = 'Failed to generate prompt'
        try {
          const json = JSON.parse(responseBody)
          if (json.error) message = json.error
        } catch {
          if (responseBody) message = responseBody
        }
        throw new Error(message)
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error('No response stream')

      const decoder = new TextDecoder()
      let streamed = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        streamed += decoder.decode(value, { stream: true })
        setPrompt(streamed)
      }

      upsertPrototype(project.id, activeSrsDraft.id, streamed)
    } catch (error) {
      console.error('Error generating prototype prompt:', error)
      toast({
        title: 'Generation failed',
        description: error instanceof Error ? error.message : 'Something went wrong',
        variant: 'destructive',
      })
      setPrompt(activePrototype?.prompt ?? '')
    } finally {
      setIsGenerating(false)
    }
  }, [
    project,
    activeSrsDraft,
    upsertPrototype,
    prototypeBuildTarget,
    activePrototype?.prompt,
  ])

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
          <Button variant="outline" size="sm" asChild>
            <Link href={`/project/${id}/srs`}>Back to SRS</Link>
          </Button>
        </div>
      </header>

      <main className="flex flex-1 flex-col gap-4 overflow-y-auto p-6">
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
            <div className="flex items-center gap-2">
              <span className="shrink-0 text-xs font-medium text-muted-foreground">Build for</span>
              <Select value={prototypeBuildTarget} onValueChange={setPrototypeBuildTarget}>
                <SelectTrigger className="h-9 w-[min(100%,12rem)] sm:w-[15rem]">
                  <SelectValue placeholder="Select AI Tool" />
                </SelectTrigger>
                <SelectContent>
                  {PROTOTYPE_BUILD_TARGET_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              className="min-w-[min(100%,16rem)] px-6 sm:min-w-[17.5rem] sm:px-8"
              onClick={handleGeneratePrompt}
              disabled={isGenerating || !activeSrsDraft || !activeSrsDraft.content}
            >
              {isGenerating ? (
                <Spinner className="mr-2 h-4 w-4" />
              ) : (
                <Sparkles className="mr-2 h-4 w-4" />
              )}
              {isGenerating ? 'Generating...' : 'Generate Prototype Prompt'}
            </Button>
            <Button
              variant="outline"
              className="min-w-[min(100%,10rem)] px-6 sm:min-w-[11.5rem] sm:px-8"
              onClick={handleCopy}
              disabled={!prompt || isCopying}
            >
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
          <div className="flex flex-1 flex-col">
            <Card className="flex min-h-0 flex-col flex-1">
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
