'use client'

import { ProjectProvider } from '@/lib/project-context'
import { TopNav } from '@/components/top-nav'

export function ProjectLayoutClient({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ProjectProvider>
      <div className="flex h-screen flex-col bg-background">
        <TopNav />
        {children}
      </div>
    </ProjectProvider>
  )
}
