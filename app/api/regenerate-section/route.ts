import { streamText } from 'ai'
import { getSafeServerSession } from '@/lib/server-session'
import { createAnthropic } from '@ai-sdk/anthropic'
import { buildRegeneratePrompt, REGENERATE_PROMPT_SETTINGS } from '@/prompts/regenerate'

export async function POST(req: Request) {
  const session = await getSafeServerSession()

  if (!session) {
    return new Response('Unauthorized', { status: 401 })
  }

  const apiKey = process.env.GLM_API_KEY
  if (!apiKey) {
    return new Response(
      JSON.stringify({
        error: 'GLM_API_KEY is not set.',
      }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const anthropic = createAnthropic({
    apiKey,
    baseURL: 'https://api.z.ai/api/anthropic/v1',
  })

  const { existingContent, prompt: customInstruction, projectName, projectDescription, dataEntries } = await req.json()
  
  if (!existingContent || !customInstruction) {
     return new Response('Missing required fields: existingContent or customInstruction', { status: 400 })
  }

  const prompt = buildRegeneratePrompt({ 
      existingContent, 
      customInstruction, 
      projectName, 
      projectDescription, 
      dataEntries 
  })

  const result = streamText({
    model: anthropic(REGENERATE_PROMPT_SETTINGS.model),
    prompt,
    maxTokens: REGENERATE_PROMPT_SETTINGS.maxOutputTokens,
    temperature: REGENERATE_PROMPT_SETTINGS.temperature,
  })

  return result.toTextStreamResponse()
}