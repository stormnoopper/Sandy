'use client'

import { useState } from 'react'
import Link from 'next/link'
import { format } from 'date-fns'
import { useSession } from 'next-auth/react'
import type { Project } from '@/lib/types'
import { useProjects } from '@/lib/project-context'
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
import { cn } from '@/lib/utils'
import {
  MoreHorizontal,
  FileText,
  ListChecks,
  Trash2,
  ArrowRight,
  LayoutTemplate,
  Copy,
  Check,
} from 'lucide-react'

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
    updateProject(project.id, { name: editName.trim(), description: editDescription.trim() })
    setEditOpen(false)
  }

  const dataCount = project.dataEntries.length
  const sowCount = project.sowDrafts.length
  const srsCount = project.srsDrafts.length
  const prototypeCount = project.prototypes.length

  // Compute a simple progress indicator
  const hasData = dataCount > 0
  const hasSOW = project.sowDrafts.some((d) => d.content.length > 0)
  const hasSRS = project.srsDrafts.some((d) => d.content.length > 0)
  const hasProto = project.prototypes.some((p) => p.prompt.trim().length > 0)
  const stagesDone = [hasData, hasSOW, hasSRS, hasProto].filter(Boolean).length

  return (
    <>
      <div className="group relative flex h-full flex-col rounded-xl border border-border bg-card p-4 transition-all duration-200 ease-out hover:border-primary/20 hover:shadow-md hover:shadow-primary/5 hover:-translate-y-0.5">
        {/* Top row */}
        <div className="mb-3 flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-sm font-semibold text-foreground leading-snug">
              {project.name}
            </h3>
            {project.description && (
              <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                {project.description}
              </p>
            )}
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0 opacity-0 transition-all duration-200 group-hover:opacity-100"
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
                <span className="sr-only">Project options</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="text-sm">
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
              <DropdownMenuItem onClick={() => setEditOpen(true)}>Edit Details</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => onDelete(project.id)}
              >
                <Trash2 className="mr-2 h-3.5 w-3.5" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Progress dots */}
        <div className="mb-3 flex items-center gap-1.5 flex-wrap">
          {[
            { label: 'Data', done: hasData, count: dataCount, icon: ListChecks },
            { label: 'SOW',  done: hasSOW,  count: sowCount,  icon: FileText },
            { label: 'SRS',  done: hasSRS,  count: srsCount,  icon: FileText },
            { label: 'Proto',done: hasProto,count: prototypeCount, icon: LayoutTemplate },
          ].map(({ label, done, count, icon: Icon }) => (
            <div
              key={label}
              title={`${label}${count > 0 ? `: ${count}` : ''}`}
              className={cn(
                'flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium transition-all duration-200',
                done
                  ? 'bg-primary/12 text-primary ring-1 ring-primary/20'
                  : count > 0
                  ? 'bg-muted text-muted-foreground'
                  : 'bg-muted/40 text-muted-foreground/35'
              )}
            >
              <Icon className="h-2.5 w-2.5" />
              {label}
            </div>
          ))}
          <div className="ml-auto text-[10px] text-muted-foreground/40 tabular-nums">{stagesDone}/4</div>
        </div>

        {/* Bottom row */}
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground/40">
            {format(project.updatedAt, 'MMM d, yyyy')}
          </span>

          <div className="flex items-center gap-0.5">
            {isOwner && (
              <button
                onClick={handleCopyId}
                title="Copy Project ID"
                className="rounded p-1 text-muted-foreground/40 transition-colors duration-150 hover:text-muted-foreground"
              >
                {copied ? <Check className="h-3 w-3 text-primary" /> : <Copy className="h-3 w-3" />}
              </button>
            )}
            <Link
              href={`/project/${project.id}`}
              className="flex items-center gap-0.5 rounded px-1.5 py-0.5 text-xs font-medium text-muted-foreground transition-all duration-150 hover:text-primary"
            >
              Open
              <ArrowRight className="h-3 w-3 transition-transform duration-150 group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </div>

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={handleEditOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Project</DialogTitle>
            <DialogDescription>Update the name and description for this project.</DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <FieldLabel>Project Name</FieldLabel>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Enter project name" />
            </Field>
            <Field>
              <FieldLabel>Description</FieldLabel>
              <Textarea value={editDescription} onChange={(e) => setEditDescription(e.target.value)} placeholder="Describe your project" rows={3} />
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!editName.trim()}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
