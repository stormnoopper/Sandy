import { withAuth } from 'next-auth/middleware'
import { getAuthSecret } from '@/lib/auth-secret'

export default withAuth({
  pages: {
    signIn: '/',
  },
  secret: getAuthSecret(),
})

// Auth for /project/* is done in the layout (server). API routes check session in the handler.
export const config = {
  matcher: [],
}
