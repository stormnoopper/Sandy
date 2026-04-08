/**
 * NextAuth builds Google redirect_uri from NEXTAUTH_URL. Keep it stable:
 * no trailing slash, always a scheme. On Vercel, VERCEL_URL is a fallback
 * when NEXTAUTH_URL was not set (Preview URLs still need that host in Google).
 */
export function syncNextAuthUrlFromEnv(): void {
  let candidate =
    process.env.NEXTAUTH_URL?.trim() ||
    (process.env.VERCEL === '1' && process.env.VERCEL_URL?.trim()
      ? `https://${process.env.VERCEL_URL.trim()}`
      : '')

  if (!candidate) return

  candidate = candidate.replace(/\/+$/, '')
  if (!/^https?:\/\//i.test(candidate)) {
    candidate = `https://${candidate.replace(/^\/+/, '')}`
  }

  process.env.NEXTAUTH_URL = candidate
}

export function getNextAuthPublicBaseUrl(): string {
  syncNextAuthUrlFromEnv()
  return process.env.NEXTAUTH_URL ?? ''
}
