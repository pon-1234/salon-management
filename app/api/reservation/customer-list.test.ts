/**
 * @design_doc   Authenticated customer reservation-list ownership and store-isolation contract
 * @related_to   app/api/reservation/route.ts; lib/http/customer-dto.ts
 * @known_issues Database integration is covered separately from this route-unit boundary
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'
import { db } from '@/lib/db'
import { GET } from './route'

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}))

vi.mock('@/lib/auth/config', () => ({
  authOptions: {},
}))

vi.mock('@/lib/db', () => ({
  db: {
    store: {
      findUnique: vi.fn(),
    },
    reservation: {
      findMany: vi.fn(),
    },
  },
}))

vi.mock('@/lib/notification/service', () => ({
  NotificationService: vi.fn().mockImplementation(() => ({})),
}))

vi.mock('@/lib/notification/cast-service', () => ({
  castNotificationService: {},
}))

vi.mock('@/lib/logger', () => ({
  default: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
  },
}))

describe('GET /api/reservation customer list', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(db.store.findUnique).mockResolvedValue({ id: 'store-1' } as never)
    vi.mocked(getServerSession).mockResolvedValue({
      user: { id: 'customer-1', role: 'customer' },
    } as never)
  })

  it('selects only the logged-in customer and requested store, then sanitizes the response', async () => {
    vi.mocked(db.reservation.findMany).mockResolvedValue([
      {
        id: 'reservation-1',
        customerId: 'customer-1',
        storeId: 'store-1',
        castId: 'cast-1',
        courseId: 'course-1',
        startTime: new Date('2026-08-01T03:00:00.000Z'),
        endTime: new Date('2026-08-01T05:00:00.000Z'),
        status: 'confirmed',
        price: 30_000,
        storeRevenue: 12_000,
        staffRevenue: 18_000,
        customer: { id: 'customer-1', name: '顧客本人', password: 'customer-secret' },
        cast: { id: 'cast-1', name: '公開キャスト', loginEmail: 'cast-secret@example.com' },
        course: { id: 'course-1', name: '120分コース', duration: 120, price: 30_000 },
        options: [],
        area: null,
        station: null,
      },
    ] as never)

    const response = await GET(
      new NextRequest(
        'http://localhost/api/reservation?storeId=store-1&sortBy=startTime&sortOrder=desc'
      )
    )
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(db.reservation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { storeId: 'store-1', customerId: 'customer-1' },
        orderBy: { startTime: 'desc' },
      })
    )
    expect(payload).toMatchObject([
      {
        id: 'reservation-1',
        customerId: 'customer-1',
        storeId: 'store-1',
        cast: { id: 'cast-1', name: '公開キャスト' },
        course: { id: 'course-1', name: '120分コース' },
      },
    ])
    expect(JSON.stringify(payload)).not.toMatch(
      /customer-secret|cast-secret@example\.com|storeRevenue|staffRevenue/
    )
  })
})
