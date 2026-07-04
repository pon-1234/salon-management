/**
 * @design_doc   Tests for Reservation API endpoints with modifiable status support
 * @related_to   route.ts, ReservationData type, modifiable status flow
 * @known_issues None currently
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST, PUT } from './route'
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
      upsert: vi.fn().mockResolvedValue({ id: 'store-123' }),
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
    customer: {
      findUnique: vi.fn(),
    },
    cast: {
      findFirst: vi.fn(),
    },
    coursePrice: {
      findFirst: vi.fn(),
    },
    areaInfo: {
      findFirst: vi.fn(),
    },
    stationInfo: {
      findFirst: vi.fn(),
    },
    ngCastEntry: {
      findUnique: vi.fn(),
    },
    message: {
      create: vi.fn(),
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

  const buildTransactionContext = (
    updatedReservation: any,
    overrides: Record<string, any> = {}
  ) => {
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
    vi.mocked(db.reservation.findMany).mockResolvedValue([])
    vi.mocked(db.customer.findUnique).mockResolvedValue({
      id: 'cust-123',
      points: 0,
      phoneVerified: true,
      ngCasts: [],
    } as any)
    vi.mocked(db.cast.findFirst).mockResolvedValue({
      id: 'cast-123',
      welfareExpenseRate: null,
    } as any)
    vi.mocked(db.coursePrice.findFirst).mockResolvedValue({
      id: 'course-123',
      price: 30000,
    } as any)
    vi.mocked(db.areaInfo.findFirst).mockResolvedValue(null)
    vi.mocked(db.stationInfo.findFirst).mockResolvedValue(null)
    vi.mocked(db.ngCastEntry.findUnique).mockResolvedValue(null)
    vi.mocked(db.message.create).mockResolvedValue({ id: 'msg-1' } as any)
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

    it('sends a chat message when status transitions to confirmed', async () => {
      const pendingReservation = {
        ...mockReservation,
        status: 'pending',
        price: 32000,
      }

      vi.mocked(getServerSession).mockResolvedValue({
        user: { role: 'admin', permissions: ['reservation:read'] },
      } as any)

      vi.mocked(db.reservation.findUnique).mockResolvedValue(pendingReservation as any)
      vi.mocked(db.reservation.findFirst).mockResolvedValue(pendingReservation as any)

      vi.mocked(db.$transaction).mockImplementation(async (callback) => {
        const updatedReservation = {
          ...pendingReservation,
          status: 'confirmed',
        }
        return callback(buildTransactionContext(updatedReservation) as any)
      })

      const request = new NextRequest('http://localhost/api/reservation', {
        method: 'PUT',
        body: JSON.stringify({
          id: pendingReservation.id,
          status: 'confirmed',
        }),
      })

      const response = await PUT(request)
      expect(response.status).toBe(200)
      expect(db.message.create).toHaveBeenCalledTimes(1)
      const payload = vi.mocked(db.message.create).mock.calls[0]?.[0]
      expect(payload?.data?.customerId).toBe(pendingReservation.customerId)
      expect(payload?.data?.content).toContain('お支払総額')
      expect(payload?.data?.content).toContain('32,000')
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

  describe('POST endpoint validation and conflicts', () => {
    it('rejects requests missing required reservation fields before database lookups', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: 'cust-123', role: 'customer' },
      } as any)

      const request = new NextRequest('http://localhost/api/reservation', {
        method: 'POST',
        body: JSON.stringify({
          castId: 'cast-123',
          startTime: '2026-07-04T18:00:00+09:00',
          endTime: '2026-07-04T20:00:00+09:00',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe('Missing required fields: castId, courseId, startTime, endTime')
      expect(db.customer.findUnique).not.toHaveBeenCalled()
      expect(db.reservation.findMany).not.toHaveBeenCalled()
      expect(db.$transaction).not.toHaveBeenCalled()
    })

    it('returns conflict details when the requested cast already has an overlapping reservation', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: 'admin-1', role: 'admin' },
      } as any)
      vi.mocked(db.reservation.findMany).mockResolvedValue([
        {
          id: 'conflict-1',
          startTime: new Date('2026-07-04T09:30:00.000Z'),
          endTime: new Date('2026-07-04T11:00:00.000Z'),
        },
      ] as any)

      const request = new NextRequest('http://localhost/api/reservation', {
        method: 'POST',
        body: JSON.stringify({
          customerId: 'cust-123',
          castId: 'cast-123',
          courseId: 'course-123',
          startTime: '2026-07-04T18:00:00+09:00',
          endTime: '2026-07-04T19:00:00+09:00',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(409)
      expect(data).toEqual({
        error: 'Time slot is not available',
        conflicts: [
          {
            id: 'conflict-1',
            startTime: '2026-07-04T09:30:00.000Z',
            endTime: '2026-07-04T11:00:00.000Z',
          },
        ],
      })
      expect(db.$transaction).not.toHaveBeenCalled()
    })
  })

  describe('PUT endpoint validation and conflicts', () => {
    it('ignores the current reservation but rejects other overlapping reservations', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { role: 'admin', permissions: ['reservation:read'] },
      } as any)
      vi.mocked(db.reservation.findUnique).mockResolvedValue({
        ...mockReservation,
        storeId: 'ikebukuro',
        paymentMethod: 'cash',
        price: 30000,
        transportationFee: 0,
        additionalFee: 0,
        discountAmount: 0,
        pointsUsed: 0,
        options: [],
      } as any)
      vi.mocked(db.reservation.findMany).mockResolvedValue([
        {
          id: 'res-123',
          startTime: new Date('2026-07-04T09:00:00.000Z'),
          endTime: new Date('2026-07-04T10:00:00.000Z'),
        },
        {
          id: 'other-reservation',
          startTime: new Date('2026-07-04T09:30:00.000Z'),
          endTime: new Date('2026-07-04T11:00:00.000Z'),
        },
      ] as any)

      const request = new NextRequest('http://localhost/api/reservation', {
        method: 'PUT',
        body: JSON.stringify({
          id: 'res-123',
          startTime: '2026-07-04T18:00:00+09:00',
          endTime: '2026-07-04T19:00:00+09:00',
        }),
      })

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(409)
      expect(data).toEqual({
        error: 'Time slot is not available',
        conflicts: [
          {
            id: 'other-reservation',
            startTime: '2026-07-04T09:30:00.000Z',
            endTime: '2026-07-04T11:00:00.000Z',
          },
        ],
      })
      expect(db.$transaction).not.toHaveBeenCalled()
    })
  })
})
