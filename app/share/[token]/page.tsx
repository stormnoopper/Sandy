import { format } from 'date-fns'
import { FileText, FileCode, Clock, Eye, AlertTriangle, Lock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface SharePageProps {
  params: Promise<{ token: string }>
}

interface SharedDocument {
  projectName: string
  documentType: 'sow' | 'srs'
  draftName: string
  content: string
  updatedAt: string
  expiresAt: string | null
  viewCount: number
}

async function getSharedDocument(token: string): Promise<SharedDocument | null | 'expired' | 'not_found'> {
  const baseUrl =
    process.env.NEXTAUTH_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')

  try {
    const res = await fetch(`${baseUrl}/api/share/${token}`, { cache: 'no-store' })
    if (res.status === 410) return 'expired'
    if (res.status === 404) return 'not_found'
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

export default async function SharePage({ params }: SharePageProps) {
  const { token } = await params
  const result = await getSharedDocument(token)

  if (result === 'expired') {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-muted/30 p-6">
        <div className="w-full max-w-md rounded-xl border bg-card p-8 text-center shadow-sm">
          <Clock className="mx-auto mb-4 h-12 w-12 text-muted-foreground/60" />
          <h1 className="text-xl font-semibold">Link Expired</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This share link has expired and is no longer accessible.
          </p>
        </div>
      </main>
    )
  }

  if (result === 'not_found' || result === null) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-muted/30 p-6">
        <div className="w-full max-w-md rounded-xl border bg-card p-8 text-center shadow-sm">
          <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-muted-foreground/60" />
          <h1 className="text-xl font-semibold">Document Not Found</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This share link is invalid or the document has been removed.
          </p>
        </div>
      </main>
    )
  }

  const doc = result
  const DocumentIcon = doc.documentType === 'sow' ? FileText : FileCode
  const documentLabel = doc.documentType === 'sow' ? 'Statement of Work' : 'System Requirements Specification'

  return (
    <main className="min-h-screen bg-muted/30">
      {/* Read-only banner */}
      <div className="sticky top-0 z-10 border-b bg-background/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-6 py-3">
          <div className="flex items-center gap-3">
            <DocumentIcon className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="text-sm font-semibold leading-tight">{doc.projectName}</p>
              <p className="text-xs text-muted-foreground">{documentLabel}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="gap-1 text-xs">
              <Lock className="h-3 w-3" />
              Read-only
            </Badge>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Eye className="h-3 w-3" />
              {doc.viewCount} views
            </span>
          </div>
        </div>
      </div>

      {/* Document content */}
      <div className="mx-auto max-w-4xl px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">{doc.draftName}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              Last updated {format(new Date(doc.updatedAt), 'dd MMMM yyyy, HH:mm')}
            </span>
            {doc.expiresAt && (
              <span>
                · Link expires {format(new Date(doc.expiresAt), 'dd MMM yyyy')}
              </span>
            )}
          </div>
        </div>

        <div className="rounded-xl border bg-card shadow-sm">
          <div className="prose prose-sm max-w-none p-8 dark:prose-invert">
            <div
              dangerouslySetInnerHTML={{ __html: doc.content }}
              className="[&_h1]:text-2xl [&_h1]:font-bold [&_h2]:text-xl [&_h2]:font-semibold [&_h3]:text-lg [&_h3]:font-semibold [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-border [&_td]:px-3 [&_td]:py-2 [&_td]:text-sm [&_th]:border [&_th]:border-border [&_th]:bg-muted [&_th]:px-3 [&_th]:py-2 [&_th]:text-sm [&_th]:font-medium [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_blockquote]:border-l-4 [&_blockquote]:border-muted-foreground/30 [&_blockquote]:pl-4 [&_blockquote]:italic [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-xs [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-muted [&_pre]:p-4"
            />
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Shared via Sandy · This is a read-only snapshot
        </p>
      </div>
    </main>
  )
}
