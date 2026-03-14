import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createUser } from '@/lib/user-store'

const registerSchema = z.object({
  username: z.string().trim().min(2).max(80),
  password: z.string().min(6).max(100),
  keyword: z.string().min(1),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const parsedBody = registerSchema.safeParse(body)

    if (!parsedBody.success) {
      return NextResponse.json(
        {
          error: 'Please provide a valid username, password, and passcode.',
        },
        { status: 400 }
      )
    }

    if (parsedBody.data.keyword !== process.env.KEYWORD) {
      return NextResponse.json({ error: 'Invalid passcode.' }, { status: 403 })
    }

    await createUser({
      username: parsedBody.data.username,
      password: parsedBody.data.password,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Error && error.message === 'USERNAME_IN_USE') {
      return NextResponse.json({ error: 'This username already exists.' }, { status: 409 })
    }

    console.error('Failed to register user:', error)
    return NextResponse.json({ error: 'Unable to create your account right now.' }, { status: 500 })
  }
}
