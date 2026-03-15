import { streamText } from 'ai'
import { getServerSession } from 'next-auth'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { authOptions } from '@/lib/auth'
import { buildSowPrompt, SOW_PROMPT_SETTINGS } from '@/prompts/sow'

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return new Response('Unauthorized', { status: 401 })
  }

  const apiKey = process.env.GOOGLE_GENAI_API_KEY
  if (!apiKey) {
    return new Response(
      JSON.stringify({
        error: 'GOOGLE_GENAI_API_KEY is not set. Add it in Vercel Project Settings → Environment Variables.',
      }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const google = createGoogleGenerativeAI({ apiKey })

  const { projectName, projectDescription, dataEntries } = await req.json()
  const prompt = buildSowPrompt({
    projectName,
    projectDescription,
    dataEntries,
  })

  const result = streamText({
    model: google(SOW_PROMPT_SETTINGS.model),
    prompt,
    maxOutputTokens: SOW_PROMPT_SETTINGS.maxOutputTokens,
    temperature: SOW_PROMPT_SETTINGS.temperature,
  })

  return result.toTextStreamResponse()
}
