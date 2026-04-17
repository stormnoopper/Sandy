import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  return createClient(url, key)
}

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  if (!token) return Response.json({ error: 'Token is required' }, { status: 400 })

  const supabase = getSupabase()

  const { data: link, error: linkError } = await supabase
    .from('share_links')
    .select('id, token, project_id, document_type, draft_id, draft_name, project_name, expires_at, view_count, created_at')
    .eq('token', token)
    .single()

  if (linkError || !link) {
    return Response.json({ error: 'Share link not found' }, { status: 404 })
  }

  if (link.expires_at && new Date(link.expires_at) < new Date()) {
    return Response.json({ error: 'Share link has expired' }, { status: 410 })
  }

  const table = link.document_type === 'sow' ? 'sow_drafts' : 'srs_drafts'
  const { data: draft, error: draftError } = await supabase
    .from(table)
    .select('id, name, content, updated_at')
    .eq('id', link.draft_id)
    .single()

  if (draftError || !draft) {
    return Response.json({ error: 'Document not found' }, { status: 404 })
  }

  // Increment view count (fire and forget)
  void supabase
    .from('share_links')
    .update({ view_count: link.view_count + 1 })
    .eq('id', link.id)

  return Response.json({
    projectName: link.project_name,
    documentType: link.document_type,
    draftName: link.draft_name || draft.name,
    content: draft.content,
    updatedAt: draft.updated_at,
    expiresAt: link.expires_at ?? null,
    viewCount: link.view_count,
  })
}
