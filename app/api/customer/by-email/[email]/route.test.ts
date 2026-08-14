/**
 * @design_doc   Customer email lookup authorization and response boundaries
 * @related_to   route.ts, customer-dto.ts, customer store scope
 * @known_issues None currently
 */
import { NextRequest } from 'next/server'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { GET } from './route'
import { getServerSession } from 'next-auth'
import { db } from '@/lib/db'
import { canAdminAccessStore } from '@/lib/auth/store-access'
import { ensureStoreId, resolveStoreId } from '@/lib/store/server'

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

vi.mock('@/lib/auth/store-access', () => ({
  canAdminAccessStore: vi.fn(),
}))

vi.mock('@/lib/store/server', () => ({
  ensureStoreId: vi.fn(),
  resolveStoreId: vi.fn(),
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
    vi.mocked(resolveStoreId).mockResolvedValue('ikebukuro')
    vi.mocked(ensureStoreId).mockResolvedValue('store-ikebukuro')
    vi.mocked(canAdminAccessStore).mockReturnValue(true)
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

  it('forbids a customer self lookup when the authenticated customer id is missing', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { email: 'self@example.com', role: 'customer' },
    } as any)

    const response = await GET(buildRequest('self@example.com'), buildContext('self@example.com'))

    expect(response.status).toBe(403)
    expect(db.customer.findFirst).not.toHaveBeenCalled()
    expect(resolveStoreId).not.toHaveBeenCalled()
  })

  it('does not select or return reservations to an admin with only customer:read', async () => {
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
      reservations: [
        {
          id: 'reservation-1',
          storeId: 'store-ikebukuro',
          storeRevenue: 12_000,
          staffRevenue: 18_000,
          paymentReference: 'finance-secret',
          cast: {
            id: 'cast-1',
            name: '公開名',
            loginEmail: 'cast-secret@example.com',
            passwordHash: 'cast-password-secret',
          },
        },
      ],
      reviews: [
        {
          id: 'review-1',
          cast: { id: 'cast-1', name: '公開名', lineUserId: 'line-secret' },
        },
      ],
      ngCasts: [
        {
          castId: 'cast-1',
          cast: { id: 'cast-1', name: '公開名', welfareExpenseRate: '0.10' },
        },
      ],
    } as any)

    const response = await GET(buildRequest('test@example.com'), buildContext('test@example.com'))
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.id).toBe('1')
    expect(data.password).toBeUndefined()
    expect(data.resetToken).toBeUndefined()
    expect(data.phoneVerificationCode).toBeUndefined()
    expect(data.reservations).toBeUndefined()
    expect(JSON.stringify(data)).not.toMatch(
      /storeRevenue|staffRevenue|paymentReference|finance-secret|loginEmail|cast-secret|passwordHash|lineUserId|welfareExpenseRate/
    )
    expect(db.customer.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          email: {
            equals: 'test@example.com',
            mode: 'insensitive',
          },
          storeAssignments: { some: { storeId: 'store-ikebukuro' } },
        },
        select: expect.objectContaining({
          reviews: expect.objectContaining({
            where: { cast: { storeId: 'store-ikebukuro' } },
          }),
          ngCasts: expect.objectContaining({
            where: { cast: { storeId: 'store-ikebukuro' } },
          }),
        }),
      })
    )
    const query = vi.mocked(db.customer.findFirst).mock.calls[0]?.[0] as any
    expect(query.include).toBeUndefined()
    expect(query.select).not.toHaveProperty('password')
    expect(query.select.reservations).toBeUndefined()
    expect(query.select.ngCasts.select.cast.select).not.toHaveProperty('lineUserId')
    expect(query.select.ngCasts.select.cast.select).not.toHaveProperty('welfareExpenseRate')
  })

  it('rejects an administrator outside the selected store before querying customers', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: {
        email: 'admin@example.com',
        role: 'admin',
        permissions: ['customer:read'],
        storeIds: ['store-ginza'],
      },
    } as any)
    vi.mocked(canAdminAccessStore).mockReturnValueOnce(false)

    const response = await GET(buildRequest('test@example.com'), buildContext('test@example.com'))

    expect(response.status).toBe(403)
    expect(canAdminAccessStore).toHaveBeenCalledWith(
      expect.objectContaining({ role: 'admin' }),
      'store-ikebukuro'
    )
    expect(db.customer.findFirst).not.toHaveBeenCalled()
  })

  it('selects reservation operational fields only with reservation:read permission', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: {
        email: 'admin@example.com',
        role: 'admin',
        permissions: ['customer:read', 'reservation:read'],
      },
    } as any)
    vi.mocked(db.customer.findFirst).mockResolvedValueOnce({
      id: '1',
      email: 'test@example.com',
      reservations: [
        {
          id: 'reservation-1',
          storeId: 'store-ikebukuro',
          storeRevenue: 12_000,
          staffRevenue: 18_000,
          paymentReference: 'management-code',
        },
      ],
      reviews: [],
      ngCasts: [],
    } as any)

    const response = await GET(buildRequest('test@example.com'), buildContext('test@example.com'))
    const data = await response.json()

    expect(response.status).toBe(200)
    const query = vi.mocked(db.customer.findFirst).mock.calls[0]?.[0] as any
    expect(query.select.reservations.select).toEqual(
      expect.objectContaining({
        storeRevenue: true,
        staffRevenue: true,
        paymentReference: true,
      })
    )
    expect(data.reservations[0]).toEqual(
      expect.objectContaining({
        storeRevenue: 12_000,
        staffRevenue: 18_000,
        paymentReference: 'management-code',
      })
    )
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
          storeAssignments: { some: { storeId: 'store-ikebukuro' } },
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
    expect(resolveStoreId).not.toHaveBeenCalled()
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
    expect(db.customer.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: 'customer-1',
          email: {
            equals: 'self@example.com',
            mode: 'insensitive',
          },
        },
      })
    )
    expect(resolveStoreId).not.toHaveBeenCalled()
    const query = vi.mocked(db.customer.findFirst).mock.calls[0]?.[0] as any
    expect(query.select.reservations).toBeDefined()
    expect(query.select.reservations.select).not.toHaveProperty('storeRevenue')
  })
})
