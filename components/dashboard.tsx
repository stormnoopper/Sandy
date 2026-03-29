'use client'

import { useState } from 'react'
import { useProjects } from '@/lib/project-context'
import { ProjectCard } from './project-card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { FieldGroup, Field, FieldLabel } from '@/components/ui/field'
import { Empty } from '@/components/ui/empty'
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
import { FolderPlus, FolderKanban, Search, LogIn, Loader2, Crown, Users, AlertCircle } from 'lucide-react'
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
        setJoinAlert({
          type: data.error,
          projectName: data.projectName,
          projectId: trimmedId,
        })
        return
      }
      if (res.status === 404) {
        setJoinAlert({ type: 'NOT_FOUND' })
        return
      }
      if (!res.ok) {
        toast.error(data.message ?? 'Failed to join project.')
        return
      }
      toast.success('Joined project successfully!')
      setJoinId('')
      setJoinOpen(false)
      setJoinAlert(null)
      refreshProjects()
    } catch {
      toast.error('Something went wrong. Please try again.')
    } finally {
      setIsJoining(false)
    }
  }

  function handleJoinDialogClose(open: boolean) {
    setJoinOpen(open)
    if (!open) {
      setJoinId('')
      setJoinAlert(null)
    }
  }

  const filteredProjects = projects.filter(
    (project) =>
      project.name.toLowerCase().includes(search.toLowerCase()) ||
      project.description.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="flex-1 p-6">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
          <p className="mt-2 text-muted-foreground">
            Manage your projects and documentation with AI assistance
          </p>
        </header>

        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search projects..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="flex gap-2">
            {/* Join by ID */}
            <Dialog open={joinOpen} onOpenChange={handleJoinDialogClose}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <LogIn className="h-4 w-4" />
                  Join Project
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Join a Project</DialogTitle>
                  <DialogDescription>
                    Enter the Project ID shared by the project owner.
                  </DialogDescription>
                </DialogHeader>

                <Field>
                  <FieldLabel>Project ID</FieldLabel>
                  <Input
                    placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                    value={joinId}
                    onChange={(e) => {
                      setJoinId(e.target.value)
                      setJoinAlert(null)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && joinId.trim() && !isJoining) {
                        void handleJoinProject()
                      }
                    }}
                  />
                </Field>

                {joinAlert && (
                  <div
                    className={`flex items-start gap-3 rounded-lg border p-3 text-sm ${
                      joinAlert.type === 'NOT_FOUND'
                        ? 'border-destructive/30 bg-destructive/10 text-destructive'
                        : 'border-chart-4/30 bg-chart-4/10 text-foreground'
                    }`}
                  >
                    {joinAlert.type === 'NOT_FOUND' ? (
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                    ) : joinAlert.type === 'ALREADY_OWNER' ? (
                      <Crown className="mt-0.5 h-4 w-4 shrink-0 text-chart-4" />
                    ) : (
                      <Users className="mt-0.5 h-4 w-4 shrink-0 text-chart-4" />
                    )}
                    <div>
                      {joinAlert.type === 'NOT_FOUND' && (
                        <p className="font-medium">Project not found</p>
                      )}
                      {joinAlert.type === 'ALREADY_OWNER' && (
                        <>
                          <p className="font-medium">You own this project</p>
                          {joinAlert.projectName && (
                            <p className="mt-0.5 text-muted-foreground">
                              &ldquo;{joinAlert.projectName}&rdquo; is already in your dashboard.
                            </p>
                          )}
                        </>
                      )}
                      {joinAlert.type === 'ALREADY_MEMBER' && (
                        <>
                          <p className="font-medium">Already a member</p>
                          {joinAlert.projectName && (
                            <p className="mt-0.5 text-muted-foreground">
                              You already have access to &ldquo;{joinAlert.projectName}&rdquo;.
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                )}

                <DialogFooter>
                  <Button variant="outline" onClick={() => handleJoinDialogClose(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleJoinProject}
                    disabled={!joinId.trim() || isJoining}
                  >
                    {isJoining ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Joining...
                      </>
                    ) : (
                      'Join'
                    )}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Create new project */}
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <FolderPlus className="h-4 w-4" />
                  New Project
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Project</DialogTitle>
                  <DialogDescription>
                    Add a new project to start managing your documentation.
                  </DialogDescription>
                </DialogHeader>
                <FieldGroup>
                  <Field>
                    <FieldLabel>Project Name</FieldLabel>
                    <Input
                      placeholder="Enter project name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </Field>
                  <Field>
                    <FieldLabel>Description</FieldLabel>
                    <Textarea
                      placeholder="Describe your project"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={3}
                    />
                  </Field>
                </FieldGroup>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setCreateOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateProject} disabled={!name.trim()}>
                    Create Project
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {projects.length === 0 ? (
          <Empty
            icon={FolderKanban}
            title="No projects yet"
            description="Create your first project or join one with a Project ID."
            action={
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setJoinOpen(true)} className="gap-2">
                  <LogIn className="h-4 w-4" />
                  Join Project
                </Button>
                <Button onClick={() => setCreateOpen(true)} className="gap-2">
                  <FolderPlus className="h-4 w-4" />
                  Create Your First Project
                </Button>
              </div>
            }
          />
        ) : filteredProjects.length === 0 ? (
          <Empty
            icon={Search}
            title="No matching projects"
            description="Try adjusting your search terms."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredProjects.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onDelete={setDeleteId}
              />
            ))}
          </div>
        )}
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Project</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this project? This action cannot be undone
              and will remove all associated data, SOW, and SRS documents.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteId) {
                  deleteProject(deleteId)
                  setDeleteId(null)
                }
              }}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
