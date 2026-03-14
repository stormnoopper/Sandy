'use client'

import { ProjectProvider } from '@/lib/project-context'
import { AppSidebar } from '@/components/app-sidebar'

export default function ProjectLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ProjectProvider>
      <div className="flex h-screen bg-background">
        <AppSidebar />
        {children}
      </div>
    </ProjectProvider>
  )
}
