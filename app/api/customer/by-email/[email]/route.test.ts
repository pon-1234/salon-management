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

describe('GET /api/customer/by-email/[email]', () => {
  const buildRequest = (email: string) =>
    new NextRequest(`http://localhost:3000/api/customer/by-email/${email}`, {
      method: 'GET',
    })
  const buildContext = (email: string) => ({
    params: Promise.resolve({ email }),
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when unauthenticated', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce(null)

    const response = await GET(buildRequest('test@example.com'), buildContext('test@example.com'))

    expect(response.status).toBe(401)
  })

  it('forbids access for non-admin different email', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { email: 'other@example.com', role: 'customer' },
    } as any)

    const response = await GET(buildRequest('test@example.com'), buildContext('test@example.com'))

    expect(response.status).toBe(403)
  })

  it('returns customer data when found', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { email: 'admin@example.com', role: 'admin', permissions: ['customer:read'] },
    } as any)

    vi.mocked(db.customer.findFirst).mockResolvedValueOnce({
      id: '1',
      email: 'test@example.com',
      phone: '09012345678',
      password: 'hashed',
      resetToken: 'reset-secret',
      phoneVerificationCode: '123456',
    } as any)

    const response = await GET(buildRequest('test@example.com'), buildContext('test@example.com'))
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.id).toBe('1')
    expect(data.password).toBeUndefined()
    expect(data.resetToken).toBeUndefined()
    expect(data.phoneVerificationCode).toBeUndefined()
  })

  it('returns 404 when customer missing', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { email: 'admin@example.com', role: 'admin', permissions: ['customer:read'] },
    } as any)
    vi.mocked(db.customer.findFirst).mockResolvedValueOnce(null)

    const response = await GET(
      buildRequest('missing@example.com'),
      buildContext('missing@example.com')
    )

    expect(response.status).toBe(404)
  })

  it('matches customer email case-insensitively', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { email: 'ADMIN@example.com', role: 'admin', permissions: ['customer:read'] },
    } as any)

    const findFirstMock = vi.mocked(db.customer.findFirst)
    findFirstMock.mockResolvedValueOnce({
      id: '1',
      email: 'Customer@Example.COM',
      password: 'hashed',
    } as any)

    const response = await GET(
      buildRequest('CUSTOMER@example.com'),
      buildContext('CUSTOMER@example.com')
    )

    const data = await response.json()

    expect(findFirstMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          email: {
            equals: 'customer@example.com',
            mode: 'insensitive',
          },
        },
      })
    )
    expect(response.status).toBe(200)
    expect(data.email).toBe('Customer@Example.COM')
  })

  it('rejects an administrator without customer:read permission', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { email: 'admin@example.com', role: 'admin', permissions: [] },
    } as any)

    const response = await GET(buildRequest('test@example.com'), buildContext('test@example.com'))

    expect(response.status).toBe(403)
    expect(db.customer.findFirst).not.toHaveBeenCalled()
  })

  it('projects self lookup through the customer-safe DTO', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: 'customer-1', email: 'self@example.com', role: 'customer' },
    } as any)
    vi.mocked(db.customer.findFirst).mockResolvedValueOnce({
      id: 'customer-1',
      email: 'self@example.com',
      reservations: [
        {
          id: 'reservation-1',
          storeRevenue: 12_000,
          staffRevenue: 18_000,
          welfareExpense: 1_000,
          entryMemo: 'staff-only',
          entryReceivedBy: 'admin-1',
        },
      ],
      reviews: [],
      ngCasts: [],
    } as any)

    const response = await GET(buildRequest('self@example.com'), buildContext('self@example.com'))
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.reservations[0].id).toBe('reservation-1')
    expect(JSON.stringify(data)).not.toMatch(
      /storeRevenue|staffRevenue|welfareExpense|staff-only|entryReceivedBy/
    )
  })
})
