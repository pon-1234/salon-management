import { NextRequest } from 'next/server'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { GET } from './route'
import { getServerSession } from 'next-auth'
import { db } from '@/lib/db'

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}))

vi.mock('@/lib/auth/config', () => ({
  authOptions: {},
}))

vi.mock('@/lib/db', () => ({
  db: {
    customer: {
      findUnique: vi.fn(),
    },
  },
}))

vi.mock('@/lib/logger', () => ({
  default: {
    error: vi.fn(),
  },
}))

describe('GET /api/customer/by-email/[email]', () => {
  const buildRequest = (email: string) =>
    new NextRequest(`http://localhost:3000/api/customer/by-email/${email}`, {
      method: 'GET',
    })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null)

    const response = await GET(buildRequest('test@example.com'), {
      params: { email: 'test@example.com' },
    })

    expect(response.status).toBe(401)
  })

  it('forbids access for non-admin different email', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { email: 'other@example.com', role: 'customer' },
    } as any)

    const response = await GET(buildRequest('test@example.com'), {
      params: { email: 'test@example.com' },
    })

    expect(response.status).toBe(403)
  })

  it('returns customer data when found', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { email: 'admin@example.com', role: 'admin' },
    } as any)

    vi.mocked(db.customer.findUnique).mockResolvedValueOnce({
      id: '1',
      email: 'test@example.com',
      phone: '09012345678',
      password: 'hashed',
    } as any)

    const response = await GET(buildRequest('test@example.com'), {
      params: { email: 'test@example.com' },
    })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.id).toBe('1')
    expect(data.password).toBeUndefined()
  })

  it('returns 404 when customer missing', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { email: 'admin@example.com', role: 'admin' },
    } as any)
    vi.mocked(db.customer.findUnique).mockResolvedValueOnce(null)

    const response = await GET(buildRequest('missing@example.com'), {
      params: { email: 'missing@example.com' },
    })

    expect(response.status).toBe(404)
  })
})
