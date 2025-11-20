import { describe, expect, it } from 'vitest'
import { NextRequest } from 'next/server'
import { middleware } from '@/middleware'

function createRequest(url: string, init?: RequestInit) {
  const request = new Request(url, init)
  return new NextRequest(request)
}

describe('middleware', () => {
  it('allows LINE webhook without requiring authentication', async () => {
    const request = createRequest('https://example.com/api/line/webhook', {
      method: 'POST',
    })

    const response = await middleware(request)

    expect(response?.headers.get('x-middleware-next')).toBe('1')
  })

  it('still blocks protected API routes without a session', async () => {
    const request = createRequest('https://example.com/api/private')

    const response = await middleware(request)

    expect(response?.status).toBe(401)
  })
})
