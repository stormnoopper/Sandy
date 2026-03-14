import 'server-only'

import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function getSafeServerSession() {
  try {
    return await getServerSession(authOptions)
  } catch (error) {
    console.warn('Ignoring invalid auth session cookie:', error)
    return null
  }
}
