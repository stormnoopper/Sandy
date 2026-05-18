'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import { useProjects } from '@/lib/project-context'
import { cn } from '@/lib/utils'
import {
  FolderKanban,
  LayoutDashboard,
  LogOut,
  BookOpen,
} from 'lucide-react'

export function TopNav() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const { projects } = useProjects()

  return (
    <header className="sticky top-0 z-40 flex h-16 w-full items-center justify-between border-b border-border bg-background/95 px-6 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center gap-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary">
            <img src="/loading.gif" alt="Sandy Logo" className="h-7 w-7 object-contain" />
          </div>
          <span className="text-lg font-semibold tracking-tight">Sandy</span>
        </Link>

        {/* Navigation Links */}
        <nav className="hidden items-center gap-1 sm:flex">
          <Link
            href="/"
            className={cn(
              'flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
              pathname === '/'
                ? 'bg-muted font-medium text-foreground'
                : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
            )}
          >
            <LayoutDashboard className="h-4 w-4" />
            Dashboard
          </Link>
          <Link
            href="/how-to"
            className={cn(
              'flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
              pathname === '/how-to'
                ? 'bg-muted font-medium text-foreground'
                : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
            )}
          >
            <BookOpen className="h-4 w-4" />
            How to Use
          </Link>
        </nav>
      </div>

      <div className="flex items-center gap-4">
        {/* Mobile Navigation (Icons Only) */}
        <nav className="flex items-center gap-1 sm:hidden">
          <Link
            href="/"
            className={cn(
              'flex items-center justify-center rounded-md p-2 transition-colors',
              pathname === '/'
                ? 'bg-muted text-foreground'
                : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
            )}
          >
            <LayoutDashboard className="h-5 w-5" />
          </Link>
          <Link
            href="/how-to"
            className={cn(
              'flex items-center justify-center rounded-md p-2 transition-colors',
              pathname === '/how-to'
                ? 'bg-muted text-foreground'
                : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
            )}
          >
            <BookOpen className="h-5 w-5" />
          </Link>
        </nav>

        {/* Divider */}
        <div className="hidden h-6 w-px bg-border sm:block" />

        {/* User Info & Logout */}
        <div className="flex items-center gap-3">
          <div className="hidden flex-col items-end sm:flex">
            <span className="text-sm font-medium leading-none">
              {session?.user?.name ?? 'User'}
            </span>
            <span className="text-xs text-muted-foreground">
              {projects.length} project{projects.length !== 1 ? 's' : ''}
            </span>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: '/' })}
            className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            title="Logout"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  )
}
