import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from 'next-auth/middleware'
import { getAuthSecret } from '@/lib/auth-secret'

// When DEV_BYPASS_AUTH=true, skip all auth checks entirely
const bypassAuth = process.env.DEV_BYPASS_AUTH === 'true' && process.env.NODE_ENV !== 'production'

const authMiddleware = withAuth(
  function middleware(_req) {
    return NextResponse.next()
  },
  {
    pages: {
      signIn: '/',
    },
    secret: getAuthSecret(),
  }
)

export default function middleware(req: NextRequest) {
  if (bypassAuth) {
    return NextResponse.next()
  }
  return (authMiddleware as any)(req)
}

export const config = {
  matcher: ['/project/:path*'],
}
