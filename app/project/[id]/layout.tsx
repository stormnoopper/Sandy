import { ProjectLayoutClient } from '@/components/project-layout-client'

export default function ProjectLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <ProjectLayoutClient>{children}</ProjectLayoutClient>
}
