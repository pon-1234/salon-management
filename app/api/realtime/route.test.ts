/**
 * @design_doc   docs/REALTIME_CHAT_IMPLEMENTATION_PLAN.md
 * @related_to   app/api/realtime/route.ts and contexts/realtime-context.tsx
 * @known_issues The test exercises connection setup; database-change probing is covered separately
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { GET } from './route'

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}))

vi.mock('@/lib/auth/config', () => ({
  authOptions: {},
}))

vi.mock('@/lib/db', () => ({
  db: {
    message: {
      findFirst: vi.fn(),
    },
    reservation: {
      findFirst: vi.fn(),
    },
  },
}))

describe('realtime SSE endpoint', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects an unauthenticated connection', async () => {
    const { getServerSession } = await import('next-auth')
    vi.mocked(getServerSession).mockResolvedValueOnce(null)

    const response = await GET(new Request('http://localhost/api/realtime'))

    expect(response.status).toBe(401)
  })

  it('opens a non-buffered event stream for an authenticated user', async () => {
    const { getServerSession } = await import('next-auth')
    const { db } = await import('@/lib/db')
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: {
        id: 'admin-1',
        role: 'admin',
        email: 'admin@example.com',
      },
      expires: new Date(Date.now() + 60_000).toISOString(),
    })
    vi.mocked(db.message.findFirst).mockResolvedValueOnce(null)
    vi.mocked(db.reservation.findFirst).mockResolvedValueOnce(null)

    const request = new Request('http://localhost/api/realtime')
    const response = await GET(request)
    const reader = response.body?.getReader()
    const firstChunk = await reader?.read()

    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe('text/event-stream')
    expect(response.headers.get('x-accel-buffering')).toBe('no')
    expect(new TextDecoder().decode(firstChunk?.value)).toContain('event: connected')

    await reader?.cancel()
  })
})
