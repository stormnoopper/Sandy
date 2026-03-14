import { withAuth } from 'next-auth/middleware'
import { getAuthSecret } from '@/lib/auth-secret'

export default withAuth({
  pages: {
    signIn: '/',
  },
  secret: getAuthSecret(),
})

export const config = {
  matcher: ['/project/:path*', '/api/generate-sow', '/api/generate-srs'],
}
