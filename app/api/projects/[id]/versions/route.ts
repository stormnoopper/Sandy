import { getServerSession } from 'next-auth'
import { createClient } from '@supabase/supabase-js'
import { authOptions } from '@/lib/auth'
import type { DocumentVersion } from '@/lib/types'

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

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: projectId } = await params
  const userId = (session.user as any).id as string
  const { searchParams } = new URL(req.url)
  const draftId = searchParams.get('draftId')

  const supabase = getSupabase()

  const isMember = await requireMember(supabase, projectId, userId)
  if (!isMember) return Response.json({ error: 'Forbidden' }, { status: 403 })

  let query = supabase
    .from('document_versions')
    .select('id, draft_id, draft_type, project_id, content, label, created_by_name, created_at')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })

  if (draftId) {
    query = query.eq('draft_id', draftId)
  }

  const { data, error } = await query

  if (error) return Response.json({ error: error.message }, { status: 500 })

  const versions: DocumentVersion[] = (data ?? []).map((row: any) => ({
    id: row.id,
    draftId: row.draft_id,
    draftType: row.draft_type,
    projectId: row.project_id,
    content: row.content,
    label: row.label,
    createdByName: row.created_by_name ?? undefined,
    createdAt: new Date(row.created_at),
  }))

  return Response.json({ versions })
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: projectId } = await params
  const userId = (session.user as any).id as string
  const userName = session.user.name ?? null

  const body = await req.json().catch(() => null)
  const { draftId, draftType, content, label } = body ?? {}

  if (!draftId || !draftType || !content) {
    return Response.json({ error: 'draftId, draftType, and content are required' }, { status: 400 })
  }
  if (!['sow', 'srs'].includes(draftType)) {
    return Response.json({ error: 'draftType must be sow or srs' }, { status: 400 })
  }

  const supabase = getSupabase()

  const isMember = await requireMember(supabase, projectId, userId)
  if (!isMember) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from('document_versions')
    .insert({
      draft_id: draftId,
      draft_type: draftType,
      project_id: projectId,
      content,
      label: label ?? '',
      created_by_name: userName,
      created_at: now,
    })
    .select('id, draft_id, draft_type, project_id, content, label, created_by_name, created_at')
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })

  const version: DocumentVersion = {
    id: data.id,
    draftId: data.draft_id,
    draftType: data.draft_type,
    projectId: data.project_id,
    content: data.content,
    label: data.label,
    createdByName: data.created_by_name ?? undefined,
    createdAt: new Date(data.created_at),
  }

  return Response.json({ version }, { status: 201 })
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: projectId } = await params
  const userId = (session.user as any).id as string
  const { searchParams } = new URL(req.url)
  const versionId = searchParams.get('versionId')

  if (!versionId) {
    return Response.json({ error: 'versionId is required' }, { status: 400 })
  }

  const supabase = getSupabase()
  const isMember = await requireMember(supabase, projectId, userId)
  if (!isMember) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const { error } = await supabase
    .from('document_versions')
    .delete()
    .eq('id', versionId)
    .eq('project_id', projectId)

  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json({ success: true })
}
