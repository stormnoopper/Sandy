'use client'

import { use, useEffect } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { ProjectNotFound } from '@/components/project-not-found'
import { useProjects } from '@/lib/project-context'
import { getRichTextPreview, hasRichTextContent } from '@/lib/rich-text'
import { DataEntryList } from '@/components/data-entry-list'
import { WorkflowDiagram } from '@/components/workflow-diagram'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, FileText, FileCode, Sparkles, LayoutTemplate } from 'lucide-react'

interface ProjectPageProps {
  params: Promise<{ id: string }>
}

export default function ProjectPage({ params }: ProjectPageProps) {
  const { id } = use(params)
  const { projects, setCurrentProject } = useProjects()
  
  const project = projects.find((p) => p.id === id)

  useEffect(() => {
    if (project) {
      setCurrentProject(project)
    }
  }, [project, setCurrentProject])

  if (!project) {
    return <ProjectNotFound />
  }

  const activeSowDraft = project.sowDrafts.find((d) => d.id === project.activeSowDraftId)
  const activeSrsDraft = project.srsDrafts.find((d) => d.id === project.activeSrsDraftId)
  const hasProjectData = project.dataEntries.length > 0
  const hasActiveSow = hasRichTextContent(activeSowDraft?.content)
  const hasAnySrs = project.srsDrafts.some((draft) => hasRichTextContent(draft.content))
  const activePrototype = activeSrsDraft
    ? project.prototypes.find((prototype) => prototype.srsDraftId === activeSrsDraft.id)
    : null

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/">
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Back to dashboard</span>
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{project.name}</h1>
            <p className="text-sm text-muted-foreground">
              Created {format(project.createdAt, 'MMMM d, yyyy')}
            </p>
          </div>
        </div>

        {project.description && (
          <Card className="mb-6">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Description
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p>{project.description}</p>
            </CardContent>
          </Card>
        )}

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-chart-4" />
              Document Workflow
            </CardTitle>
            <CardDescription>
              Add project data, generate SOW with AI, then create your SRS document
            </CardDescription>
          </CardHeader>
          <CardContent>
            <WorkflowDiagram project={project} />
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <DataEntryList projectId={project.id} entries={project.dataEntries} />
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <FileText className="h-5 w-5" />
                  Statement of Work
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      {project.sowDrafts.length} {project.sowDrafts.length === 1 ? 'draft' : 'drafts'}
                    </Badge>
                    {activeSowDraft && activeSowDraft.content && (
                      <Badge variant="outline" className="border-chart-2 text-chart-2">
                        Active: {activeSowDraft.name}
                      </Badge>
                    )}
                  </div>
                  {hasRichTextContent(activeSowDraft?.content) ? (
                    <p className="line-clamp-3 text-sm text-muted-foreground">
                      {getRichTextPreview(activeSowDraft?.content)}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No SOW created yet. Add data entries and use AI to generate.
                    </p>
                  )}
                  {hasProjectData ? (
                    <Button asChild className="w-full gap-2">
                      <Link href={`/project/${project.id}/sow`}>
                        <Sparkles className="h-4 w-4" />
                        {project.sowDrafts.length > 0 ? 'Edit SOW' : 'Create SOW'}
                      </Link>
                    </Button>
                  ) : (
                    <Button className="w-full gap-2" disabled>
                      <Sparkles className="h-4 w-4" />
                      Add Project Data First
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <FileCode className="h-5 w-5" />
                  System Requirements
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">
                      {project.srsDrafts.length} {project.srsDrafts.length === 1 ? 'draft' : 'drafts'}
                    </Badge>
                    {activeSrsDraft && activeSrsDraft.content && (
                      <Badge variant="outline" className="border-chart-1 text-chart-1">
                        Active: {activeSrsDraft.name}
                      </Badge>
                    )}
                  </div>
                  {hasRichTextContent(activeSrsDraft?.content) ? (
                    <p className="line-clamp-3 text-sm text-muted-foreground">
                      {getRichTextPreview(activeSrsDraft?.content)}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No SRS created yet. Generate or write your system requirements.
                    </p>
                  )}
                  {hasActiveSow ? (
                    <Button asChild variant="outline" className="w-full gap-2">
                      <Link href={`/project/${project.id}/srs`}>
                        <Sparkles className="h-4 w-4" />
                        {project.srsDrafts.length > 0 ? 'Edit SRS' : 'Create SRS'}
                      </Link>
                    </Button>
                  ) : (
                    <Button variant="outline" className="w-full gap-2" disabled>
                      <Sparkles className="h-4 w-4" />
                      Create SOW First
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <LayoutTemplate className="h-5 w-5" />
                  Prototype
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{project.prototypes.length} saved</Badge>
                    {activePrototype?.prompt && (
                      <Badge variant="outline" className="border-chart-4 text-chart-4">
                        Linked to active SRS
                      </Badge>
                    )}
                  </div>
                  {activePrototype?.prompt ? (
                    <p className="line-clamp-3 text-sm text-muted-foreground">
                      {activePrototype.prompt.substring(0, 150)}...
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Build a prototype prompt from your active SRS and continue your workflow.
                    </p>
                  )}
                  {hasAnySrs ? (
                    <Button asChild variant="outline" className="w-full gap-2">
                      <Link href={`/project/${project.id}/prototype`}>
                        <LayoutTemplate className="h-4 w-4" />
                        {project.prototypes.length > 0 ? 'Open Prototype' : 'Create Prototype'}
                      </Link>
                    </Button>
                  ) : (
                    <Button variant="outline" className="w-full gap-2" disabled>
                      <LayoutTemplate className="h-4 w-4" />
                      Create SRS First
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
