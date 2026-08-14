/**
 * @design_doc   Preview UAT ingress must be protected ahead of every application authentication path
 * @related_to   middleware.ts, lib/config/env.ts, upstream identity/VPN gateway
 * @known_issues /salon-uploads is served by the reverse proxy and must be gated there
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'

const previewConfig = vi.hoisted(() => ({
  env: {
    runtimeMode: 'preview' as 'live' | 'preview',
    preview: {
      accessGateToken: 'preview-access-gate-token-at-least-32-characters',
      snapshotCutoff: null,
    },
    nextAuth: {
      secret: 'test-next-auth-secret',
    },
  },
}))

vi.mock('@/lib/config/env', () => previewConfig)
vi.mock('next-auth/jwt', () => ({
  getToken: vi.fn(),
}))

import { getToken } from 'next-auth/jwt'
import { config, middleware } from './middleware'

const ACCESS_TOKEN = 'preview-access-gate-token-at-least-32-characters'

function request(pathname: string, accessToken?: string, ageVerified = false) {
  const headers = {
    ...(accessToken ? { 'x-preview-access-gate-token': accessToken } : {}),
    ...(ageVerified ? { cookie: 'salon_age_verified=1' } : {}),
  }
  return new NextRequest(new URL(pathname, 'https://preview.example.com'), { headers })
}

describe('preview ingress gate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    previewConfig.env.runtimeMode = 'preview'
  })

  it.each([
    '/',
    '/ikebukuro',
    '/uat-ikebukuro',
    '/admin/login',
    '/api/public/stores/test',
    '/api/auth/session',
  ])(
    'rejects an ungated application request before public/auth route handling: %s',
    async (pathname) => {
      const response = await middleware(request(pathname))

      expect(response.status).toBe(404)
      await expect(response.text()).resolves.toBe('')
      expect(getToken).not.toHaveBeenCalled()
    }
  )

  it('returns the same generic response for a wrong token', async () => {
    const response = await middleware(request('/', 'wrong-token'))

    expect(response.status).toBe(404)
    await expect(response.text()).resolves.toBe('')
    expect(getToken).not.toHaveBeenCalled()
  })

  it('allows an exactly matching upstream token to reach existing public route logic', async () => {
    const response = await middleware(request('/api/public/stores/test', ACCESS_TOKEN))

    expect(response.headers.get('x-middleware-next')).toBe('1')
    expect(getToken).not.toHaveBeenCalled()
  })

  it('redirects an authenticated legacy Ikebukuro preview path to the canonical public slug', async () => {
    const response = await middleware(
      request('/uat-ikebukuro/recruitment?source=legacy-bookmark', ACCESS_TOKEN)
    )

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe(
      'https://preview.example.com/ikebukuro/recruitment?source=legacy-bookmark'
    )
    expect(getToken).not.toHaveBeenCalled()
  })

  it('does not install the preview-only legacy Ikebukuro redirect in live mode', async () => {
    previewConfig.env.runtimeMode = 'live'

    const response = await middleware(request('/uat-ikebukuro', ACCESS_TOKEN, true))

    expect(response.headers.get('x-middleware-next')).toBe('1')
  })

  it('keeps only the exact health endpoint outside the preview gate', async () => {
    const healthResponse = await middleware(request('/api/health'))
    const nestedResponse = await middleware(request('/api/health/details'))

    expect(healthResponse.headers.get('x-middleware-next')).toBe('1')
    expect(nestedResponse.status).toBe(404)
    expect(getToken).not.toHaveBeenCalled()
  })

  it('keeps local image delivery outside middleware so the headerless Next optimizer can read it', () => {
    expect(config.matcher).toEqual([
      '/((?!_next/static|_next/image|salon-uploads/|favicon.ico|robots.txt|images/|videos/).*)',
    ])
  })

  it('does not add the preview gate in live mode', async () => {
    previewConfig.env.runtimeMode = 'live'

    const response = await middleware(request('/api/public/stores/test'))

    expect(response.headers.get('x-middleware-next')).toBe('1')
    expect(getToken).not.toHaveBeenCalled()
  })
})
