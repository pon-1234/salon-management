/**
 * @design_doc   Store-scoped customer insight authorization boundary
 * @related_to   route.ts, requireAdmin, customer detail insights panel
 * @known_issues Message has no storeId, so store-scoped chat counts are explicitly unavailable
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
  resolveStoreId: vi.fn(),
  ensureStoreId: vi.fn(),
  reservationFindMany: vi.fn(),
  messageCount: vi.fn(),
  loggerError: vi.fn(),
}))

vi.mock('@/lib/auth/utils', () => ({ requireAdmin: mocks.requireAdmin }))
vi.mock('@/lib/store/server', () => ({
  resolveStoreId: mocks.resolveStoreId,
  ensureStoreId: mocks.ensureStoreId,
}))
vi.mock('@/lib/db', () => ({
  db: {
    reservation: { findMany: mocks.reservationFindMany },
    message: { count: mocks.messageCount },
  },
}))
vi.mock('@/lib/logger', () => ({ default: { error: mocks.loggerError } }))

import { GET } from './route'

function request(customerId = 'customer-1'): NextRequest {
  return new NextRequest(
    `http://localhost/api/customer/insights?storeId=ikebukuro&customerId=${customerId}`
  )
}

describe('GET /api/customer/insights', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.resolveStoreId.mockResolvedValue('ikebukuro')
    mocks.ensureStoreId.mockResolvedValue('uat-ikebukuro')
    mocks.requireAdmin.mockResolvedValue(null)
    mocks.reservationFindMany.mockResolvedValue([])
    mocks.messageCount.mockResolvedValue(0)
  })

  it('authorizes customer read access against the canonical assigned store', async () => {
    const response = await GET(request())

    expect(response.status).toBe(200)
    expect(mocks.ensureStoreId).toHaveBeenCalledWith('ikebukuro')
    expect(mocks.requireAdmin).toHaveBeenCalledWith({
      permissions: 'customer:read',
      storeId: 'uat-ikebukuro',
    })
    expect(mocks.reservationFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { storeId: 'uat-ikebukuro', customerId: 'customer-1' } })
    )
  })

  it.each([
    ['an unauthenticated request', 401, '認証が必要です'],
    [
      'an administrator without customer or store access',
      403,
      'この店舗を操作する権限がありません',
    ],
  ])('rejects %s before reading insight data', async (_case, status, error) => {
    mocks.requireAdmin.mockResolvedValueOnce(NextResponse.json({ error }, { status }))

    const response = await GET(request())

    expect(response.status).toBe(status)
    await expect(response.json()).resolves.toEqual({ error })
    expect(mocks.reservationFindMany).not.toHaveBeenCalled()
    expect(mocks.messageCount).not.toHaveBeenCalled()
  })

  it('returns null chat counts instead of leaking customer-wide message aggregates', async () => {
    mocks.reservationFindMany.mockResolvedValueOnce([
      {
        status: 'confirmed',
        cancellationSource: null,
        startTime: new Date('2026-08-10T10:00:00.000Z'),
        price: 10000,
        storeRevenue: 4000,
        staffRevenue: 6000,
        cast: { name: 'キャストA', bust: 'F65', publicProfile: null },
      },
      {
        status: 'completed',
        cancellationSource: null,
        startTime: new Date('2026-08-01T10:00:00.000Z'),
        price: 20000,
        storeRevenue: null,
        staffRevenue: null,
        cast: { name: 'キャストB', bust: null, publicProfile: { bustCup: 'F' } },
      },
      {
        status: 'cancelled',
        cancellationSource: 'customer',
        startTime: new Date('2026-07-31T10:00:00.000Z'),
        price: 30000,
        storeRevenue: null,
        staffRevenue: null,
        cast: { name: 'キャストC', bust: 'G', publicProfile: null },
      },
    ])
    mocks.messageCount.mockResolvedValueOnce(2).mockResolvedValueOnce(3).mockResolvedValueOnce(10)

    const response = await GET(request())

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({
      data: {
        lastVisitDate: '2026-08-10T10:00:00.000Z',
        lastCastName: 'キャストA',
        totalVisits: 2,
        totalRevenue: 30000,
        averageSpend: 15000,
        averageIntervalDays: 9,
        customerCancelCount: 1,
        storeCancelCount: 0,
        chatCountToday: null,
        chatCountYesterday: null,
        chatCountTotal: null,
        preferredBustCup: 'Fカップ',
        cancellationLimit: 3,
      },
    })
    expect(mocks.messageCount).not.toHaveBeenCalled()
  })
})
