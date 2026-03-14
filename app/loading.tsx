import { FolderKanban, Sparkles } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'

export default function Loading() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-background">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_color-mix(in_oklch,var(--color-primary)_12%,transparent),transparent_38%)]" />
      <div className="absolute left-1/2 top-24 h-56 w-56 -translate-x-1/2 rounded-full bg-primary/8 blur-3xl" />

      <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col justify-center gap-8 p-6">
        <section className="mx-auto w-full max-w-md rounded-2xl border bg-card/90 p-6 shadow-sm backdrop-blur">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
              <FolderKanban className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-semibold">Sandy</h1>
                <Sparkles className="h-4 w-4 text-chart-4" />
              </div>
              <p className="text-sm text-muted-foreground">Preparing your workspace...</p>
            </div>
            <Spinner className="size-5 text-primary" />
          </div>

          <div className="mt-5 space-y-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Loading projects, drafts, and AI tools</span>
              <span>Please wait</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-full w-2/3 animate-pulse rounded-full bg-primary" />
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[260px_1fr]">
          <div className="hidden rounded-2xl border bg-card/80 p-4 shadow-sm lg:block">
            <div className="mb-6 flex items-center gap-3 border-b pb-4">
              <Skeleton className="h-10 w-10 rounded-xl" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-18" />
              </div>
            </div>

            <div className="space-y-3">
              <Skeleton className="h-10 w-full rounded-lg" />
              <Skeleton className="h-10 w-full rounded-lg" />
              <Skeleton className="h-10 w-full rounded-lg" />
              <Skeleton className="h-10 w-4/5 rounded-lg" />
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-2xl border bg-card/80 p-6 shadow-sm">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-3">
                  <Skeleton className="h-8 w-40" />
                  <Skeleton className="h-4 w-72 max-w-full" />
                </div>
                <Skeleton className="h-10 w-28 rounded-lg" />
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-3">
                <Skeleton className="h-28 rounded-xl" />
                <Skeleton className="h-28 rounded-xl" />
                <Skeleton className="h-28 rounded-xl" />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              <Skeleton className="h-44 rounded-2xl" />
              <Skeleton className="h-44 rounded-2xl" />
              <Skeleton className="h-44 rounded-2xl" />
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
