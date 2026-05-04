import 'server-only'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

/** Mock session used when DEV_BYPASS_AUTH=true */
const DEV_SESSION = {
  user: {
    name: 'Dev User',
    email: 'dev@local.dev',
    image: null,
    id: 'dev-user-id',
  },
  expires: '2099-01-01T00:00:00.000Z',
} as const

/** Returns true when the dev auth bypass is active */
export function isDevBypassActive(): boolean {
  return process.env.DEV_BYPASS_AUTH === 'true' && process.env.NODE_ENV !== 'production'
}

/**
 * Drop-in replacement for `getServerSession(authOptions)`.
 * When DEV_BYPASS_AUTH=true (and not in production), returns a mock session
 * so you can develop without Google OAuth.
 */
export async function getSafeServerSession() {
  if (isDevBypassActive()) {
    return DEV_SESSION
  }
  try {
    return await getServerSession(authOptions)
  } catch (error) {
    console.warn('Ignoring invalid auth session cookie:', error)
    return null
  }
}
