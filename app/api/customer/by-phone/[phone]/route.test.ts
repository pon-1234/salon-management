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
      findFirst: vi.fn(),
    },
  },
}))

vi.mock('@/lib/logger', () => ({
  default: {
    error: vi.fn(),
  },
}))

describe('GET /api/customer/by-phone/[phone]', () => {
  const buildRequest = (phone: string) =>
    new NextRequest(`http://localhost:3000/api/customer/by-phone/${phone}`, {
      method: 'GET',
    })
  const buildContext = (phone: string) => ({
    params: Promise.resolve({ phone }),
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when session missing', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null)

    const response = await GET(buildRequest('09012345678'), buildContext('09012345678'))

    expect(response.status).toBe(401)
  })

  it('forbids non-admin access', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { role: 'customer' },
    } as any)

    const response = await GET(buildRequest('09012345678'), buildContext('09012345678'))

    expect(response.status).toBe(403)
  })

  it('returns customer for admin', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { role: 'admin', permissions: ['customer:read'] },
    } as any)
    vi.mocked(db.customer.findFirst).mockResolvedValueOnce({
      id: '1',
      phone: '09012345678',
      password: 'hashed',
      emailVerificationToken: 'email-secret',
      phoneVerificationCode: '123456',
    } as any)

    const response = await GET(buildRequest('09012345678'), buildContext('09012345678'))
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.id).toBe('1')
    expect(data.password).toBeUndefined()
    expect(data.emailVerificationToken).toBeUndefined()
    expect(data.phoneVerificationCode).toBeUndefined()
  })

  it('returns 404 when not found', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { role: 'admin', permissions: ['customer:read'] },
    } as any)
    vi.mocked(db.customer.findFirst).mockResolvedValueOnce(null)

    const response = await GET(buildRequest('09000000000'), buildContext('09000000000'))

    expect(response.status).toBe(404)
  })

  it('rejects an administrator without customer:read permission', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { role: 'admin', permissions: [] },
    } as any)

    const response = await GET(buildRequest('09012345678'), buildContext('09012345678'))

    expect(response.status).toBe(403)
    expect(db.customer.findFirst).not.toHaveBeenCalled()
  })
})
