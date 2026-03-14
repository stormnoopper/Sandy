export function getAuthSecret() {
  return process.env.NEXTAUTH_SECRET ?? process.env.DATABASE_URL ?? 'sandy-local-auth-secret'
}
