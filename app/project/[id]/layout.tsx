import { redirect } from 'next/navigation'
import { getSafeServerSession } from '@/lib/server-session'
import { ProjectLayoutClient } from '@/components/project-layout-client'

export default async function ProjectLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSafeServerSession()

  if (!session) {
    redirect('/')
  }

  return <ProjectLayoutClient>{children}</ProjectLayoutClient>
}
