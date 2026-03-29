'use client'

import { useState } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { useSession } from 'next-auth/react'
import type { Project } from '@/lib/types'
import { useProjects } from '@/lib/project-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { FieldGroup, Field, FieldLabel } from '@/components/ui/field'
import { MoreHorizontal, FileText, ListChecks, Trash2, ArrowRight, LayoutTemplate, Copy, Check } from 'lucide-react'

interface ProjectCardProps {
  project: Project
  onDelete: (id: string) => void
}

export function ProjectCard({ project, onDelete }: ProjectCardProps) {
  const { updateProject } = useProjects()
  const { data: session } = useSession()
  const userId = (session?.user as any)?.id as string | undefined
  const isOwner = userId === project.ownerId
  const [editOpen, setEditOpen] = useState(false)
  const [editName, setEditName] = useState(project.name)
  const [editDescription, setEditDescription] = useState(project.description)
  const [copied, setCopied] = useState(false)

  function handleCopyId() {
    void navigator.clipboard.writeText(project.id).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const handleEditOpenChange = (open: boolean) => {
    setEditOpen(open)
    if (open) {
      setEditName(project.name)
      setEditDescription(project.description)
    }
  }

  const handleSave = () => {
    if (!editName.trim()) return
    updateProject(project.id, {
      name: editName.trim(),
      description: editDescription.trim(),
    })
    setEditOpen(false)
  }

  const dataCount = project.dataEntries.length
  const sowCount = project.sowDrafts.length
  const srsCount = project.srsDrafts.length
  const prototypeCount = project.prototypes.length
  const hasSOW = project.sowDrafts.some((d) => d.content.length > 0)
  const hasSRS = project.srsDrafts.some((d) => d.content.length > 0)
  const hasPrototype = project.prototypes.some((prototype) => prototype.prompt.trim().length > 0)

  return (
    <Card className="group transition-shadow hover:shadow-md">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="flex-1 space-y-1">
          <CardTitle className="line-clamp-1 text-lg">{project.name}</CardTitle>
          <CardDescription className="line-clamp-2">
            {project.description || 'No description provided'}
          </CardDescription>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100"
            >
              <MoreHorizontal className="h-4 w-4" />
              <span className="sr-only">Project options</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={`/project/${project.id}`}>Open Project</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/project/${project.id}/sow`}>Edit SOW</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/project/${project.id}/srs`}>Edit SRS</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/project/${project.id}/prototype`}>Open Prototype</Link>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setEditOpen(true)}>
              Edit Details
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => onDelete(project.id)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Project
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary" className="gap-1">
            <ListChecks className="h-3 w-3" />
            {dataCount} {dataCount === 1 ? 'entry' : 'entries'}
          </Badge>
          {sowCount > 0 && (
            <Badge variant="outline" className={hasSOW ? "gap-1 border-chart-2 text-chart-2" : "gap-1"}>
              <FileText className="h-3 w-3" />
              {sowCount} SOW {sowCount === 1 ? 'draft' : 'drafts'}
            </Badge>
          )}
          {srsCount > 0 && (
            <Badge variant="outline" className={hasSRS ? "gap-1 border-chart-1 text-chart-1" : "gap-1"}>
              <FileText className="h-3 w-3" />
              {srsCount} SRS {srsCount === 1 ? 'draft' : 'drafts'}
            </Badge>
          )}
          {prototypeCount > 0 && (
            <Badge
              variant="outline"
              className={hasPrototype ? 'gap-1 border-chart-4 text-chart-4' : 'gap-1'}
            >
              <LayoutTemplate className="h-3 w-3" />
              {prototypeCount} prototype{prototypeCount === 1 ? '' : 's'}
            </Badge>
          )}
        </div>

        <div className="mt-4 flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            Updated {format(project.updatedAt, 'MMM d, yyyy')}
          </span>
          <div className="flex items-center gap-1">
            {isOwner && (
              <Button
                variant="ghost"
                size="sm"
                className="gap-1 text-xs text-muted-foreground"
                onClick={handleCopyId}
                title="Copy project ID to share"
              >
                {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                {copied ? 'Copied' : 'Share ID'}
              </Button>
            )}
            <Button variant="ghost" size="sm" asChild className="gap-1">
              <Link href={`/project/${project.id}`}>
                Open
                <ArrowRight className="h-3 w-3" />
              </Link>
            </Button>
          </div>
        </div>
      </CardContent>
      <Dialog open={editOpen} onOpenChange={handleEditOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
            <DialogDescription>
              Update the name and description for this project.
            </DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <FieldLabel>Project Name</FieldLabel>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Enter project name"
              />
            </Field>
            <Field>
              <FieldLabel>Description</FieldLabel>
              <Textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Describe your project"
                rows={3}
              />
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!editName.trim()}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
