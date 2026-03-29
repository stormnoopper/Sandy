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

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userId = (session.user as any).id as string
  const body = await request.json().catch(() => null)
  const projectId = body?.projectId

  if (!projectId || typeof projectId !== 'string') {
    return Response.json({ error: 'projectId is required' }, { status: 400 })
  }

  const supabase = getSupabase()

  // Verify project exists and get its name
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('id, name')
    .eq('id', projectId)
    .single()

  if (projectError || !project) {
    return Response.json({ error: 'Project not found' }, { status: 404 })
  }

  // Check if already a member (and what role)
  const { data: existing } = await supabase
    .from('project_members')
    .select('role')
    .eq('project_id', projectId)
    .eq('user_id', userId)
    .single()

  if (existing) {
    const code = existing.role === 'owner' ? 'ALREADY_OWNER' : 'ALREADY_MEMBER'
    const message =
      existing.role === 'owner'
        ? 'You are the owner of this project'
        : 'You are already a member of this project'
    return Response.json(
      { error: code, message, projectName: project.name },
      { status: 409 }
    )
  }

  // Add as member
  const { error: insertError } = await supabase.from('project_members').insert({
    project_id: projectId,
    user_id: userId,
    user_name: session.user.name ?? null,
    user_email: session.user.email ?? null,
    role: 'member',
  })

  if (insertError) {
    console.error('Error adding project member:', insertError)
    return Response.json({ error: 'Failed to join project' }, { status: 500 })
  }

  return Response.json({ success: true })
}
