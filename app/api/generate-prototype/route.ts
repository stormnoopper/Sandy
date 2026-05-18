import { streamText } from 'ai'
import { getSafeServerSession } from '@/lib/server-session'
import { createAnthropic } from '@ai-sdk/anthropic'
import { PROTOTYPE_PROMPT_SETTINGS } from '@/prompts/prototype'

export async function POST(req: Request) {
  const session = await getSafeServerSession()

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

  const { prompt } = await req.json()

  if (!prompt) {
    return new Response(JSON.stringify({ error: 'Missing prompt' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  try {
    const result = streamText({
      model: anthropic(PROTOTYPE_PROMPT_SETTINGS.model),
      prompt,
      // @ts-ignore
      maxTokens: PROTOTYPE_PROMPT_SETTINGS.maxOutputTokens,
      temperature: PROTOTYPE_PROMPT_SETTINGS.temperature,
    })

    return result.toTextStreamResponse()
  } catch (error) {
    console.error('Error generating prototype prompt:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Internal Server Error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
