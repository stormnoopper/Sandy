import { AuthForm } from '@/components/auth-form'
import { getSafeServerSession } from '@/lib/server-session'
import { ProjectProvider } from '@/lib/project-context'
import { AppSidebar } from '@/components/app-sidebar'
import { Dashboard } from '@/components/dashboard'

export default async function Home() {
  const session = await getSafeServerSession()

  if (!session) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-muted/30 p-6">
        <AuthForm />
      </main>
    )
  }

  return (
    <ProjectProvider>
      <div className="flex h-screen bg-background">
        <AppSidebar />
        <Dashboard />
      </div>
    </ProjectProvider>
  )
}
