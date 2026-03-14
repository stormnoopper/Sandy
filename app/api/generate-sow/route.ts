import { streamText } from 'ai'
import { getServerSession } from 'next-auth'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { authOptions } from '@/lib/auth'
import { buildSowPrompt, SOW_PROMPT_SETTINGS } from '@/prompts/sow'

const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENAI_API_KEY,
})

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return new Response('Unauthorized', { status: 401 })
  }

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
