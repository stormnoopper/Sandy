import { NextResponse } from 'next/server'
import { getNextAuthPublicBaseUrl } from '@/lib/nextauth-base-url'

export const dynamic = 'force-dynamic'

/**
 * GET: values your Google Cloud OAuth **Web client** must allow (same Client ID as GOOGLE_CLIENT_ID on Vercel).
 * Open /api/auth/setup-google-oauth on the deployed site after each env change.
 */
export async function GET() {
  const base = getNextAuthPublicBaseUrl()
  const redirectUri = base ? `${base}/api/auth/callback/google` : ''
  const cid = process.env.GOOGLE_CLIENT_ID

  return NextResponse.json({
    vercel_NEXTAUTH_URL_effective: base || null,
    googleCloud_authorizedJavaScriptOrigins_add: base || null,
    googleCloud_authorizedRedirectUris_add: redirectUri || null,
    googleCloud_openCredentials: 'https://console.cloud.google.com/apis/credentials',
    verify: {
      MUST_MATCH_Vercel_GOOGLE_CLIENT_ID:
        'Open OAuth 2.0 Client IDs until Client ID equals the full GOOGLE_CLIENT_ID env value.',
      lastCharsOfYourClientId: cid ? `…${cid.slice(-18)}` : 'GOOGLE_CLIENT_ID missing on server',
    },
    note:
      'redirect_uri_mismatch with a correct-looking string almost always means this URI is on a different OAuth client than GOOGLE_CLIENT_ID, or Save did not apply.',
    oauthConsentScreen_hint:
      'Google Cloud → Google Auth platform (or APIs & Services) → Audience / OAuth consent screen → Authorized domains — if required, add vercel.app.',
  })
}
