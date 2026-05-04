import { getSafeServerSession } from '@/lib/server-session'
import { redirect } from 'next/navigation'
import { ProjectProvider } from '@/lib/project-context'
import { AppSidebar } from '@/components/app-sidebar'
import { HowToContent } from '@/components/how-to-content'

export const metadata = {
  title: 'How to Use Sandy | Sandy',
  description: 'คู่มือการใช้งานระบบ Sandy สำหรับสร้างเอกสารโครงการ IT ด้วย AI',
}

export default async function HowToPage() {
  const session = await getSafeServerSession()

  if (!session) {
    redirect('/')
  }

  return (
    <ProjectProvider>
      <div className="flex h-screen bg-background">
        <AppSidebar />
        <HowToContent />
      </div>
    </ProjectProvider>
  )
}
