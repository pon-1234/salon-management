/**
 * @design_doc   Tests for Reservation API endpoints with modifiable status support
 * @related_to   route.ts, ReservationData type, modifiable status flow
 * @known_issues None currently
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, PUT } from './route'
import { getServerSession } from 'next-auth'
import { db } from '@/lib/db'

// Mock dependencies
vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  db: {
    store: {
      findUnique: vi.fn().mockResolvedValue({ id: 'store-123' }),
    },
    storeSettings: {
      findUnique: vi.fn().mockResolvedValue({
        pointEarnRate: 1,
        pointExpirationMonths: 12,
        pointMinUsage: 100,
        welfareExpenseRate: 10,
      }),
    },
    reservation: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}))

vi.mock('@/lib/auth/config', () => ({
  authOptions: {},
}))

vi.mock('@/lib/notification/service', () => ({
  NotificationService: vi.fn().mockImplementation(() => ({
    sendReservationModification: vi.fn().mockResolvedValue(undefined),
  })),
}))

vi.mock('@/lib/logger', () => ({
  default: {
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}))

vi.mock('@/lib/point/utils', () => ({
  addPointTransaction: vi.fn().mockResolvedValue(undefined),
  calculateEarnedPoints: vi.fn().mockReturnValue(0),
  calculateExpiryDate: vi.fn().mockReturnValue(new Date()),
  resolvePointConfig: vi.fn().mockReturnValue({
    earnRate: 0.01,
    expirationMonths: 12,
    minPointsToUse: 100,
  }),
}))

describe('Reservation API - Modifiable Status', () => {
  const mockReservation = {
    id: 'res-123',
    customerId: 'cust-123',
    castId: 'cast-123',
    courseId: 'course-123',
    startTime: new Date('2024-01-20T14:00:00Z'),
    endTime: new Date('2024-01-20T16:00:00Z'),
    status: 'confirmed',
    modifiableUntil: null,
    customer: { id: 'cust-123', name: '田中太郎' },
    cast: { id: 'cast-123', name: '山田花子' },
    course: { id: 'course-123', name: 'スタンダードコース' },
    options: [],
  }

  const buildTransactionContext = (updatedReservation: any, overrides: Record<string, any> = {}) => {
    const base = {
      reservation: {
        update: vi.fn().mockResolvedValue(updatedReservation),
      },
      reservationOption: {
        deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
      },
      optionPrice: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      designationFee: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
      cast: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
      coursePrice: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
      areaInfo: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
      stationInfo: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
      reservationHistory: {
        createMany: vi.fn().mockResolvedValue({ count: 0 }),
      },
      customerPointHistory: {
        update: vi.fn(),
        create: vi.fn(),
        createMany: vi.fn(),
        findMany: vi.fn().mockResolvedValue([]),
      },
    }
    return { ...base, ...overrides }
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(db.store.findUnique).mockResolvedValue({ id: 'store-123' } as any)
    vi.mocked(db.storeSettings.findUnique).mockResolvedValue({
      pointEarnRate: 1,
      pointExpirationMonths: 12,
      pointMinUsage: 100,
      welfareExpenseRate: 10,
    } as any)
    vi.mocked(db.reservation.findUnique).mockResolvedValue(mockReservation as any)
    vi.mocked(db.reservation.findFirst).mockResolvedValue(mockReservation as any)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('GET endpoint', () => {
    it('should return reservation with modifiableUntil field', async () => {
      const modifiableReservation = {
        ...mockReservation,
        status: 'modifiable',
        modifiableUntil: new Date('2024-01-20T14:30:00Z'),
      }

      vi.mocked(getServerSession).mockResolvedValue({
        user: { role: 'admin', permissions: ['reservation:read'] },
      } as any)

      vi.mocked(db.reservation.findUnique).mockResolvedValue(modifiableReservation as any)
      vi.mocked(db.reservation.findFirst).mockResolvedValue(modifiableReservation as any)

      const request = new NextRequest('http://localhost/api/reservation?id=res-123')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.status).toBe('modifiable')
      expect(data.modifiableUntil).toBeDefined()
    })
  })

  describe('PUT endpoint - Modifiable Status Support', () => {
    it('should allow changing status to modifiable with modifiableUntil', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { role: 'admin', permissions: ['reservation:read'] },
      } as any)

      vi.mocked(db.reservation.findFirst).mockResolvedValue(mockReservation as any)

      const modifiableUntil = new Date(Date.now() + 30 * 60 * 1000) // 30 minutes from now

      vi.mocked(db.$transaction).mockImplementation(async (callback) => {
        const updatedReservation = {
          ...mockReservation,
          status: 'modifiable',
          modifiableUntil,
        }
        return callback(buildTransactionContext(updatedReservation) as any)
      })

      const request = new NextRequest('http://localhost/api/reservation', {
        method: 'PUT',
        body: JSON.stringify({
          id: 'res-123',
          status: 'modifiable',
          modifiableUntil: modifiableUntil.toISOString(),
        }),
      })

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.status).toBe('modifiable')
      expect(data.modifiableUntil).toBeDefined()
    })

    it('should reject modification of modifiable reservation by non-admin users', async () => {
      const modifiableReservation = {
        ...mockReservation,
        status: 'modifiable',
      }

      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: 'cust-123', role: 'customer' },
      } as any)

      vi.mocked(db.reservation.findUnique).mockResolvedValue(modifiableReservation as any)
      vi.mocked(db.reservation.findFirst).mockResolvedValue(modifiableReservation as any)

      const request = new NextRequest('http://localhost/api/reservation', {
        method: 'PUT',
        body: JSON.stringify({
          id: 'res-123',
          courseId: 'course-456',
        }),
      })

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(403)
      expect(data.error).toContain('Only administrators can modify reservations')
    })

    it('should allow admin to modify reservations with modifiable status', async () => {
      const modifiableReservation = {
        ...mockReservation,
        status: 'modifiable',
      }

      vi.mocked(getServerSession).mockResolvedValue({
        user: { role: 'admin', permissions: ['reservation:read'] },
      } as any)

      vi.mocked(db.reservation.findFirst).mockResolvedValue(modifiableReservation as any)

      vi.mocked(db.$transaction).mockImplementation(async (callback) => {
        const updatedReservation = {
          ...modifiableReservation,
          courseId: 'course-456',
        }
        return callback(
          buildTransactionContext(updatedReservation, {
            coursePrice: {
              findFirst: vi.fn().mockResolvedValue({ id: 'course-456' }),
            },
          }) as any
        )
      })

      const request = new NextRequest('http://localhost/api/reservation', {
        method: 'PUT',
        body: JSON.stringify({
          id: 'res-123',
          courseId: 'course-456',
        }),
      })

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.courseId).toBe('course-456')
    })

    it('should automatically revert to confirmed when updating expired modifiable reservation', async () => {
      const expiredModifiableReservation = {
        ...mockReservation,
        status: 'modifiable',
        modifiableUntil: new Date(Date.now() - 60 * 1000), // 1 minute ago
      }

      vi.mocked(getServerSession).mockResolvedValue({
        user: { role: 'admin' },
      } as any)

      vi.mocked(db.reservation.findUnique).mockResolvedValue(expiredModifiableReservation as any)
      vi.mocked(db.reservation.findFirst).mockResolvedValue(expiredModifiableReservation as any)

      vi.mocked(db.$transaction).mockImplementation(async (callback) => {
        const updatedReservation = {
          ...expiredModifiableReservation,
          status: 'confirmed',
          modifiableUntil: null,
        }
        return callback(buildTransactionContext(updatedReservation) as any)
      })

      const request = new NextRequest('http://localhost/api/reservation', {
        method: 'PUT',
        body: JSON.stringify({
          id: 'res-123',
          status: 'confirmed',
        }),
      })

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.status).toBe('confirmed')
      expect(data.modifiableUntil).toBeNull()
    })
  })
})
