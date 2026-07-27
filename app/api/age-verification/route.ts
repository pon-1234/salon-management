/**
 * @design_doc   docs/SYSTEM_AUDIT_2026-07-26.md J-1 server-enforced age gate
 * @related_to   middleware.ts consumes the age-verification cookie issued here
 * @known_issues Verification is self-attested and does not independently prove identity
 */
import { NextResponse, type NextRequest } from 'next/server'
import { env } from '@/lib/config/env'
import {
  AGE_VERIFICATION_COOKIE,
  AGE_VERIFICATION_COOKIE_VALUE,
  AGE_VERIFICATION_MAX_AGE_SECONDS,
} from '@/lib/age-verification'

export async function POST(_request: NextRequest) {
  const response = new NextResponse(null, { status: 204 })
  response.cookies.set({
    name: AGE_VERIFICATION_COOKIE,
    value: AGE_VERIFICATION_COOKIE_VALUE,
    httpOnly: true,
    sameSite: 'lax',
    secure: env.nodeEnv === 'production',
    path: '/',
    maxAge: AGE_VERIFICATION_MAX_AGE_SECONDS,
  })
  return response
}
