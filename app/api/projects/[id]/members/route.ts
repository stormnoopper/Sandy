import { getServerSession } from 'next-auth'
import { createClient } from '@supabase/supabase-js'
import { authOptions } from '@/lib/auth'

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  return createClient(url, key)
}

async function requireOwner(projectId: string, userId: string) {
  const supabase = getSupabase()
  const { data } = await supabase
    .from('project_members')
    .select('role')
    .eq('project_id', projectId)
    .eq('user_id', userId)
    .single()
  return data?.role === 'owner'
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = (session.user as any).id as string
  const supabase = getSupabase()

  // Must be a member to view the member list
  const { data: selfRow } = await supabase
    .from('project_members')
    .select('role')
    .eq('project_id', projectId)
    .eq('user_id', userId)
    .single()

  if (!selfRow) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { data: members, error } = await supabase
    .from('project_members')
    .select('user_id, user_name, user_email, role, joined_at')
    .eq('project_id', projectId)
    .order('joined_at', { ascending: true })

  if (error) {
    return Response.json({ error: 'Failed to fetch members' }, { status: 500 })
  }

  return Response.json({ members })
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const requesterId = (session.user as any).id as string

  const isOwner = await requireOwner(projectId, requesterId)
  if (!isOwner) {
    return Response.json({ error: 'Only the project owner can remove members' }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  const targetUserId = body?.userId

  if (!targetUserId || typeof targetUserId !== 'string') {
    return Response.json({ error: 'userId is required' }, { status: 400 })
  }

  if (targetUserId === requesterId) {
    return Response.json({ error: 'Owner cannot remove themselves' }, { status: 400 })
  }

  const supabase = getSupabase()
  const { error } = await supabase
    .from('project_members')
    .delete()
    .eq('project_id', projectId)
    .eq('user_id', targetUserId)

  if (error) {
    return Response.json({ error: 'Failed to remove member' }, { status: 500 })
  }

  return Response.json({ success: true })
}
