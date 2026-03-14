import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { z } from 'zod'
import { getAuthSecret } from '@/lib/auth-secret'
import { verifyUserCredentials } from '@/lib/user-store'

const credentialsSchema = z.object({
  username: z.string().trim().min(2).max(80),
  password: z.string().min(6),
})

export const authOptions: NextAuthOptions = {
  secret: getAuthSecret(),
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/',
  },
  providers: [
    CredentialsProvider({
      name: 'Username and Password',
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const parsedCredentials = credentialsSchema.safeParse(credentials)

        if (!parsedCredentials.success) {
          return null
        }

        return verifyUserCredentials(parsedCredentials.data.username, parsedCredentials.data.password)
      },
    }),
  ],
  callbacks: {
    async session({ session, token }) {
      if (session.user && token.sub) {
        ;(session.user as typeof session.user & { id: string }).id = token.sub
      }

      return session
    },
  },
}
