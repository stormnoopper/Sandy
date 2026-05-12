import { streamText } from 'ai'
import { createAnthropic } from '@ai-sdk/anthropic'
import { getSafeServerSession } from '@/lib/server-session'
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  return createClient(url, key)
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSafeServerSession()
  if (!session) return new Response('Unauthorized', { status: 401 })

  const { id: projectId } = await params
  const { searchParams } = new URL(req.url)
  const documentType = searchParams.get('documentType')
  const draftId = searchParams.get('draftId') || ''
  const userId = (session.user as any)?.id as string

  if (!documentType || !['sow', 'srs'].includes(documentType)) {
    return Response.json({ error: 'Invalid documentType' }, { status: 400 })
  }

  const supabase = getSupabase()

  // หา session ที่มีอยู่แล้ว (ล่าสุดของ user สำหรับ draft นี้)
  const { data: existingSession } = await supabase
    .from('chat_sessions')
    .select('id, created_at, updated_at')
    .eq('project_id', projectId)
    .eq('document_type', documentType)
    .eq('user_id', userId)
    .eq('draft_id', draftId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!existingSession) {
    return Response.json({ sessionId: null, messages: [] })
  }

  const { data: messages } = await supabase
    .from('chat_messages')
    .select('id, role, content, created_at')
    .eq('session_id', existingSession.id)
    .order('created_at', { ascending: true })

  return Response.json({
    sessionId: existingSession.id,
    messages: (messages ?? []).map((m: any) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      createdAt: m.created_at,
    })),
  })
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSafeServerSession()
  if (!session) return new Response('Unauthorized', { status: 401 })

  const { id: projectId } = await params
  const userId = (session.user as any)?.id as string

  const apiKey = process.env.GLM_API_KEY
  if (!apiKey) {
    return Response.json({ error: 'GLM_API_KEY is not set.' }, { status: 503 })
  }

  const body = await req.json()
  const {
    sessionId: incomingSessionId,
    documentType,
    draftId,
    userMessage,
    documentContent,
    projectName,
    projectDescription,
    sowContent,
  } = body

  if (!userMessage || !documentType) {
    return Response.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const supabase = getSupabase()
  let sessionId = incomingSessionId

  // สร้าง session ใหม่ถ้าไม่มี
  if (!sessionId) {
    const { data: newSession, error: sessionErr } = await supabase
      .from('chat_sessions')
      .insert({
        project_id: projectId,
        document_type: documentType,
        draft_id: draftId || null,
        user_id: userId,
      })
      .select('id')
      .single()

    if (sessionErr || !newSession) {
      return Response.json({ error: 'Failed to create chat session' }, { status: 500 })
    }
    sessionId = newSession.id
  }

  // โหลด message history
  const { data: history } = await supabase
    .from('chat_messages')
    .select('role, content')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })

  // บันทึก user message
  await supabase.from('chat_messages').insert({
    session_id: sessionId,
    role: 'user',
    content: userMessage,
  })

  // อัปเดต updated_at ของ session
  await supabase
    .from('chat_sessions')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', sessionId)

  // สร้าง system prompt ที่รู้บริบทเอกสาร
  const docLabel =
    documentType === 'sow' ? 'Statement of Work (SOW)' : 'System Requirements Specification (SRS)'

  const systemPrompt = `คุณคือ AI ที่เชี่ยวชาญด้านการเขียนเอกสาร IT สำหรับโครงการในบริบทธุรกิจและราชการไทย

คุณกำลังช่วย user วิเคราะห์และแนะนำการปรับปรุงเอกสาร **${docLabel}** ของโครงการ **${projectName || 'ไม่ระบุชื่อโครงการ'}**${projectDescription ? `\nรายละเอียดโครงการ: ${projectDescription}` : ''}

${
  documentContent
    ? `## เนื้อหา ${docLabel} ปัจจุบัน:\n${documentContent.slice(0, 8000)}${documentContent.length > 8000 ? '\n...(ตัดบางส่วน)' : ''}`
    : `## สถานะ: ${docLabel} ยังไม่มีเนื้อหา`
}${
  sowContent && documentType === 'srs'
    ? `\n\n## SOW Reference (สำหรับอ้างอิง):\n${sowContent.slice(0, 3000)}${sowContent.length > 3000 ? '\n...(ตัดบางส่วน)' : ''}`
    : ''
}

## หน้าที่ของคุณ:
- วิเคราะห์เนื้อหาเอกสารและให้คำแนะนำที่ชัดเจน ปฏิบัติได้จริง
- บอกว่า **ส่วนไหน** ควรแก้ไข และ **แก้ไขอย่างไร** พร้อมตัวอย่างถ้าเป็นไปได้
- ตอบเป็นภาษาไทย กระชับ ตรงประเด็น
- ถ้า user ถามเป็นภาษาอังกฤษ ให้ตอบเป็นภาษาอังกฤษ`

  // สร้าง message list สำหรับ AI (history ก่อนหน้า + message ใหม่)
  const messages = [
    ...((history ?? []) as { role: 'user' | 'assistant'; content: string }[]),
    { role: 'user' as const, content: userMessage },
  ]

  const anthropic = createAnthropic({
    apiKey,
    baseURL: 'https://api.z.ai/api/anthropic/v1',
  })

  const result = streamText({
    model: anthropic('claude-opus-4-5'),
    system: systemPrompt,
    messages,
    // @ts-ignore
    maxTokens: 2048,
    temperature: 0.7,
    onFinish: async ({ text }) => {
      // บันทึก assistant response เมื่อ stream จบ
      const sb = getSupabase()
      await sb.from('chat_messages').insert({
        session_id: sessionId,
        role: 'assistant',
        content: text,
      })
    },
  })

  // ส่ง sessionId กลับใน header เพื่อให้ client รู้ว่าใช้ session ไหน
  const response = result.toTextStreamResponse()
  const headers = new Headers(response.headers)
  headers.set('X-Chat-Session-Id', sessionId)

  return new Response(response.body, {
    status: response.status,
    headers,
  })
}
