import { streamText } from 'ai'
import { getServerSession } from 'next-auth'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { authOptions } from '@/lib/auth'
import {
  buildFullSrsPrompt,
  buildSrsSectionPrompt,
  SRS_PROMPT_SETTINGS,
} from '@/prompts/srs'

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

  const { projectName, projectDescription, sow, dataEntries = [], existingSRS, section } =
    await req.json()

  const prompt = section
    ? buildSrsSectionPrompt({
        projectName,
        projectDescription,
        sow,
        dataEntries,
        existingSRS: existingSRS || '',
        section,
      })
    : buildFullSrsPrompt({
        projectName,
        projectDescription,
        sow,
        dataEntries,
      })

  const result = streamText({
    model: google(SRS_PROMPT_SETTINGS.model),
    prompt,
    maxOutputTokens: SRS_PROMPT_SETTINGS.maxOutputTokens,
    temperature: SRS_PROMPT_SETTINGS.temperature,
  })

  return result.toTextStreamResponse()
}
