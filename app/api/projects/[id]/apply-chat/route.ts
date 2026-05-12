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

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSafeServerSession()
  if (!session) return new Response('Unauthorized', { status: 401 })

  const apiKey = process.env.GLM_API_KEY
  if (!apiKey) {
    return Response.json({ error: 'GLM_API_KEY is not set.' }, { status: 503 })
  }

  await params
  const body = await req.json()
  const { sessionId, documentType, documentContent, continueFrom } = body

  if (!sessionId || !documentContent) {
    return Response.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const supabase = getSupabase()

  // Load chat history
  const { data: history } = await supabase
    .from('chat_messages')
    .select('role, content')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true })

  const chatHistoryText = (history ?? [])
    .map((m) => `${m.role === 'user' ? 'User' : 'AI'}: ${m.content}`)
    .join('\n\n')

  const docLabel = documentType === 'sow' ? 'Statement of Work (SOW)' : 'System Requirements Specification (SRS)'

  let prompt = ''
  if (continueFrom) {
    prompt = `Continue generating the modified ${docLabel} document from where you left off. ONLY output the continuation of the document, do not output anything else. Do not output any markdown code block formatting like \`\`\`. When the document is fully complete, append the exact string "[DOCUMENT_COMPLETE]" at the very end.\n\nHere is what you have generated so far:\n${continueFrom}`
  } else {
    prompt = `คุณคือ AI ที่เชี่ยวชาญด้านการเขียนเอกสาร IT คุณกำลังช่วยปรับปรุงเอกสาร ${docLabel} ของโครงการ

นี่คือประวัติการสนทนาที่ User สั่งให้ปรับแก้เอกสาร:
=== CHAT HISTORY START ===
${chatHistoryText}
=== CHAT HISTORY END ===

นี่คือเนื้อหาเอกสารปัจจุบัน:
=== CURRENT DOCUMENT START ===
${documentContent}
=== CURRENT DOCUMENT END ===

คำสั่ง:
ให้เขียนเอกสารขึ้นมาใหม่ทั้งหมด โดยปรับปรุงเนื้อหาตามที่ได้คุยกันในแชทให้สอดคล้องกัน
- ให้คงโครงสร้างเดิมของเอกสารไว้ ยกเว้นส่วนที่มีการสั่งแก้
- ใช้ภาษาและรูปแบบให้มีความเป็นทางการและสอดคล้องกับเนื้อหาเดิม
- ห้ามใช้ markdown code block (\`\`\`) ครอบเนื้อหา
- เมื่อคุณเขียนเอกสารจนจบสมบูรณ์แล้ว ให้ต่อท้ายด้วยคำว่า "[DOCUMENT_COMPLETE]" บรรทัดสุดท้าย`
  }

  const anthropic = createAnthropic({
    apiKey,
    baseURL: 'https://api.z.ai/api/anthropic/v1',
  })

  const result = streamText({
    model: anthropic('claude-opus-4-5'), // Use Opus for full rewrite since it has a long context
    prompt,
    // @ts-ignore
    maxTokens: 4096,
    temperature: 0.7,
  })

  return result.toTextStreamResponse()
}
