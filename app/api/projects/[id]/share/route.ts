import { getServerSession } from 'next-auth'
import { createClient } from '@supabase/supabase-js'
import { authOptions } from '@/lib/auth'
import type { ShareLink } from '@/lib/types'

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  return createClient(url, key)
}

async function requireMember(supabase: ReturnType<typeof getSupabase>, projectId: string, userId: string) {
  const { data } = await supabase
    .from('project_members')
    .select('role')
    .eq('project_id', projectId)
    .eq('user_id', userId)
    .single()
  return !!data
}

function mapShareLink(row: any): ShareLink {
  return {
    id: row.id,
    token: row.token,
    projectId: row.project_id,
    documentType: row.document_type,
    draftId: row.draft_id,
    draftName: row.draft_name,
    projectName: row.project_name,
    expiresAt: row.expires_at ? new Date(row.expires_at) : undefined,
    viewCount: row.view_count,
    createdAt: new Date(row.created_at),
  }
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: projectId } = await params
  const userId = (session.user as any).id as string
  const supabase = getSupabase()

  const isMember = await requireMember(supabase, projectId, userId)
  if (!isMember) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const { data, error } = await supabase
    .from('share_links')
    .select('id, token, project_id, document_type, draft_id, draft_name, project_name, expires_at, view_count, created_at')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })

  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json({ links: (data ?? []).map(mapShareLink) })
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: projectId } = await params
  const userId = (session.user as any).id as string
  const userName = session.user.name ?? ''

  const body = await req.json().catch(() => null)
  const { documentType, draftId, draftName, projectName, expiresAt } = body ?? {}

  if (!documentType || !draftId) {
    return Response.json({ error: 'documentType and draftId are required' }, { status: 400 })
  }
  if (!['sow', 'srs'].includes(documentType)) {
    return Response.json({ error: 'documentType must be sow or srs' }, { status: 400 })
  }

  const supabase = getSupabase()

  const isMember = await requireMember(supabase, projectId, userId)
  if (!isMember) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const token = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '')

  const { data, error } = await supabase
    .from('share_links')
    .insert({
      token,
      project_id: projectId,
      document_type: documentType,
      draft_id: draftId,
      draft_name: draftName ?? '',
      project_name: projectName ?? '',
      created_by: userName,
      expires_at: expiresAt ?? null,
      view_count: 0,
      created_at: new Date().toISOString(),
    })
    .select('id, token, project_id, document_type, draft_id, draft_name, project_name, expires_at, view_count, created_at')
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json({ link: mapShareLink(data) }, { status: 201 })
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: projectId } = await params
  const userId = (session.user as any).id as string

  const body = await req.json().catch(() => null)
  const { linkId } = body ?? {}

  if (!linkId) return Response.json({ error: 'linkId is required' }, { status: 400 })

  const supabase = getSupabase()

  const isMember = await requireMember(supabase, projectId, userId)
  if (!isMember) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const { error } = await supabase
    .from('share_links')
    .delete()
    .eq('id', linkId)
    .eq('project_id', projectId)

  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json({ success: true })
}
