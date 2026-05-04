'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import { cn } from '@/lib/utils'
import { useProjects } from '@/lib/project-context'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { FieldGroup, Field, FieldLabel } from '@/components/ui/field'
import {
  FolderPlus,
  LayoutDashboard,
  ChevronRight,
  ChevronLeft,
  LogOut,
  BookOpen,
  FolderKanban,
} from 'lucide-react'

const NAV_HIDDEN_KEY = 'sandy-nav-hidden'

export function AppSidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const { projects, createProject } = useProjects()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [hidden, setHidden] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(NAV_HIDDEN_KEY)
    if (stored === 'true') setHidden(true)
    requestAnimationFrame(() => setMounted(true))
  }, [])

  const toggleNav = () => {
    setHidden((prev) => {
      const next = !prev
      localStorage.setItem(NAV_HIDDEN_KEY, String(next))
      return next
    })
  }

  const handleCreateProject = () => {
    if (name.trim()) {
      createProject(name.trim(), description.trim())
      setName('')
      setDescription('')
      setOpen(false)
    }
  }

  return (
    <>
      {/* ── Sidebar ── */}
      <aside
        className={cn(
          'relative flex h-screen shrink-0 flex-col border-r border-border bg-sidebar overflow-hidden',
          mounted && 'transition-[width] duration-300 ease-in-out',
          hidden ? 'w-0 border-r-0' : 'w-56'
        )}
      >
        <div className="flex h-full w-56 flex-col">
          {/* Logo */}
          <div className="flex h-14 items-center gap-2 px-4">
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
              <FolderKanban className="h-3.5 w-3.5 text-primary-foreground" />
            </div>
            <span className="text-sm font-semibold tracking-tight text-sidebar-foreground">Sandy</span>
          </div>

          {/* Nav */}
          <nav className="flex-1 px-3 py-2">
            {/* Main links */}
            <div className="space-y-0.5">
              <Link
                href="/"
                className={cn(
                  'flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors',
                  pathname === '/'
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                    : 'text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground'
                )}
              >
                <LayoutDashboard className="h-3.5 w-3.5" />
                Dashboard
              </Link>
              <Link
                href="/how-to"
                className={cn(
                  'flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-sm transition-colors',
                  pathname === '/how-to'
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                    : 'text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground'
                )}
              >
                <BookOpen className="h-3.5 w-3.5" />
                How to Use
              </Link>
            </div>

            {/* Projects section */}
            <div className="mt-6">
              <div className="flex items-center justify-between px-2.5 mb-1">
                <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                  Projects
                </span>
                <Dialog open={open} onOpenChange={setOpen}>
                  <DialogTrigger asChild>
                    <button className="text-muted-foreground/60 hover:text-muted-foreground transition-colors">
                      <FolderPlus className="h-3.5 w-3.5" />
                      <span className="sr-only">Create project</span>
                    </button>
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
                      <Button variant="outline" onClick={() => setOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleCreateProject} disabled={!name.trim()}>
                        Create Project
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>

              <ScrollArea className="h-[calc(100vh-260px)]">
                <div className="space-y-0.5">
                  {projects.length === 0 ? (
                    <p className="px-2.5 py-1.5 text-xs text-muted-foreground/50">No projects yet</p>
                  ) : (
                    projects.map((project) => (
                      <Link
                        key={project.id}
                        href={`/project/${project.id}`}
                        className={cn(
                          'flex items-center justify-between rounded-md px-2.5 py-1.5 text-sm transition-colors',
                          pathname.startsWith(`/project/${project.id}`)
                            ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                            : 'text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground'
                        )}
                      >
                        <span className="truncate">{project.name}</span>
                        <ChevronRight className="h-3 w-3 shrink-0 opacity-40" />
                      </Link>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
          </nav>

          {/* Footer */}
          <div className="border-t border-sidebar-border px-3 py-3">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-sidebar-foreground">
                  {session?.user?.name ?? 'User'}
                </p>
                <p className="text-[10px] text-muted-foreground/60">
                  {projects.length} project{projects.length !== 1 ? 's' : ''}
                </p>
              </div>
              <button
                onClick={() => signOut({ callbackUrl: '/' })}
                className="text-muted-foreground/50 hover:text-muted-foreground transition-colors p-1"
                title="Logout"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Toggle tab ── */}
      <button
        onClick={toggleNav}
        aria-label={hidden ? 'Show navigation' : 'Hide navigation'}
        className={cn(
          'fixed top-1/2 z-50 flex h-12 w-4 -translate-y-1/2 items-center justify-center',
          'rounded-r-md border border-l-0 border-border bg-sidebar',
          'transition-all duration-300 ease-in-out hover:w-5',
          hidden ? 'left-0' : 'left-56'
        )}
      >
        {hidden
          ? <ChevronRight className="h-2.5 w-2.5 text-muted-foreground" />
          : <ChevronLeft className="h-2.5 w-2.5 text-muted-foreground" />}
      </button>
    </>
  )
}
