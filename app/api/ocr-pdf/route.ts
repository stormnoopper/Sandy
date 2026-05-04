import { NextRequest, NextResponse } from 'next/server'
import { getSafeServerSession } from '@/lib/server-session'

export const maxDuration = 60

export async function POST(req: NextRequest) {
  const session = await getSafeServerSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const formData = await req.formData()
  const file = formData.get('file') as File | null

  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  if (file.type !== 'application/pdf') {
    return NextResponse.json({ error: 'File must be a PDF' }, { status: 400 })
  }

  // Limit file size to 20MB
  const MAX_SIZE = 20 * 1024 * 1024
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'File size exceeds 20MB limit' }, { status: 400 })
  }

  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  try {
    // Try pdf-parse first (works well for text-based PDFs)
    const pdfParse = (await import('pdf-parse')).default
    const result = await pdfParse(buffer)

    const text = result.text?.trim() ?? ''

    // If we got meaningful text (at least 50 chars), return it directly
    if (text.length >= 50) {
      return NextResponse.json({
        text,
        pages: result.numpages,
        method: 'pdf-parse',
      })
    }

    // If text is too short, it's likely a scanned PDF — use Claude Vision
    return await extractWithClaude(buffer, file.name)
  } catch (err) {
    console.warn('pdf-parse failed, falling back to Claude Vision:', err)
    // Fallback to Claude Vision for scanned or complex PDFs
    return await extractWithClaude(buffer, file.name)
  }
}

async function extractWithClaude(buffer: Buffer, fileName: string): Promise<NextResponse> {
  const apiKey = process.env.GLM_API_KEY
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          'GLM_API_KEY is not set. Cannot use AI OCR fallback for scanned PDFs.',
      },
      { status: 503 }
    )
  }

  const base64 = buffer.toString('base64')

  const response = await fetch('https://api.z.ai/api/anthropic/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-opus-4-5',
      max_tokens: 8192,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'document',
              source: {
                type: 'base64',
                media_type: 'application/pdf',
                data: base64,
              },
            },
            {
              type: 'text',
              text: `Please extract all text content from this PDF document ("${fileName}"). 
Return only the extracted text, preserving the original structure (headings, paragraphs, lists, tables) as best as possible using plain text formatting.
Do not add any commentary or explanation — just the extracted content.`,
            },
          ],
        },
      ],
    }),
  })

  if (!response.ok) {
    const errText = await response.text()
    console.error('Claude OCR error:', errText)
    return NextResponse.json(
      { error: `AI OCR failed: ${response.status} ${response.statusText}` },
      { status: 502 }
    )
  }

  const data = await response.json()
  const text = data?.content?.[0]?.text ?? ''

  return NextResponse.json({
    text: text.trim(),
    pages: null,
    method: 'claude-vision',
  })
}
