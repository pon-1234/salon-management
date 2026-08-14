/**
 * @design_doc   Customer phone lookup authorization and response boundaries
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
    vi.mocked(resolveStoreId).mockResolvedValue('ikebukuro')
    vi.mocked(ensureStoreId).mockResolvedValue('store-ikebukuro')
    vi.mocked(canAdminAccessStore).mockReturnValue(true)
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

  it('does not select or return reservations to an admin with only customer:read', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { role: 'admin', permissions: ['customer:read'] },
    } as any)
    vi.mocked(db.customer.findFirst).mockResolvedValueOnce({
      id: '1',
      phone: '09012345678',
      password: 'hashed',
      emailVerificationToken: 'email-secret',
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
          cast: {
            id: 'cast-1',
            name: '公開名',
            lineUserId: 'line-secret',
          },
        },
      ],
      ngCasts: [
        {
          castId: 'cast-1',
          cast: {
            id: 'cast-1',
            name: '公開名',
            welfareExpenseRate: '0.10',
          },
        },
      ],
    } as any)

    const response = await GET(buildRequest('09012345678'), buildContext('09012345678'))
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.id).toBe('1')
    expect(data.password).toBeUndefined()
    expect(data.emailVerificationToken).toBeUndefined()
    expect(data.phoneVerificationCode).toBeUndefined()
    expect(data.reservations).toBeUndefined()
    expect(JSON.stringify(data)).not.toMatch(
      /storeRevenue|staffRevenue|paymentReference|finance-secret|loginEmail|cast-secret|passwordHash|lineUserId|welfareExpenseRate/
    )
    expect(db.customer.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          phone: {
            in: ['+819012345678', '09012345678', '819012345678'],
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

  it('selects reservation operational fields only with reservation:read permission', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: {
        role: 'admin',
        permissions: ['customer:read', 'reservation:read'],
      },
    } as any)
    vi.mocked(db.customer.findFirst).mockResolvedValueOnce({
      id: '1',
      phone: '09012345678',
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

    const response = await GET(buildRequest('09012345678'), buildContext('09012345678'))
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

  it('rejects an administrator outside the requested canonical store', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { role: 'admin', permissions: ['customer:read'], storeIds: ['store-ginza'] },
    } as any)
    vi.mocked(canAdminAccessStore).mockReturnValueOnce(false)

    const response = await GET(buildRequest('09012345678'), buildContext('09012345678'))

    expect(response.status).toBe(403)
    expect(canAdminAccessStore).toHaveBeenCalledWith(
      expect.objectContaining({ role: 'admin' }),
      'store-ikebukuro'
    )
    expect(db.customer.findFirst).not.toHaveBeenCalled()
  })

  it('maps an E.164 lookup to the same exact phone identities', async () => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { role: 'admin', permissions: ['customer:read'] },
    } as any)
    vi.mocked(db.customer.findFirst).mockResolvedValueOnce({
      id: 'legacy-1',
      phone: '09012345678',
    } as any)

    const response = await GET(buildRequest('%2B819012345678'), buildContext('%2B819012345678'))

    expect(response.status).toBe(200)
    expect(db.customer.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          phone: {
            in: ['+819012345678', '09012345678', '819012345678'],
          },
          storeAssignments: { some: { storeId: 'store-ikebukuro' } },
        },
      })
    )
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
