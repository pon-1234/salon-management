/**
 * @design_doc   docs/SYSTEM_AUDIT_2026-07-26.md J-1 server-enforced age gate
 * @related_to   middleware.ts consumes the cookie issued by this route
 * @known_issues Self-attested age verification cannot independently verify identity
 */
import { describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from './route'

vi.mock('@/lib/config/env', () => ({
  env: {
    nodeEnv: 'production',
  },
}))

describe('POST /api/age-verification', () => {
  it('issues a secure, HTTP-only, same-site verification cookie', async () => {
    const response = await POST(
      new NextRequest('https://example.com/api/age-verification', {
        method: 'POST',
      })
    )

    expect(response.status).toBe(204)
    expect(response.headers.get('set-cookie')).toContain('salon_age_verified=1')
    expect(response.headers.get('set-cookie')).toContain('HttpOnly')
    expect(response.headers.get('set-cookie')).toContain('SameSite=lax')
    expect(response.headers.get('set-cookie')).toContain('Secure')
    expect(response.headers.get('set-cookie')).toContain('Path=/')
  })
})
