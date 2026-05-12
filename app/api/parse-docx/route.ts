import { NextRequest, NextResponse } from 'next/server'
import { getSafeServerSession } from '@/lib/server-session'
import mammoth from 'mammoth'

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

  if (
    file.type !== 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' &&
    !file.name.toLowerCase().endsWith('.docx')
  ) {
    return NextResponse.json({ error: 'File must be a DOCX' }, { status: 400 })
  }

  // Limit file size to 20MB
  const MAX_SIZE = 20 * 1024 * 1024
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'File size exceeds 20MB limit' }, { status: 400 })
  }

  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  try {
    const result = await mammoth.extractRawText({ buffer })
    const text = result.value.trim()

    if (!text) {
      return NextResponse.json({ error: 'No text extracted from document' }, { status: 400 })
    }

    return NextResponse.json({
      text,
      method: 'mammoth',
    })
  } catch (err) {
    console.error('Error parsing DOCX:', err)
    return NextResponse.json(
      { error: 'Failed to extract text from DOCX file' },
      { status: 500 }
    )
  }
}
