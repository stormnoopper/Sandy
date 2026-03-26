import { streamText } from 'ai'
import { getServerSession } from 'next-auth'
import { createAnthropic } from '@ai-sdk/anthropic'
import { authOptions } from '@/lib/auth'
import {
  buildFullSrsPrompt,
  buildSrsSectionPrompt,
  buildSrsContinuePrompt,
  SRS_PROMPT_SETTINGS,
} from '@/prompts/srs'

export async function POST(req: Request) {
  const session = await getServerSession(authOptions)

  if (!session) {
    return new Response('Unauthorized', { status: 401 })
  }

  const apiKey = process.env.GLM_API_KEY
  if (!apiKey) {
    return new Response(
      JSON.stringify({
        error: 'GLM_API_KEY is not set. Add it in Vercel Project Settings → Environment Variables.',
      }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const anthropic = createAnthropic({
    apiKey,
    baseURL: 'https://api.z.ai/api/anthropic/v1',
  })

  const { projectName, projectDescription, sow, dataEntries = [], existingSRS, section, continueFrom } =
    await req.json()

  const prompt = continueFrom
    ? buildSrsContinuePrompt({ existingContent: continueFrom })
    : section
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
    model: anthropic(SRS_PROMPT_SETTINGS.model),
    prompt,
    maxTokens: SRS_PROMPT_SETTINGS.maxOutputTokens,
    temperature: SRS_PROMPT_SETTINGS.temperature,
  })

  return result.toTextStreamResponse()
}
