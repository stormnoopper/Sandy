import { getServerSession } from 'next-auth'
import { createClient } from '@supabase/supabase-js'
import { authOptions } from '@/lib/auth'
import type { GenerationRecord } from '@/lib/types'

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

  const supabase = getSupabase()

  const isMember = await requireMember(supabase, projectId, userId)
  if (!isMember) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const { data, error } = await supabase
    .from('generation_history')
    .select(
      'id, project_id, document_type, draft_id, model, data_entry_count, prompt_length, output_length, duration_ms, continuation_count, status, created_by, created_at'
    )
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) return Response.json({ error: error.message }, { status: 500 })

  const records: GenerationRecord[] = (data ?? []).map((row: any) => ({
    id: row.id,
    projectId: row.project_id,
    documentType: row.document_type,
    draftId: row.draft_id ?? undefined,
    model: row.model,
    dataEntryCount: row.data_entry_count,
    promptLength: row.prompt_length,
    outputLength: row.output_length,
    durationMs: row.duration_ms,
    continuationCount: row.continuation_count,
    status: row.status,
    createdBy: row.created_by ?? undefined,
    createdAt: new Date(row.created_at),
  }))

  return Response.json({ records })
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: projectId } = await params
  const userId = (session.user as any).id as string
  const userName = session.user.name ?? null

  const body = await req.json().catch(() => null)
  const {
    documentType,
    draftId,
    model = '',
    dataEntryCount = 0,
    promptLength = 0,
    outputLength = 0,
    durationMs = 0,
    continuationCount = 0,
    status = 'completed',
  } = body ?? {}

  if (!documentType || !['sow', 'srs', 'prototype'].includes(documentType)) {
    return Response.json({ error: 'Valid documentType is required' }, { status: 400 })
  }

  const supabase = getSupabase()

  const isMember = await requireMember(supabase, projectId, userId)
  if (!isMember) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const { data, error } = await supabase
    .from('generation_history')
    .insert({
      project_id: projectId,
      document_type: documentType,
      draft_id: draftId ?? null,
      model,
      data_entry_count: dataEntryCount,
      prompt_length: promptLength,
      output_length: outputLength,
      duration_ms: durationMs,
      continuation_count: continuationCount,
      status,
      created_by: userName,
      created_at: new Date().toISOString(),
    })
    .select('id')
    .single()

  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json({ id: data.id }, { status: 201 })
}
