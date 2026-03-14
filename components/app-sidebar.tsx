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
  FolderKanban,
  ChevronRight,
  ChevronLeft,
  LogOut,
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
  // Delay mounting content until after first render so the CSS transition plays
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(NAV_HIDDEN_KEY)
    if (stored === 'true') setHidden(true)
    // Small delay so the initial state doesn't flash into a transition
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
          // Only animate after first paint so there's no flash on load
          mounted && 'transition-[width] duration-300 ease-in-out',
          hidden ? 'w-0 border-r-0' : 'w-64'
        )}
      >
        {/* Inner wrapper keeps content full-width so it slides cleanly */}
        <div className="flex h-full w-64 flex-col">
          {/* Header — no toggle button here anymore */}
          <div className="flex h-16 items-center gap-2 border-b border-sidebar-border px-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <FolderKanban className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="text-lg font-semibold text-sidebar-foreground">Sandy</span>
            </div>
          </div>

          {/* Nav */}
          <nav className="flex-1 p-4">
            <div className="space-y-1">
              <Link
                href="/"
                className={cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  pathname === '/'
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                )}
              >
                <LayoutDashboard className="h-4 w-4" />
                Dashboard
              </Link>
            </div>

            <div className="mt-6">
              <div className="flex items-center justify-between px-3 py-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Projects
                </span>
                <Dialog open={open} onOpenChange={setOpen}>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-6 w-6">
                      <FolderPlus className="h-4 w-4" />
                      <span className="sr-only">Create project</span>
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

              <ScrollArea className="h-[calc(100vh-280px)]">
                <div className="space-y-1">
                  {projects.length === 0 ? (
                    <p className="px-3 py-2 text-sm text-muted-foreground">No projects yet</p>
                  ) : (
                    projects.map((project) => (
                      <Link
                        key={project.id}
                        href={`/project/${project.id}`}
                        className={cn(
                          'flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors',
                          pathname === `/project/${project.id}`
                            ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                            : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                        )}
                      >
                        <span className="truncate">{project.name}</span>
                        <ChevronRight className="h-4 w-4 opacity-50" />
                      </Link>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
          </nav>

          {/* Footer */}
          <div className="border-t border-sidebar-border p-4">
            {session?.user && (
              <div className="mb-3 space-y-1">
                <p className="truncate text-sm font-medium text-sidebar-foreground">
                  {session.user.name ?? 'Signed in'}
                </p>
              </div>
            )}

            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-muted-foreground">
                {projects.length} project{projects.length !== 1 ? 's' : ''}
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => signOut({ callbackUrl: '/' })}
                className="h-8"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Right-edge toggle tab — always in the DOM, flips direction ── */}
      <button
        onClick={toggleNav}
        aria-label={hidden ? 'Show navigation' : 'Hide navigation'}
        className={cn(
          'fixed top-1/2 z-50 flex h-14 w-5 -translate-y-1/2 items-center justify-center',
          'rounded-r-lg border border-l-0 border-border bg-sidebar shadow-sm',
          'transition-all duration-300 ease-in-out hover:bg-sidebar-accent hover:w-6',
          // Follows the sidebar edge: 256px when open, 0 when hidden
          hidden ? 'left-0' : 'left-64'
        )}
      >
        {hidden
          ? <ChevronRight className="h-3 w-3 text-muted-foreground" />
          : <ChevronLeft className="h-3 w-3 text-muted-foreground" />}
      </button>
    </>
  )
}
