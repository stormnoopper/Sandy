'use client'

import { useState } from 'react'
import { useProjects } from '@/lib/project-context'
import { ProjectCard } from './project-card'
import { TopNav } from './top-nav'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { FieldGroup, Field, FieldLabel } from '@/components/ui/field'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { FolderPlus, FolderKanban, Search, LogIn, Loader2, Crown, Users, AlertCircle, Plus } from 'lucide-react'
import { toast } from 'sonner'

export function Dashboard() {
  const { projects, createProject, deleteProject, refreshProjects } = useProjects()

  const [createOpen, setCreateOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [search, setSearch] = useState('')
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const [joinOpen, setJoinOpen] = useState(false)
  const [joinId, setJoinId] = useState('')
  const [isJoining, setIsJoining] = useState(false)
  const [joinAlert, setJoinAlert] = useState<{
    type: 'ALREADY_OWNER' | 'ALREADY_MEMBER' | 'NOT_FOUND'
    projectName?: string
    projectId?: string
  } | null>(null)

  const handleCreateProject = () => {
    if (name.trim()) {
      createProject(name.trim(), description.trim())
      setName('')
      setDescription('')
      setCreateOpen(false)
    }
  }

  async function handleJoinProject() {
    const trimmedId = joinId.trim()
    if (!trimmedId) return
    setIsJoining(true)
    setJoinAlert(null)
    try {
      const res = await fetch('/api/projects/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: trimmedId }),
      })
      const data = await res.json()
      if (res.status === 409) {
        setJoinAlert({ type: data.error, projectName: data.projectName, projectId: trimmedId })
        return
      }
      if (res.status === 404) { setJoinAlert({ type: 'NOT_FOUND' }); return }
      if (!res.ok) { toast.error(data.message ?? 'Failed to join project.'); return }
      toast.success('Joined project successfully!')
      setJoinId(''); setJoinOpen(false); setJoinAlert(null); refreshProjects()
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setIsJoining(false)
    }
  }

  function handleJoinDialogClose(open: boolean) {
    setJoinOpen(open)
    if (!open) { setJoinId(''); setJoinAlert(null) }
  }

  const filteredProjects = projects.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.description.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <TopNav />
      <div className="flex-1 overflow-auto">
        <div className="mx-auto max-w-5xl px-8 py-8">

          {/* Header row */}
        <div className="mb-8 flex items-center justify-between animate-fade-in-up">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">Projects</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {projects.length === 0
                ? 'No projects yet'
                : `${projects.length} project${projects.length !== 1 ? 's' : ''}`}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Join */}
            <Dialog open={joinOpen} onOpenChange={handleJoinDialogClose}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground">
                  <LogIn className="h-3.5 w-3.5" />
                  Join
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Join a Project</DialogTitle>
                  <DialogDescription>Enter the Project ID shared by the project owner.</DialogDescription>
                </DialogHeader>
                <Field>
                  <FieldLabel>Project ID</FieldLabel>
                  <Input
                    placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                    value={joinId}
                    onChange={(e) => { setJoinId(e.target.value); setJoinAlert(null) }}
                    onKeyDown={(e) => { if (e.key === 'Enter' && joinId.trim() && !isJoining) void handleJoinProject() }}
                  />
                </Field>
                {joinAlert && (
                  <div className={`flex items-start gap-3 rounded-lg border p-3 text-sm ${
                    joinAlert.type === 'NOT_FOUND'
                      ? 'border-destructive/30 bg-destructive/10 text-destructive'
                      : 'border-border bg-muted/50 text-foreground'
                  }`}>
                    {joinAlert.type === 'NOT_FOUND' ? (
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                    ) : joinAlert.type === 'ALREADY_OWNER' ? (
                      <Crown className="mt-0.5 h-4 w-4 shrink-0" />
                    ) : (
                      <Users className="mt-0.5 h-4 w-4 shrink-0" />
                    )}
                    <div>
                      {joinAlert.type === 'NOT_FOUND' && <p className="font-medium">Project not found</p>}
                      {joinAlert.type === 'ALREADY_OWNER' && (
                        <>
                          <p className="font-medium">You own this project</p>
                          {joinAlert.projectName && <p className="mt-0.5 text-muted-foreground">&ldquo;{joinAlert.projectName}&rdquo; is already in your dashboard.</p>}
                        </>
                      )}
                      {joinAlert.type === 'ALREADY_MEMBER' && (
                        <>
                          <p className="font-medium">Already a member</p>
                          {joinAlert.projectName && <p className="mt-0.5 text-muted-foreground">You already have access to &ldquo;{joinAlert.projectName}&rdquo;.</p>}
                        </>
                      )}
                    </div>
                  </div>
                )}
                <DialogFooter>
                  <Button variant="outline" onClick={() => handleJoinDialogClose(false)}>Cancel</Button>
                  <Button onClick={handleJoinProject} disabled={!joinId.trim() || isJoining}>
                    {isJoining ? <><Loader2 className="h-4 w-4 animate-spin" />Joining...</> : 'Join'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* New project */}
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-1.5">
                  <Plus className="h-3.5 w-3.5" />
                  New Project
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Project</DialogTitle>
                  <DialogDescription>Add a new project to start managing your documentation.</DialogDescription>
                </DialogHeader>
                <FieldGroup>
                  <Field>
                    <FieldLabel>Project Name</FieldLabel>
                    <Input placeholder="Enter project name" value={name} onChange={(e) => setName(e.target.value)} />
                  </Field>
                  <Field>
                    <FieldLabel>Description</FieldLabel>
                    <Textarea placeholder="Describe your project" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
                  </Field>
                </FieldGroup>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
                  <Button onClick={handleCreateProject} disabled={!name.trim()}>Create Project</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Search */}
        {projects.length > 0 && (
          <div className="relative mb-6 max-w-xs animate-fade-in-up stagger-2">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/60" />
            <Input
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 pl-8 text-sm transition-smooth focus:ring-2 focus:ring-primary/20"
            />
          </div>
        )}

        {/* Content */}
        {projects.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-24 text-center animate-fade-in-up stagger-3">
            <div
              className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-muted/40"
              style={{ animation: 'float 3s ease-in-out infinite' }}
            >
              <FolderKanban className="h-6 w-6 text-muted-foreground/50" />
            </div>
            <h2 className="mb-1.5 text-sm font-semibold text-foreground">No projects yet</h2>
            <p className="mb-6 max-w-xs text-xs leading-relaxed text-muted-foreground">
              Create your first project or join an existing one with a Project ID.
            </p>
            <div className="flex gap-2 animate-bounce-in stagger-4">
              <Button variant="outline" size="sm" onClick={() => setJoinOpen(true)} className="gap-1.5 transition-smooth hover:shadow-sm">
                <LogIn className="h-3.5 w-3.5" />
                Join Project
              </Button>
              <Button size="sm" onClick={() => setCreateOpen(true)} className="gap-1.5 transition-smooth hover:shadow-sm hover:shadow-primary/20">
                <FolderPlus className="h-3.5 w-3.5" />
                New Project
              </Button>
            </div>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-in-up">
            <Search className="mb-3 h-5 w-5 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">No projects match &ldquo;{search}&rdquo;</p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filteredProjects.map((project, i) => (
              <div
                key={project.id}
                className="animate-fade-in-up"
                style={{ animationDelay: `${i * 0.06 + 0.1}s` }}
              >
                <ProjectCard project={project} onDelete={setDeleteId} />
              </div>
            ))}
          </div>
        )}
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure? This will permanently remove all associated data, SOW, and SRS documents.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { if (deleteId) { deleteProject(deleteId); setDeleteId(null) } }}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
    </div>
  )
}
