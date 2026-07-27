/**
 * @design_doc   docs/SYSTEM_AUDIT_2026-07-26.md J-1 and J-14
 * @related_to   middleware.ts enforces the storefront age-verification cookie
 * @known_issues None
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { middleware } from './middleware'

const getToken = vi.fn()

vi.mock('next-auth/jwt', () => ({
  getToken: (...args: unknown[]) => getToken(...args),
}))

vi.mock('@/lib/config/env', () => ({
  env: {
    runtimeMode: 'production',
    nextAuth: { secret: 'test-secret' },
    preview: { accessGateToken: '' },
  },
}))

describe('storefront age verification middleware', () => {
  beforeEach(() => {
    getToken.mockReset()
    getToken.mockResolvedValue(null)
  })

  it.each(['/ikebukuro', '/ikebukuro/services', '/ikebukuro/cast/profile-1'])(
    'redirects an unverified storefront request for %s before rendering adult content',
    async (pathname) => {
      const response = await middleware(new NextRequest(`https://example.com${pathname}`))

      expect(response.status).toBe(307)
      expect(response.headers.get('location')).toBe(
        `https://example.com/ikebukuro/age-verification?callbackUrl=${encodeURIComponent(pathname)}`
      )
      expect(getToken).not.toHaveBeenCalled()
    }
  )

  it('allows the original storefront route when the verification cookie is present', async () => {
    const request = new NextRequest('https://example.com/ikebukuro/services', {
      headers: { cookie: 'salon_age_verified=1' },
    })

    const response = await middleware(request)

    expect(response.headers.get('x-middleware-next')).toBe('1')
  })

  it('does not redirect the verification page into a loop', async () => {
    const response = await middleware(
      new NextRequest('https://example.com/ikebukuro/age-verification')
    )

    expect(response.headers.get('x-middleware-next')).toBe('1')
  })

  it('does not apply the storefront gate to APIs or operator portals', async () => {
    const publicApiResponse = await middleware(
      new NextRequest('https://example.com/api/public/stores/ikebukuro')
    )
    const adminResponse = await middleware(new NextRequest('https://example.com/admin/login'))

    expect(publicApiResponse.headers.get('x-middleware-next')).toBe('1')
    expect(adminResponse.headers.get('x-middleware-next')).toBe('1')
  })

  it('allows an unauthenticated visitor to submit the age-verification decision', async () => {
    const response = await middleware(
      new NextRequest('https://example.com/api/age-verification', { method: 'POST' })
    )

    expect(response.headers.get('x-middleware-next')).toBe('1')
    expect(getToken).not.toHaveBeenCalled()
  })

  it.each(['/images/non-photo.svg', '/videos/introduction.mp4'])(
    'does not mistake the public asset path %s for a storefront slug',
    async (pathname) => {
      const response = await middleware(new NextRequest(`https://example.com${pathname}`))

      expect(response.headers.get('x-middleware-next')).toBe('1')
    }
  )
})
