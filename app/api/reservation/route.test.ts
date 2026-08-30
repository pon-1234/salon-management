/**
 * @design_doc   Tests for Reservation API endpoints with modifiable status support
 * @related_to   route.ts, ReservationData type, modifiable status flow
 * @known_issues None currently
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { DELETE, GET, POST, PUT } from './route'
import { getServerSession } from 'next-auth'
import { db } from '@/lib/db'
import { syncReservationPointUsage } from '@/lib/point/utils'

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
    castSchedule: {
      findFirst: vi.fn(),
    },
    coursePrice: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
    },
    areaInfo: {
      findFirst: vi.fn(),
    },
    stationInfo: {
      findFirst: vi.fn(),
    },
    hotelSettings: {
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
  syncReservationPointUsage: vi.fn().mockResolvedValue(undefined),
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
    storeId: 'ikebukuro',
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
      hotelSettings: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
      admin: {
        findFirst: vi.fn().mockResolvedValue({ id: 'admin-2' }),
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

  it.each([
    ['sortBy', 'password'],
    ['sortOrder', 'sideways'],
    ['limit', '0'],
    ['offset', '-1'],
  ])('rejects invalid list query %s=%s before querying Prisma', async (key, value) => {
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: { id: 'admin-1', role: 'admin', permissions: ['*'] },
    } as any)

    const response = await GET(
      new NextRequest(`http://localhost:3000/api/reservation?storeId=store-123&${key}=${value}`)
    )

    expect(response.status).toBe(400)
    expect(db.reservation.findMany).not.toHaveBeenCalled()
  })

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
      netReservation: true,
    } as any)
    vi.mocked(db.castSchedule.findFirst).mockResolvedValue({
      id: 'schedule-123',
      castId: 'cast-123',
      startTime: new Date('2099-07-04T09:00:00.000Z'),
      endTime: new Date('2099-07-04T12:00:00.000Z'),
      isAvailable: true,
    } as any)
    vi.mocked(db.coursePrice.findFirst).mockResolvedValue({
      id: 'course-123',
      price: 30000,
    } as any)
    vi.mocked(db.coursePrice.findMany).mockResolvedValue([])
    vi.mocked(db.areaInfo.findFirst).mockResolvedValue(null)
    vi.mocked(db.stationInfo.findFirst).mockResolvedValue(null)
    vi.mocked(db.hotelSettings.findFirst).mockResolvedValue(null)
    vi.mocked(db.ngCastEntry.findUnique).mockResolvedValue(null)
    vi.mocked(db.message.create).mockResolvedValue({ id: 'msg-1' } as any)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('GET endpoint', () => {
    it('scopes an administrator reservation list to the requested customer', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: {
          role: 'admin',
          permissions: ['reservation:read'],
          storeIds: ['ikebukuro'],
        },
      } as any)
      vi.mocked(db.reservation.findMany).mockResolvedValue([])

      const response = await GET(
        new NextRequest(
          'http://localhost/api/reservation?storeId=ikebukuro&customerId=customer-target'
        )
      )

      expect(response.status).toBe(200)
      expect(db.reservation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            storeId: 'ikebukuro',
            customerId: 'customer-target',
          }),
        })
      )
    })

    it('treats the active status filter as every non-cancelled reservation', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: {
          role: 'admin',
          permissions: ['reservation:read'],
          storeIds: ['ikebukuro'],
        },
      } as any)
      vi.mocked(db.reservation.findMany).mockResolvedValue([])

      const response = await GET(
        new NextRequest('http://localhost/api/reservation?storeId=ikebukuro&status=active')
      )

      expect(response.status).toBe(200)
      expect(db.reservation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: { not: 'cancelled' },
          }),
        })
      )
    })

    it('treats the adjusting status filter as every editable workflow status', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: {
          role: 'admin',
          permissions: ['reservation:read'],
          storeIds: ['ikebukuro'],
        },
      } as any)
      vi.mocked(db.reservation.findMany).mockResolvedValue([])

      const response = await GET(
        new NextRequest('http://localhost/api/reservation?storeId=ikebukuro&status=adjusting')
      )

      expect(response.status).toBe(200)
      expect(db.reservation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: { in: ['pending', 'tentative', 'modifiable'] },
          }),
        })
      )
    })

    it('uses an exclusive end boundary for date-range queries', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: {
          role: 'admin',
          permissions: ['reservation:read'],
          storeIds: ['ikebukuro'],
        },
      } as any)

      const startDate = '2026-08-13T15:00:00.000Z'
      const endDate = '2026-08-14T15:00:00.000Z'
      const response = await GET(
        new NextRequest(
          `http://localhost/api/reservation?storeId=ikebukuro&startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`
        )
      )

      expect(response.status).toBe(200)
      expect(db.reservation.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            startTime: {
              gte: new Date(startDate),
              lt: new Date(endDate),
            },
          }),
        })
      )
    })

    it('should return reservation with modifiableUntil field', async () => {
      const modifiableReservation = {
        ...mockReservation,
        status: 'modifiable',
        modifiableUntil: new Date('2024-01-20T14:30:00Z'),
        customer: {
          ...mockReservation.customer,
          password: 'customer-secret',
          resetToken: 'reset-secret',
          phoneVerificationCode: '123456',
        },
        cast: {
          ...mockReservation.cast,
          passwordHash: 'cast-secret',
          loginEmail: 'cast@example.com',
          lineUserId: 'line-secret',
        },
      }

      vi.mocked(getServerSession).mockResolvedValue({
        user: {
          role: 'admin',
          adminRole: 'manager',
          permissions: ['reservation:read'],
          storeIds: ['ikebukuro'],
        },
      } as any)

      vi.mocked(db.reservation.findUnique).mockResolvedValue(modifiableReservation as any)
      vi.mocked(db.reservation.findFirst).mockResolvedValue(modifiableReservation as any)

      const request = new NextRequest('http://localhost/api/reservation?id=res-123')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.status).toBe('modifiable')
      expect(data.modifiableUntil).toBeDefined()
      expect(JSON.stringify(data)).not.toMatch(
        /customer-secret|reset-secret|123456|cast-secret|cast@example\.com|line-secret/
      )
    })

    it('does not expose internal revenue or pricing shares to the reservation customer', async () => {
      const customerReservation = {
        ...mockReservation,
        price: 35_000,
        storeRevenue: 12_000,
        staffRevenue: 18_000,
        welfareExpense: 3_000,
        entryReceivedBy: 'staff-secret-id',
        course: {
          ...mockReservation.course,
          price: 30_000,
          storeShare: 12_000,
          castShare: 18_000,
        },
        options: [
          {
            id: 'reservation-option-1',
            optionId: 'option-1',
            optionName: '公開オプション',
            optionPrice: 5_000,
            storeShare: 2_000,
            castShare: 3_000,
            option: {
              id: 'option-1',
              name: '公開オプション',
              price: 5_000,
              storeShare: 2_000,
              castShare: 3_000,
            },
          },
        ],
      }

      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: 'cust-123', role: 'customer' },
      } as any)
      vi.mocked(db.reservation.findFirst).mockResolvedValue(customerReservation as any)

      const request = new NextRequest('http://localhost/api/reservation?id=res-123')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toMatchObject({
        id: 'res-123',
        price: customerReservation.price,
        course: { id: 'course-123', price: 30_000 },
        options: [{ optionId: 'option-1', optionPrice: 5_000 }],
      })
      expect(JSON.stringify(data)).not.toMatch(
        /storeRevenue|staffRevenue|welfareExpense|entryReceivedBy|storeShare|castShare|staff-secret-id/
      )
    })

    it('keeps internal revenue fields in authorized admin responses', async () => {
      const adminReservation = {
        ...mockReservation,
        storeRevenue: 12_000,
        staffRevenue: 18_000,
      }
      vi.mocked(getServerSession).mockResolvedValue({
        user: {
          role: 'admin',
          permissions: ['reservation:read'],
          storeIds: ['ikebukuro'],
        },
      } as any)
      vi.mocked(db.reservation.findFirst).mockResolvedValue(adminReservation as any)

      const response = await GET(new NextRequest('http://localhost/api/reservation?id=res-123'))
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.storeRevenue).toBe(12_000)
      expect(data.staffRevenue).toBe(18_000)
    })
  })

  describe('PUT endpoint - Modifiable Status Support', () => {
    it('accepts a store slug that resolves to the reservation canonical store ID', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: {
          role: 'admin',
          adminRole: 'manager',
          permissions: ['reservation:update'],
          storeIds: ['ikebukuro'],
        },
      } as any)
      vi.mocked(db.store.findUnique).mockImplementation((async ({ where }: any) => {
        if (where.slug === 'public-ikebukuro') {
          return { id: 'ikebukuro' } as any
        }
        return null
      }) as any)
      const transactionContext = buildTransactionContext({
        ...mockReservation,
        status: 'modifiable',
        modifiableUntil: new Date('2099-01-01T00:00:00.000Z'),
      })
      vi.mocked(db.$transaction).mockImplementation(async (callback) =>
        callback(transactionContext as any)
      )

      const response = await PUT(
        new NextRequest('http://localhost/api/reservation?storeId=public-ikebukuro', {
          method: 'PUT',
          body: JSON.stringify({ id: mockReservation.id, status: 'modifiable' }),
        })
      )

      expect(response.status).toBe(200)
      expect(transactionContext.reservation.update).toHaveBeenCalled()
    })

    it('persists a server-generated modification deadline when status becomes modifiable', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: {
          role: 'admin',
          adminRole: 'manager',
          permissions: ['reservation:update'],
          storeIds: ['ikebukuro'],
        },
      } as any)

      const legacyPaymentReservation = {
        ...mockReservation,
        paymentMethod: '現金',
      }
      vi.mocked(db.reservation.findUnique).mockResolvedValue(legacyPaymentReservation as any)
      vi.mocked(db.reservation.findFirst).mockResolvedValue(legacyPaymentReservation as any)

      const clientSuppliedDeadline = new Date('2099-01-01T00:00:00.000Z')
      const transactionContext = buildTransactionContext({
        ...legacyPaymentReservation,
        status: 'modifiable',
        modifiableUntil: clientSuppliedDeadline,
      })

      vi.mocked(db.$transaction).mockImplementation(async (callback) => {
        return callback(transactionContext as any)
      })

      const requestStartedAt = Date.now()
      const request = new NextRequest('http://localhost/api/reservation', {
        method: 'PUT',
        body: JSON.stringify({
          id: 'res-123',
          status: 'modifiable',
          modifiableUntil: clientSuppliedDeadline.toISOString(),
        }),
      })

      const response = await PUT(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.status).toBe('modifiable')
      expect(data.modifiableUntil).toBeDefined()

      const updateCall = transactionContext.reservation.update.mock.calls[0]?.[0]
      const persistedDeadline = updateCall?.data?.modifiableUntil
      expect(updateCall?.data).not.toHaveProperty('price')
      expect(updateCall?.data).not.toHaveProperty('storeRevenue')
      expect(updateCall?.data).not.toHaveProperty('staffRevenue')
      expect(updateCall?.data).not.toHaveProperty('welfareExpense')
      expect(updateCall?.data).not.toHaveProperty('paymentMethod')
      expect(persistedDeadline).toBeInstanceOf(Date)
      expect(persistedDeadline.getTime()).toBeGreaterThanOrEqual(requestStartedAt + 29 * 60 * 1000)
      expect(persistedDeadline.getTime()).toBeLessThanOrEqual(requestStartedAt + 31 * 60 * 1000)
      expect(persistedDeadline.toISOString()).not.toBe(clientSuppliedDeadline.toISOString())
    })

    it('sends a chat message when status transitions to confirmed', async () => {
      const pendingReservation = {
        ...mockReservation,
        status: 'pending',
        price: 32000,
      }

      vi.mocked(getServerSession).mockResolvedValue({
        user: {
          role: 'admin',
          adminRole: 'manager',
          permissions: ['reservation:update'],
          storeIds: ['ikebukuro'],
        },
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
        user: {
          role: 'admin',
          adminRole: 'manager',
          permissions: ['reservation:update'],
          storeIds: ['ikebukuro'],
        },
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
        user: {
          role: 'admin',
          adminRole: 'manager',
          permissions: ['reservation:update'],
          storeIds: ['ikebukuro'],
        },
      } as any)

      vi.mocked(db.reservation.findUnique).mockResolvedValue(expiredModifiableReservation as any)
      vi.mocked(db.reservation.findFirst).mockResolvedValue(expiredModifiableReservation as any)

      const transactionContext = buildTransactionContext({
        ...expiredModifiableReservation,
        status: 'confirmed',
        modifiableUntil: null,
      })

      vi.mocked(db.$transaction).mockImplementation(async (callback) => {
        return callback(transactionContext as any)
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
      expect(transactionContext.reservation.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'confirmed',
            modifiableUntil: null,
          }),
        })
      )
    })
  })

  describe('POST endpoint validation and conflicts', () => {
    it('persists and prices three ordered course selections including duplicate extensions', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: {
          id: 'admin-1',
          role: 'admin',
          permissions: ['reservation:create', 'customer:read'],
          storeIds: ['ikebukuro'],
        },
      } as any)
      vi.mocked(db.coursePrice.findFirst).mockResolvedValue({
        id: 'course-190',
        name: '190分',
        duration: 190,
        price: 30_000,
        storeShare: 10_000,
        castShare: 20_000,
      } as any)
      vi.mocked(db.coursePrice.findMany).mockResolvedValue([
        {
          id: 'extension-30',
          name: '30分延長',
          duration: 30,
          price: 5_000,
          storeShare: 2_000,
          castShare: 3_000,
        },
      ] as any)
      const createReservation = vi.fn().mockImplementation(async ({ data }) => ({
        id: 'reservation-three-courses',
        ...data,
        customer: { id: 'cust-123', name: 'Test Customer' },
        cast: { id: 'cast-123', name: 'Test Cast' },
        course: { id: 'course-190', name: '190分' },
        options: [],
      }))
      vi.mocked(db.$transaction).mockImplementation(async (callback) =>
        callback({
          reservation: {
            findMany: vi.fn().mockResolvedValue([]),
            create: createReservation,
          },
        } as any)
      )

      const response = await POST(
        new NextRequest('http://localhost/api/reservation?storeId=ikebukuro', {
          method: 'POST',
          body: JSON.stringify({
            customerId: 'cust-123',
            castId: 'cast-123',
            courseId: 'course-190',
            courseIds: ['course-190', 'extension-30', 'extension-30'],
            startTime: '2099-07-04T18:00:00+09:00',
            endTime: '2099-07-04T22:10:00+09:00',
          }),
        })
      )

      expect(response.status).toBe(201)
      expect(createReservation).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            courseId: 'course-190',
            price: 40_000,
            storeRevenue: 14_000,
            staffRevenue: 26_000,
            courseItems: [
              expect.objectContaining({ id: 'course-190', sortOrder: 0 }),
              expect.objectContaining({ id: 'extension-30', sortOrder: 1 }),
              expect.objectContaining({ id: 'extension-30', sortOrder: 2 }),
            ],
          }),
        })
      )
    })

    it('validates and persists the selected same-store reception staff member', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: {
          id: 'admin-1',
          role: 'admin',
          permissions: ['reservation:create', 'customer:read'],
          storeIds: ['ikebukuro'],
        },
      } as any)
      const createReservation = vi.fn().mockImplementation(async ({ data }) => ({
        id: 'reservation-with-reception-staff',
        ...data,
        customer: { id: 'cust-123', name: 'Test Customer' },
        cast: { id: 'cast-123', name: 'Test Cast' },
        course: { id: 'course-123', name: 'Test Course' },
        options: [],
      }))
      const findReceptionStaff = vi.fn().mockResolvedValue({ id: 'admin-2' })
      vi.mocked(db.$transaction).mockImplementation(async (callback) =>
        callback({
          reservation: {
            findMany: vi.fn().mockResolvedValue([]),
            create: createReservation,
          },
          admin: { findFirst: findReceptionStaff },
        } as any)
      )

      const response = await POST(
        new NextRequest('http://localhost/api/reservation?storeId=ikebukuro', {
          method: 'POST',
          body: JSON.stringify({
            customerId: 'cust-123',
            castId: 'cast-123',
            courseId: 'course-123',
            receptionStaffId: 'admin-2',
            storeMemo: '電話受付時の共有事項',
            startTime: '2099-07-04T18:00:00+09:00',
            endTime: '2099-07-04T19:00:00+09:00',
          }),
        })
      )

      expect(response.status).toBe(201)
      expect(findReceptionStaff).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ id: 'admin-2', isActive: true }),
        })
      )
      expect(createReservation).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            receptionStaffId: 'admin-2',
            storeMemo: '電話受付時の共有事項',
          }),
        })
      )
    })

    it('rejects a customer without membership in the reservation store', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: {
          id: 'admin-1',
          role: 'admin',
          permissions: ['reservation:create', 'customer:read'],
          storeIds: ['ikebukuro'],
        },
      } as any)
      vi.mocked(db.customer.findUnique).mockResolvedValueOnce(null)

      const response = await POST(
        new NextRequest('http://localhost/api/reservation?storeId=ikebukuro', {
          method: 'POST',
          body: JSON.stringify({
            customerId: 'cust-123',
            castId: 'cast-123',
            courseId: 'course-123',
            startTime: '2099-07-04T18:00:00+09:00',
            endTime: '2099-07-04T19:00:00+09:00',
          }),
        })
      )

      expect(response.status).toBe(400)
      expect(db.customer.findUnique).toHaveBeenCalledWith({
        where: {
          id: 'cust-123',
          storeAssignments: { some: { storeId: 'ikebukuro' } },
        },
        include: {
          ngCasts: {
            select: { castId: true, assignedBy: true },
          },
        },
      })
      expect(db.$transaction).not.toHaveBeenCalled()
    })

    it('rejects a reservation whose start time is outside a 5-minute boundary', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: {
          id: 'admin-1',
          role: 'admin',
          permissions: ['reservation:create', 'customer:read'],
          storeIds: ['ikebukuro'],
        },
      } as any)

      const response = await POST(
        new NextRequest('http://localhost/api/reservation?storeId=ikebukuro', {
          method: 'POST',
          body: JSON.stringify({
            customerId: 'cust-123',
            castId: 'cast-123',
            courseId: 'course-123',
            startTime: '2099-07-04T18:03:00+09:00',
            endTime: '2099-07-04T19:03:00+09:00',
          }),
        })
      )

      expect(response.status).toBe(400)
      await expect(response.json()).resolves.toEqual({
        error: '開始時間は5分単位で指定してください。',
      })
      expect(db.cast.findFirst).not.toHaveBeenCalled()
      expect(db.customer.findUnique).not.toHaveBeenCalled()
      expect(db.$transaction).not.toHaveBeenCalled()
    })

    it('requires a non-sensitive management reference for an administrator card booking', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: {
          id: 'admin-1',
          role: 'admin',
          permissions: ['reservation:create', 'customer:read'],
          storeIds: ['ikebukuro'],
        },
      } as any)

      const response = await POST(
        new NextRequest('http://localhost/api/reservation?storeId=ikebukuro', {
          method: 'POST',
          body: JSON.stringify({
            customerId: 'cust-123',
            castId: 'cast-123',
            courseId: 'course-123',
            startTime: '2099-07-04T18:00:00+09:00',
            endTime: '2099-07-04T19:00:00+09:00',
            paymentMethod: 'クレジットカード',
            paymentReference: '4111111111111111',
          }),
        })
      )

      expect(response.status).toBe(400)
      await expect(response.json()).resolves.toEqual({
        error: 'カード決済の管理番号を入力してください。カード番号は入力しないでください。',
      })
      expect(db.$transaction).not.toHaveBeenCalled()
    })

    it('persists a trimmed card receipt management reference', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: {
          id: 'admin-1',
          role: 'admin',
          permissions: ['reservation:create', 'customer:read'],
          storeIds: ['ikebukuro'],
        },
      } as any)
      const createReservation = vi.fn().mockImplementation(async ({ data }) => ({
        id: 'reservation-card',
        ...data,
        customer: { id: 'cust-123', name: 'Test Customer' },
        cast: { id: 'cast-123', name: 'Test Cast' },
        course: { id: 'course-123', name: 'Test Course' },
        options: [],
      }))
      vi.mocked(db.$transaction).mockImplementation(async (callback) =>
        callback({
          reservation: {
            findMany: vi.fn().mockResolvedValue([]),
            create: createReservation,
          },
        } as any)
      )

      const response = await POST(
        new NextRequest('http://localhost/api/reservation?storeId=ikebukuro', {
          method: 'POST',
          body: JSON.stringify({
            customerId: 'cust-123',
            castId: 'cast-123',
            courseId: 'course-123',
            startTime: '2099-07-04T18:00:00+09:00',
            endTime: '2099-07-04T19:00:00+09:00',
            paymentMethod: 'クレジットカード',
            paymentReference: '  IK-2026-00421  ',
          }),
        })
      )

      expect(response.status).toBe(201)
      expect(createReservation).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            paymentMethod: 'クレジットカード',
            paymentReference: 'IK-2026-00421',
          }),
        })
      )
    })

    it('uses canonical migrated course shares and ignores forged admin revenue values', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: {
          id: 'admin-1',
          role: 'admin',
          permissions: ['reservation:create', 'customer:read'],
          storeIds: ['ikebukuro'],
        },
      } as any)
      vi.mocked(db.coursePrice.findFirst).mockResolvedValue({
        id: 'course-123',
        price: 30_000,
        storeShare: 12_000,
        castShare: 18_000,
      } as any)
      const createReservation = vi.fn().mockImplementation(async ({ data }) => ({
        id: 'reservation-canonical-revenue',
        ...data,
        customer: { id: 'cust-123', name: 'Test Customer' },
        cast: { id: 'cast-123', name: 'Test Cast' },
        course: { id: 'course-123', name: 'Test Course' },
        options: [],
      }))
      vi.mocked(db.$transaction).mockImplementation(async (callback) =>
        callback({
          reservation: {
            findMany: vi.fn().mockResolvedValue([]),
            create: createReservation,
          },
        } as any)
      )

      const response = await POST(
        new NextRequest('http://localhost/api/reservation?storeId=ikebukuro', {
          method: 'POST',
          body: JSON.stringify({
            customerId: 'cust-123',
            castId: 'cast-123',
            courseId: 'course-123',
            startTime: '2099-07-04T18:00:00+09:00',
            endTime: '2099-07-04T19:00:00+09:00',
            price: 1,
            storeRevenue: 29_000,
            staffRevenue: 1,
          }),
        })
      )

      expect(response.status).toBe(201)
      expect(createReservation).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            price: 30_000,
            storeRevenue: 12_000,
            staffRevenue: 18_000,
          }),
        })
      )
    })

    it('rejects an admin without reservation:create permission before database mutation', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: {
          id: 'staff-1',
          role: 'admin',
          permissions: ['reservation:read', 'customer:read'],
        },
      } as any)

      const request = new NextRequest('http://localhost/api/reservation', {
        method: 'POST',
        body: JSON.stringify({
          customerId: 'cust-123',
          castId: 'cast-123',
          courseId: 'course-123',
          startTime: '2099-07-04T18:00:00+09:00',
          endTime: '2099-07-04T19:00:00+09:00',
        }),
      })

      const response = await POST(request)

      expect(response.status).toBe(403)
      expect(db.customer.findUnique).not.toHaveBeenCalled()
      expect(db.$transaction).not.toHaveBeenCalled()
    })

    it('rejects an admin without customer:read before resolving the requested customer', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: {
          id: 'staff-1',
          role: 'admin',
          permissions: ['reservation:create'],
          storeIds: ['ikebukuro'],
        },
      } as any)

      const response = await POST(
        new NextRequest('http://localhost/api/reservation?storeId=ikebukuro', {
          method: 'POST',
          body: JSON.stringify({
            customerId: 'cust-123',
            castId: 'cast-123',
            courseId: 'course-123',
            startTime: '2099-07-04T18:00:00+09:00',
            endTime: '2099-07-04T19:00:00+09:00',
          }),
        })
      )

      expect(response.status).toBe(403)
      expect(db.customer.findUnique).not.toHaveBeenCalled()
      expect(db.$transaction).not.toHaveBeenCalled()
    })

    it('rejects requests missing required reservation fields before database lookups', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: 'cust-123', role: 'customer' },
      } as any)

      const request = new NextRequest('http://localhost/api/reservation', {
        method: 'POST',
        body: JSON.stringify({
          castId: 'cast-123',
          startTime: '2099-07-04T18:00:00+09:00',
          endTime: '2099-07-04T20:00:00+09:00',
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

    it('rejects unknown requested option IDs instead of silently dropping them', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: {
          id: 'admin-1',
          role: 'admin',
          permissions: ['reservation:create', 'customer:read'],
          storeIds: ['ikebukuro'],
        },
      } as any)
      const createReservation = vi.fn()
      vi.mocked(db.$transaction).mockImplementation(async (callback) =>
        callback({
          reservation: {
            findMany: vi.fn().mockResolvedValue([]),
            create: createReservation,
          },
          optionPrice: {
            findMany: vi.fn().mockResolvedValue([
              {
                id: 'option-valid',
                name: 'Valid option',
                price: 1000,
                storeShare: 600,
                castShare: 400,
              },
            ]),
          },
        } as any)
      )

      const response = await POST(
        new NextRequest('http://localhost/api/reservation', {
          method: 'POST',
          body: JSON.stringify({
            customerId: 'cust-123',
            castId: 'cast-123',
            courseId: 'course-123',
            startTime: '2099-07-04T18:00:00+09:00',
            endTime: '2099-07-04T19:00:00+09:00',
            options: ['option-valid', 'option-unknown'],
          }),
        })
      )

      expect(response.status).toBe(400)
      await expect(response.json()).resolves.toEqual({
        error: '選択されたオプションが存在しません。',
        missingOptions: ['option-unknown'],
      })
      expect(createReservation).not.toHaveBeenCalled()
    })

    it('derives the reservation area from a selected station', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: {
          id: 'admin-1',
          role: 'admin',
          permissions: ['reservation:create', 'customer:read'],
          storeIds: ['ikebukuro'],
        },
      } as any)
      vi.mocked(db.stationInfo.findFirst).mockResolvedValue({
        id: 'station-1',
        areaId: 'area-1',
      } as any)
      vi.mocked(db.areaInfo.findFirst).mockResolvedValue({ id: 'area-1' } as any)
      const createReservation = vi.fn().mockImplementation(async ({ data }) => ({
        id: 'reservation-with-location',
        ...data,
        customer: { id: 'cust-123', name: 'Test Customer' },
        cast: { id: 'cast-123', name: 'Test Cast' },
        course: { id: 'course-123', name: 'Test Course' },
        options: [],
      }))
      vi.mocked(db.$transaction).mockImplementation(async (callback) =>
        callback({
          reservation: {
            findMany: vi.fn().mockResolvedValue([]),
            create: createReservation,
          },
        } as any)
      )

      const response = await POST(
        new NextRequest('http://localhost/api/reservation?storeId=ikebukuro', {
          method: 'POST',
          body: JSON.stringify({
            customerId: 'cust-123',
            castId: 'cast-123',
            courseId: 'course-123',
            stationId: 'station-1',
            startTime: '2099-07-04T18:00:00+09:00',
            endTime: '2099-07-04T19:00:00+09:00',
          }),
        })
      )

      expect(response.status).toBe(201)
      expect(createReservation).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ areaId: 'area-1', stationId: 'station-1' }),
        })
      )
    })

    it('rejects a selected area that does not match the station', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: {
          id: 'admin-1',
          role: 'admin',
          permissions: ['reservation:create', 'customer:read'],
          storeIds: ['ikebukuro'],
        },
      } as any)
      vi.mocked(db.areaInfo.findFirst).mockResolvedValue({ id: 'area-2' } as any)
      vi.mocked(db.stationInfo.findFirst).mockResolvedValue({
        id: 'station-1',
        areaId: 'area-1',
      } as any)

      const response = await POST(
        new NextRequest('http://localhost/api/reservation?storeId=ikebukuro', {
          method: 'POST',
          body: JSON.stringify({
            customerId: 'cust-123',
            castId: 'cast-123',
            courseId: 'course-123',
            areaId: 'area-2',
            stationId: 'station-1',
            startTime: '2099-07-04T18:00:00+09:00',
            endTime: '2099-07-04T19:00:00+09:00',
          }),
        })
      )

      expect(response.status).toBe(400)
      await expect(response.json()).resolves.toMatchObject({
        error: '指定された駅は選択されたエリアに属していません。',
        code: 'AREA_STATION_MISMATCH',
      })
      expect(db.$transaction).not.toHaveBeenCalled()
    })

    it('persists a selected same-store hotel with its canonical name and separate hotel expense', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: {
          id: 'admin-1',
          role: 'admin',
          permissions: ['reservation:create', 'customer:read'],
          storeIds: ['ikebukuro'],
        },
      } as any)
      vi.mocked(db.hotelSettings.findFirst).mockResolvedValue({
        id: 'hotel-1',
        hotelName: '池袋グランドホテル',
      } as any)
      const createReservation = vi.fn().mockImplementation(async ({ data }) => ({
        id: 'reservation-with-hotel',
        ...data,
        customer: { id: 'cust-123', name: 'Test Customer' },
        cast: { id: 'cast-123', name: 'Test Cast' },
        course: { id: 'course-123', name: 'Test Course' },
        options: [],
      }))
      vi.mocked(db.$transaction).mockImplementation(async (callback) =>
        callback({
          reservation: {
            findMany: vi.fn().mockResolvedValue([]),
            create: createReservation,
          },
        } as any)
      )

      const response = await POST(
        new NextRequest('http://localhost/api/reservation?storeId=ikebukuro', {
          method: 'POST',
          body: JSON.stringify({
            customerId: 'cust-123',
            castId: 'cast-123',
            courseId: 'course-123',
            hotelId: 'hotel-1',
            hotelName: '改ざんされたホテル名',
            hotelExpense: 1_200,
            startTime: '2099-07-04T18:00:00+09:00',
            endTime: '2099-07-04T19:00:00+09:00',
          }),
        })
      )

      expect(response.status).toBe(201)
      expect(db.hotelSettings.findFirst).toHaveBeenCalledWith({
        where: { id: 'hotel-1', storeId: 'ikebukuro', isActive: true },
        select: { id: true, hotelName: true },
      })
      expect(createReservation).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            hotelId: 'hotel-1',
            hotelName: '池袋グランドホテル',
            hotelExpense: 1_200,
            price: 30_000,
            storeRevenue: 3_000,
            staffRevenue: 27_000,
          }),
        })
      )
    })

    it('rejects a selected hotel that is unavailable in the reservation store', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: {
          id: 'admin-1',
          role: 'admin',
          permissions: ['reservation:create', 'customer:read'],
          storeIds: ['ikebukuro'],
        },
      } as any)

      const response = await POST(
        new NextRequest('http://localhost/api/reservation?storeId=ikebukuro', {
          method: 'POST',
          body: JSON.stringify({
            customerId: 'cust-123',
            castId: 'cast-123',
            courseId: 'course-123',
            hotelId: 'hotel-other-store',
            startTime: '2099-07-04T18:00:00+09:00',
            endTime: '2099-07-04T19:00:00+09:00',
          }),
        })
      )

      expect(response.status).toBe(400)
      await expect(response.json()).resolves.toMatchObject({ code: 'HOTEL_NOT_AVAILABLE' })
      expect(db.$transaction).not.toHaveBeenCalled()
    })

    it.each([-1, 1.5, '1200', Number.POSITIVE_INFINITY])(
      'rejects invalid admin hotel expense %s',
      async (hotelExpense) => {
        vi.mocked(getServerSession).mockResolvedValue({
          user: {
            id: 'admin-1',
            role: 'admin',
            permissions: ['reservation:create', 'customer:read'],
            storeIds: ['ikebukuro'],
          },
        } as any)

        const request = {
          json: vi.fn().mockResolvedValue({
            customerId: 'cust-123',
            castId: 'cast-123',
            courseId: 'course-123',
            hotelExpense,
            startTime: '2099-07-04T18:00:00+09:00',
            endTime: '2099-07-04T19:00:00+09:00',
          }),
          nextUrl: new URL('http://localhost/api/reservation?storeId=ikebukuro'),
          headers: new Headers(),
        } as unknown as NextRequest

        const response = await POST(request)

        expect(response.status).toBe(400)
        await expect(response.json()).resolves.toEqual({
          error: 'ホテル経費は0以上の整数で指定してください。',
        })
        expect(db.$transaction).not.toHaveBeenCalled()
      }
    )

    it('rejects a customer booking when the cast has disabled web reservations', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: 'cust-123', role: 'customer' },
      } as any)
      vi.mocked(db.cast.findFirst).mockResolvedValue({
        id: 'cast-123',
        welfareExpenseRate: null,
        netReservation: false,
      } as any)

      const request = new NextRequest('http://localhost/api/reservation', {
        method: 'POST',
        body: JSON.stringify({
          castId: 'cast-123',
          courseId: 'course-123',
          startTime: '2099-07-04T18:00:00+09:00',
          endTime: '2099-07-04T19:00:00+09:00',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(409)
      expect(data).toEqual({
        error: 'このキャストは現在ネット予約を受け付けていません。',
        code: 'WEB_RESERVATION_DISABLED',
      })
      expect(db.castSchedule.findFirst).not.toHaveBeenCalled()
      expect(db.reservation.findMany).not.toHaveBeenCalled()
      expect(db.$transaction).not.toHaveBeenCalled()
    })

    it('rejects a customer booking outside the cast working schedule', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: 'cust-123', role: 'customer' },
      } as any)
      vi.mocked(db.castSchedule.findFirst).mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/reservation', {
        method: 'POST',
        body: JSON.stringify({
          castId: 'cast-123',
          courseId: 'course-123',
          startTime: '2099-07-04T18:00:00+09:00',
          endTime: '2099-07-04T19:00:00+09:00',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(409)
      expect(data).toEqual({
        error: '指定された時間はキャストの出勤時間外です。',
        code: 'CAST_NOT_SCHEDULED',
      })
      expect(db.castSchedule.findFirst).toHaveBeenCalledWith({
        where: {
          castId: 'cast-123',
          isAvailable: true,
          startTime: { lte: new Date('2099-07-04T09:00:00.000Z') },
          endTime: { gte: new Date('2099-07-04T10:00:00.000Z') },
        },
        select: { id: true },
      })
      expect(db.reservation.findMany).not.toHaveBeenCalled()
      expect(db.$transaction).not.toHaveBeenCalled()
    })

    it('ignores customer-supplied status, price, fees, discounts, and revenue fields', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: 'cust-123', role: 'customer' },
      } as any)
      const createReservation = vi.fn().mockImplementation(async ({ data }) => ({
        id: 'reservation-safe',
        ...data,
        customer: { id: 'cust-123', name: 'Test Customer' },
        cast: { id: 'cast-123', name: 'Test Cast' },
        course: { id: 'course-123', name: 'Test Course' },
        options: [],
      }))
      vi.mocked(db.$transaction).mockImplementation(async (callback) =>
        callback({
          reservation: {
            findMany: vi.fn().mockResolvedValue([]),
            create: createReservation,
          },
        } as any)
      )

      const request = new NextRequest('http://localhost/api/reservation', {
        method: 'POST',
        body: JSON.stringify({
          castId: 'cast-123',
          courseId: 'course-123',
          startTime: '2099-07-04T18:00:00+09:00',
          endTime: '2099-07-04T19:00:00+09:00',
          status: 'completed',
          price: 1,
          designationFee: -5000,
          transportationFee: -5000,
          additionalFee: -5000,
          discountAmount: 999999,
          storeRevenue: -5000,
          staffRevenue: 999999,
          welfareExpense: -5000,
          hotelExpense: -5000,
          marketingChannel: 'forged-channel',
        }),
      })

      const response = await POST(request)
      const responseData = await response.json()

      expect(response.status).toBe(201)
      expect(createReservation).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'pending',
            price: 30000,
            designationFee: 0,
            transportationFee: 0,
            additionalFee: 0,
            discountAmount: 0,
            marketingChannel: 'WEB',
          }),
        })
      )
      const persistedData = createReservation.mock.calls[0]?.[0]?.data
      expect(persistedData.storeRevenue).not.toBe(-5000)
      expect(persistedData.staffRevenue).not.toBe(999999)
      expect(persistedData.hotelExpense).toBe(0)
      expect(responseData.price).toBe(30000)
      expect(JSON.stringify(responseData)).not.toMatch(
        /storeRevenue|staffRevenue|welfareExpense|hotelExpense/
      )
    })

    it('derives a customer regular-designation fee from the selected cast', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: 'cust-123', role: 'customer' },
      } as any)
      vi.mocked(db.cast.findFirst).mockResolvedValue({
        id: 'cast-123',
        welfareExpenseRate: null,
        regularDesignationFee: 2000,
        specialDesignationFee: 5000,
        netReservation: true,
      } as any)
      const createReservation = vi.fn().mockImplementation(async ({ data }) => ({
        id: 'reservation-designated',
        ...data,
        customer: { id: 'cust-123', name: 'Test Customer' },
        cast: { id: 'cast-123', name: 'Test Cast' },
        course: { id: 'course-123', name: 'Test Course' },
        options: [],
      }))
      vi.mocked(db.$transaction).mockImplementation(async (callback) =>
        callback({
          reservation: {
            findMany: vi.fn().mockResolvedValue([]),
            create: createReservation,
          },
          designationFee: {
            findFirst: vi.fn().mockResolvedValue(null),
          },
        } as any)
      )

      const request = new NextRequest('http://localhost/api/reservation', {
        method: 'POST',
        body: JSON.stringify({
          castId: 'cast-123',
          courseId: 'course-123',
          startTime: '2099-07-04T18:00:00+09:00',
          endTime: '2099-07-04T19:00:00+09:00',
          designationType: 'regular',
        }),
      })

      const response = await POST(request)

      expect(response.status).toBe(201)
      expect(createReservation).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            designationType: 'regular',
            designationFee: 2000,
            price: 32000,
          }),
        })
      )
    })

    it('returns conflict details when the requested cast already has an overlapping reservation', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: {
          id: 'admin-1',
          role: 'admin',
          adminRole: 'manager',
          permissions: ['reservation:create', 'customer:read'],
          storeIds: ['ikebukuro'],
        },
      } as any)
      vi.mocked(db.reservation.findMany).mockResolvedValue([
        {
          id: 'conflict-1',
          startTime: new Date('2099-07-04T09:30:00.000Z'),
          endTime: new Date('2099-07-04T11:00:00.000Z'),
        },
      ] as any)

      const request = new NextRequest('http://localhost/api/reservation', {
        method: 'POST',
        body: JSON.stringify({
          customerId: 'cust-123',
          castId: 'cast-123',
          courseId: 'course-123',
          startTime: '2099-07-04T18:00:00+09:00',
          endTime: '2099-07-04T19:00:00+09:00',
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
            startTime: '2099-07-04T09:30:00.000Z',
            endTime: '2099-07-04T11:00:00.000Z',
          },
        ],
      })
      expect(db.$transaction).not.toHaveBeenCalled()
    })
  })

  describe('PUT endpoint validation and conflicts', () => {
    it('synchronizes customer balance and point history when post-create point usage changes', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: {
          role: 'admin',
          adminRole: 'manager',
          permissions: ['reservation:update'],
          storeIds: ['ikebukuro'],
        },
      } as any)
      const existingReservation = {
        ...mockReservation,
        price: 29_900,
        pointsUsed: 100,
        designationType: null,
        designationFee: 0,
        transportationFee: 0,
        additionalFee: 0,
        discountAmount: 0,
        storeRevenue: 11_900,
        staffRevenue: 18_000,
        welfareExpense: 3_000,
        paymentMethod: 'cash',
        course: {
          id: 'course-123',
          name: 'Test Course',
          price: 30_000,
          storeShare: 12_000,
          castShare: 18_000,
        },
        options: [],
      }
      vi.mocked(db.reservation.findUnique).mockResolvedValue(existingReservation as any)
      const transactionContext = buildTransactionContext({
        ...existingReservation,
        price: 29_700,
        pointsUsed: 300,
      })
      vi.mocked(db.$transaction).mockImplementation(async (callback) =>
        callback(transactionContext as any)
      )

      const response = await PUT(
        new NextRequest('http://localhost/api/reservation', {
          method: 'PUT',
          body: JSON.stringify({ id: mockReservation.id, pointsUsed: 300 }),
        })
      )

      expect(response.status).toBe(200)
      expect(syncReservationPointUsage).toHaveBeenCalledWith(
        {
          customerId: existingReservation.customerId,
          reservationId: existingReservation.id,
          previousPointsUsed: 100,
          nextPointsUsed: 300,
        },
        transactionContext
      )
    })

    it('validates and updates the reception staff on an existing reservation', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: {
          role: 'admin',
          adminRole: 'manager',
          permissions: ['reservation:update'],
          storeIds: ['ikebukuro'],
        },
      } as any)
      const existingReservation = {
        ...mockReservation,
        receptionStaffId: 'admin-1',
        price: 30_000,
        pointsUsed: 0,
        designationFee: 0,
        transportationFee: 0,
        additionalFee: 0,
        discountAmount: 0,
        storeRevenue: 12_000,
        staffRevenue: 18_000,
        welfareExpense: 3_000,
        paymentMethod: 'cash',
        course: { ...mockReservation.course, price: 30_000 },
      }
      vi.mocked(db.reservation.findUnique).mockResolvedValue(existingReservation as any)
      const transactionContext = buildTransactionContext({
        ...existingReservation,
        receptionStaffId: 'admin-2',
      })
      vi.mocked(db.$transaction).mockImplementation(async (callback) =>
        callback(transactionContext as any)
      )

      const response = await PUT(
        new NextRequest('http://localhost/api/reservation', {
          method: 'PUT',
          body: JSON.stringify({ id: mockReservation.id, receptionStaffId: 'admin-2' }),
        })
      )

      expect(response.status).toBe(200)
      expect(transactionContext.admin.findFirst).toHaveBeenCalled()
      expect(transactionContext.reservation.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ receptionStaffId: 'admin-2' }),
        })
      )
    })

    it('rejects changing a reservation start time outside a 5-minute boundary', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: {
          role: 'admin',
          adminRole: 'manager',
          permissions: ['reservation:update'],
          storeIds: ['ikebukuro'],
        },
      } as any)

      const response = await PUT(
        new NextRequest('http://localhost/api/reservation', {
          method: 'PUT',
          body: JSON.stringify({
            id: mockReservation.id,
            startTime: '2099-07-04T18:03:00+09:00',
            endTime: '2099-07-04T19:03:00+09:00',
          }),
        })
      )

      expect(response.status).toBe(400)
      await expect(response.json()).resolves.toEqual({
        error: '開始時間は5分単位で指定してください。',
      })
      expect(db.ngCastEntry.findUnique).not.toHaveBeenCalled()
      expect(db.$transaction).not.toHaveBeenCalled()
    })

    it.each([['staff'], [null]])(
      'rejects unsupported cancellation source %j before starting a database update',
      async (cancellationSource) => {
        vi.mocked(getServerSession).mockResolvedValue({
          user: {
            role: 'admin',
            adminRole: 'manager',
            permissions: ['reservation:update'],
            storeIds: ['ikebukuro'],
          },
        } as any)
        const transactionContext = buildTransactionContext({
          ...mockReservation,
          status: 'cancelled',
          cancellationSource,
          cancellationReason: '動作確認のため',
        })
        vi.mocked(db.$transaction).mockImplementation(async (callback) =>
          callback(transactionContext as any)
        )

        const response = await PUT(
          new NextRequest('http://localhost/api/reservation', {
            method: 'PUT',
            body: JSON.stringify({
              id: mockReservation.id,
              status: 'cancelled',
              cancellationSource,
              cancellationReason: '動作確認のため',
            }),
          })
        )

        expect(response.status).toBe(400)
        await expect(response.json()).resolves.toEqual({
          error: 'キャンセル元は店舗または顧客を指定してください。',
        })
        expect(db.$transaction).not.toHaveBeenCalled()
        expect(transactionContext.reservation.update).not.toHaveBeenCalled()
      }
    )

    it('defaults an administrator cancellation without a source to the store', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: {
          role: 'admin',
          adminRole: 'manager',
          permissions: ['reservation:update'],
          storeIds: ['ikebukuro'],
        },
      } as any)
      const transactionContext = buildTransactionContext({
        ...mockReservation,
        status: 'cancelled',
        cancellationSource: 'store',
        cancellationReason: '動作確認のため',
      })
      vi.mocked(db.$transaction).mockImplementation(async (callback) =>
        callback(transactionContext as any)
      )

      const response = await PUT(
        new NextRequest('http://localhost/api/reservation', {
          method: 'PUT',
          body: JSON.stringify({
            id: mockReservation.id,
            status: 'cancelled',
            cancellationReason: '動作確認のため',
          }),
        })
      )

      expect(response.status).toBe(200)
      expect(transactionContext.reservation.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            cancellationSource: 'store',
          }),
        })
      )
    })

    it('requires and persists a concrete reason when cancelling a reservation', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: {
          role: 'admin',
          adminRole: 'manager',
          permissions: ['reservation:update'],
          storeIds: ['ikebukuro'],
        },
      } as any)

      const missingReasonResponse = await PUT(
        new NextRequest('http://localhost/api/reservation', {
          method: 'PUT',
          body: JSON.stringify({
            id: mockReservation.id,
            status: 'cancelled',
            cancellationSource: 'store',
          }),
        })
      )
      expect(missingReasonResponse.status).toBe(400)
      await expect(missingReasonResponse.json()).resolves.toEqual({
        error: 'キャンセル理由を入力してください。',
      })
      expect(db.$transaction).not.toHaveBeenCalled()

      const transactionContext = buildTransactionContext({
        ...mockReservation,
        status: 'cancelled',
        cancellationSource: 'store',
        cancellationReason: 'キャスト体調不良のため',
      })
      vi.mocked(db.$transaction).mockImplementation(async (callback) =>
        callback(transactionContext as any)
      )

      const response = await PUT(
        new NextRequest('http://localhost/api/reservation', {
          method: 'PUT',
          body: JSON.stringify({
            id: mockReservation.id,
            status: 'cancelled',
            cancellationSource: 'store',
            cancellationReason: '  キャスト体調不良のため  ',
          }),
        })
      )

      expect(response.status).toBe(200)
      expect(transactionContext.reservation.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            cancellationSource: 'store',
            cancellationReason: 'キャスト体調不良のため',
          }),
        })
      )
    })

    it('clears a card management reference when payment changes to cash', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: {
          role: 'admin',
          adminRole: 'manager',
          permissions: ['reservation:update'],
          storeIds: ['ikebukuro'],
        },
      } as any)
      const cardReservation = {
        ...mockReservation,
        paymentMethod: 'クレジットカード',
        paymentReference: 'IK-2026-00421',
      }
      vi.mocked(db.reservation.findUnique).mockResolvedValue(cardReservation as any)
      const transactionContext = buildTransactionContext({
        ...cardReservation,
        paymentMethod: '現金',
        paymentReference: null,
      })
      vi.mocked(db.$transaction).mockImplementation(async (callback) =>
        callback(transactionContext as any)
      )

      const response = await PUT(
        new NextRequest('http://localhost/api/reservation', {
          method: 'PUT',
          body: JSON.stringify({ id: mockReservation.id, paymentMethod: '現金' }),
        })
      )

      expect(response.status).toBe(200)
      expect(transactionContext.reservation.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ paymentMethod: '現金', paymentReference: null }),
        })
      )
    })

    it.each(
      [
        'price',
        'designationFee',
        'transportationFee',
        'additionalFee',
        'discountAmount',
        'storeRevenue',
        'staffRevenue',
        'welfareExpense',
      ].flatMap((field) => [
        { field, value: -1 },
        { field, value: Number.POSITIVE_INFINITY },
      ])
    )('rejects invalid admin financial value $field=$value', async ({ field, value }) => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: {
          role: 'admin',
          adminRole: 'manager',
          permissions: ['reservation:update'],
          storeIds: ['ikebukuro'],
        },
      } as any)

      const request = {
        json: vi.fn().mockResolvedValue({
          id: mockReservation.id,
          [field]: value,
        }),
        nextUrl: new URL('http://localhost/api/reservation'),
        headers: new Headers(),
      } as unknown as NextRequest

      const response = await PUT(request)

      expect(response.status).toBe(400)
      await expect(response.json()).resolves.toEqual({
        error: '料金は0以上の有限な数値で指定してください。',
      })
      expect(db.$transaction).not.toHaveBeenCalled()
      expect(db.reservation.update).not.toHaveBeenCalled()
    })

    it.each([-1, 1.5, '1200', Number.POSITIVE_INFINITY])(
      'rejects invalid hotel expense %s',
      async (hotelExpense) => {
        vi.mocked(getServerSession).mockResolvedValue({
          user: {
            role: 'admin',
            adminRole: 'manager',
            permissions: ['reservation:update'],
            storeIds: ['ikebukuro'],
          },
        } as any)

        const request = {
          json: vi.fn().mockResolvedValue({ id: mockReservation.id, hotelExpense }),
          nextUrl: new URL('http://localhost/api/reservation'),
          headers: new Headers(),
        } as unknown as NextRequest

        const response = await PUT(request)

        expect(response.status).toBe(400)
        await expect(response.json()).resolves.toEqual({
          error: 'ホテル経費は0以上の整数で指定してください。',
        })
        expect(db.$transaction).not.toHaveBeenCalled()
      }
    )

    it('updates hotel master linkage and expense without recalculating reservation revenue', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: {
          role: 'admin',
          adminRole: 'manager',
          permissions: ['reservation:update'],
          storeIds: ['ikebukuro'],
        },
      } as any)
      const existingReservation = {
        ...mockReservation,
        hotelId: 'hotel-old',
        hotelName: '旧ホテル',
        hotelExpense: 300,
        price: 30_000,
        storeRevenue: 3_000,
        staffRevenue: 27_000,
        welfareExpense: 3_000,
        paymentMethod: 'cash',
        pointsUsed: 0,
        options: [],
      }
      vi.mocked(db.reservation.findUnique).mockResolvedValue(existingReservation as any)
      const transactionContext = buildTransactionContext(
        {
          ...existingReservation,
          hotelId: 'hotel-new',
          hotelName: '池袋グランドホテル',
          hotelExpense: 1_200,
        },
        {
          hotelSettings: {
            findFirst: vi.fn().mockResolvedValue({
              id: 'hotel-new',
              hotelName: '池袋グランドホテル',
            }),
          },
        }
      )
      vi.mocked(db.$transaction).mockImplementation(async (callback) =>
        callback(transactionContext as any)
      )

      const response = await PUT(
        new NextRequest('http://localhost/api/reservation', {
          method: 'PUT',
          body: JSON.stringify({
            id: mockReservation.id,
            hotelId: 'hotel-new',
            hotelName: '改ざんされた名前',
            hotelExpense: 1_200,
          }),
        })
      )

      expect(response.status).toBe(200)
      const persistedData = transactionContext.reservation.update.mock.calls[0]?.[0]?.data
      expect(persistedData).toMatchObject({
        hotelId: 'hotel-new',
        hotelName: '池袋グランドホテル',
        hotelExpense: 1_200,
      })
      expect(persistedData).not.toHaveProperty('price')
      expect(persistedData).not.toHaveProperty('storeRevenue')
      expect(persistedData).not.toHaveProperty('staffRevenue')
      expect(persistedData).not.toHaveProperty('welfareExpense')
    })

    it('clears hotel linkage when a different free-text hotel name is entered', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: {
          role: 'admin',
          adminRole: 'manager',
          permissions: ['reservation:update'],
          storeIds: ['ikebukuro'],
        },
      } as any)
      const existingReservation = {
        ...mockReservation,
        hotelId: 'hotel-old',
        hotelName: '旧ホテル',
        price: 30_000,
        paymentMethod: 'cash',
        options: [],
      }
      vi.mocked(db.reservation.findUnique).mockResolvedValue(existingReservation as any)
      const transactionContext = buildTransactionContext({
        ...existingReservation,
        hotelId: null,
        hotelName: '当日手入力ホテル',
      })
      vi.mocked(db.$transaction).mockImplementation(async (callback) =>
        callback(transactionContext as any)
      )

      const response = await PUT(
        new NextRequest('http://localhost/api/reservation', {
          method: 'PUT',
          body: JSON.stringify({
            id: mockReservation.id,
            hotelName: '  当日手入力ホテル  ',
          }),
        })
      )

      expect(response.status).toBe(200)
      expect(transactionContext.reservation.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            hotelId: null,
            hotelName: '当日手入力ホテル',
          }),
        })
      )
    })

    it('rejects unknown option IDs before replacing existing reservation options', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: {
          role: 'admin',
          adminRole: 'manager',
          permissions: ['reservation:update'],
          storeIds: ['ikebukuro'],
        },
      } as any)
      const existingReservation = {
        ...mockReservation,
        storeId: 'ikebukuro',
        price: 30000,
        paymentMethod: 'cash',
        designationFee: 0,
        transportationFee: 0,
        additionalFee: 0,
        discountAmount: 0,
        pointsUsed: 0,
        options: [],
      }
      vi.mocked(db.reservation.findUnique).mockResolvedValue(existingReservation as any)
      const transactionContext = buildTransactionContext(existingReservation, {
        optionPrice: {
          findMany: vi.fn().mockResolvedValue([]),
        },
      })
      vi.mocked(db.$transaction).mockImplementation(async (callback) =>
        callback(transactionContext as any)
      )

      const response = await PUT(
        new NextRequest('http://localhost/api/reservation', {
          method: 'PUT',
          body: JSON.stringify({ id: mockReservation.id, options: ['option-unknown'] }),
        })
      )

      expect(response.status).toBe(400)
      await expect(response.json()).resolves.toEqual({
        error: '選択されたオプションが存在しません。',
        missingOptions: ['option-unknown'],
      })
      expect(transactionContext.reservationOption.deleteMany).not.toHaveBeenCalled()
      expect(transactionContext.reservation.update).not.toHaveBeenCalled()
    })

    it('derives the area when an administrator changes the station', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: {
          role: 'admin',
          adminRole: 'manager',
          permissions: ['reservation:update'],
          storeIds: ['ikebukuro'],
        },
      } as any)
      const existingReservation = {
        ...mockReservation,
        areaId: 'area-old',
        stationId: 'station-old',
        price: 30000,
        paymentMethod: 'cash',
        options: [],
      }
      vi.mocked(db.reservation.findUnique).mockResolvedValue(existingReservation as any)
      const transactionContext = buildTransactionContext(existingReservation, {
        stationInfo: {
          findFirst: vi.fn().mockResolvedValue({ id: 'station-new', areaId: 'area-new' }),
        },
        areaInfo: {
          findFirst: vi.fn().mockResolvedValue({ id: 'area-new' }),
        },
      })
      vi.mocked(db.$transaction).mockImplementation(async (callback) =>
        callback(transactionContext as any)
      )

      const response = await PUT(
        new NextRequest('http://localhost/api/reservation', {
          method: 'PUT',
          body: JSON.stringify({ id: mockReservation.id, stationId: 'station-new' }),
        })
      )

      expect(response.status).toBe(200)
      expect(transactionContext.reservation.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ areaId: 'area-new', stationId: 'station-new' }),
        })
      )
    })

    it('rejects an area change that conflicts with the reservation station', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: {
          role: 'admin',
          adminRole: 'manager',
          permissions: ['reservation:update'],
          storeIds: ['ikebukuro'],
        },
      } as any)
      const existingReservation = {
        ...mockReservation,
        areaId: 'area-1',
        stationId: 'station-1',
        price: 30000,
        paymentMethod: 'cash',
        options: [],
      }
      vi.mocked(db.reservation.findUnique).mockResolvedValue(existingReservation as any)
      const transactionContext = buildTransactionContext(existingReservation, {
        stationInfo: {
          findFirst: vi.fn().mockResolvedValue({ id: 'station-1', areaId: 'area-1' }),
        },
        areaInfo: {
          findFirst: vi.fn().mockResolvedValue({ id: 'area-2' }),
        },
      })
      vi.mocked(db.$transaction).mockImplementation(async (callback) =>
        callback(transactionContext as any)
      )

      const response = await PUT(
        new NextRequest('http://localhost/api/reservation', {
          method: 'PUT',
          body: JSON.stringify({ id: mockReservation.id, areaId: 'area-2' }),
        })
      )

      expect(response.status).toBe(400)
      await expect(response.json()).resolves.toMatchObject({
        error: '指定された駅は選択されたエリアに属していません。',
        code: 'AREA_STATION_MISMATCH',
      })
      expect(transactionContext.reservation.update).not.toHaveBeenCalled()
    })

    it('allows a status-only update even when the existing customer/cast pair is now NG', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: {
          role: 'admin',
          adminRole: 'manager',
          permissions: ['reservation:update'],
          storeIds: ['ikebukuro'],
        },
      } as any)
      vi.mocked(db.ngCastEntry.findUnique).mockResolvedValue({
        customerId: mockReservation.customerId,
        castId: mockReservation.castId,
        assignedBy: 'customer',
      } as any)
      vi.mocked(db.$transaction).mockImplementation(async (callback) =>
        callback(
          buildTransactionContext({
            ...mockReservation,
            status: 'completed',
          }) as any
        )
      )

      const response = await PUT(
        new NextRequest('http://localhost/api/reservation', {
          method: 'PUT',
          body: JSON.stringify({ id: mockReservation.id, status: 'completed' }),
        })
      )

      expect(response.status).toBe(200)
      expect(db.$transaction).toHaveBeenCalledTimes(1)
    })

    it('does not revalidate unchanged assignment and time fields', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: {
          role: 'admin',
          adminRole: 'manager',
          permissions: ['reservation:update'],
          storeIds: ['ikebukuro'],
        },
      } as any)
      const unchangedReservation = {
        ...mockReservation,
        startTime: new Date('2024-01-20T14:10:00.000Z'),
        endTime: new Date('2024-01-20T16:10:00.000Z'),
        price: 32_000,
        designationType: 'panel',
        designationFee: 0,
        transportationFee: 2_000,
        additionalFee: 0,
        discountAmount: 0,
        welfareExpense: 3_000,
        storeRevenue: 5_000,
        staffRevenue: 27_000,
        paymentMethod: 'cash',
        pointsUsed: 0,
        options: [],
      }
      vi.mocked(db.reservation.findUnique).mockResolvedValue(unchangedReservation as any)
      vi.mocked(db.ngCastEntry.findUnique).mockResolvedValue({
        customerId: unchangedReservation.customerId,
        castId: unchangedReservation.castId,
        assignedBy: 'customer',
      } as any)
      const transactionContext = buildTransactionContext({
        ...unchangedReservation,
        notes: 'unchanged assignment',
      })
      vi.mocked(db.$transaction).mockImplementation(async (callback) =>
        callback(transactionContext as any)
      )

      const response = await PUT(
        new NextRequest('http://localhost/api/reservation', {
          method: 'PUT',
          body: JSON.stringify({
            id: mockReservation.id,
            castId: unchangedReservation.castId,
            courseId: unchangedReservation.courseId,
            startTime: unchangedReservation.startTime.toISOString(),
            endTime: unchangedReservation.endTime.toISOString(),
            designationType: unchangedReservation.designationType,
            designationFee: unchangedReservation.designationFee,
            transportationFee: unchangedReservation.transportationFee,
            additionalFee: unchangedReservation.additionalFee,
            discountAmount: unchangedReservation.discountAmount,
            paymentMethod: unchangedReservation.paymentMethod,
            options: [],
            notes: 'unchanged assignment',
          }),
        })
      )

      expect(response.status).toBe(200)
      expect(db.ngCastEntry.findUnique).not.toHaveBeenCalled()
      const persistedData = transactionContext.reservation.update.mock.calls[0]?.[0]?.data
      expect(persistedData).not.toHaveProperty('price')
      expect(persistedData).not.toHaveProperty('storeRevenue')
      expect(persistedData).not.toHaveProperty('staffRevenue')
      expect(persistedData).not.toHaveProperty('welfareExpense')
      expect(transactionContext.reservationOption.deleteMany).not.toHaveBeenCalled()
    })

    it('recomputes canonical course revenue when an admin submits forged financial values', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: {
          role: 'admin',
          adminRole: 'manager',
          permissions: ['reservation:update'],
          storeIds: ['ikebukuro'],
        },
      } as any)
      const existingReservation = {
        ...mockReservation,
        price: 30_000,
        designationType: null,
        designationFee: 0,
        transportationFee: 0,
        additionalFee: 0,
        discountAmount: 0,
        storeRevenue: 12_000,
        staffRevenue: 18_000,
        welfareExpense: 3_000,
        paymentMethod: 'cash',
        pointsUsed: 0,
        course: {
          id: 'course-123',
          name: 'Test Course',
          price: 30_000,
          storeShare: 12_000,
          castShare: 18_000,
        },
        options: [],
      }
      vi.mocked(db.reservation.findUnique).mockResolvedValue(existingReservation as any)
      const transactionContext = buildTransactionContext(existingReservation)
      vi.mocked(db.$transaction).mockImplementation(async (callback) =>
        callback(transactionContext as any)
      )

      const response = await PUT(
        new NextRequest('http://localhost/api/reservation', {
          method: 'PUT',
          body: JSON.stringify({
            id: mockReservation.id,
            price: 1,
            storeRevenue: 29_000,
            staffRevenue: 1,
          }),
        })
      )

      expect(response.status).toBe(200)
      expect(transactionContext.reservation.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            price: 30_000,
            storeRevenue: 12_000,
            staffRevenue: 18_000,
          }),
        })
      )
    })

    it('replaces and reprices ordered course snapshots when an admin updates all three slots', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: {
          role: 'admin',
          adminRole: 'manager',
          permissions: ['reservation:update'],
          storeIds: ['ikebukuro'],
        },
      } as any)
      const existingReservation = {
        ...mockReservation,
        price: 30_000,
        designationType: null,
        designationFee: 0,
        transportationFee: 0,
        additionalFee: 0,
        discountAmount: 0,
        pointsUsed: 0,
        paymentMethod: '現金',
        courseItems: [],
        course: {
          id: 'course-123',
          name: 'Test Course',
          duration: 60,
          price: 30_000,
          storeShare: 12_000,
          castShare: 18_000,
        },
        options: [],
      }
      vi.mocked(db.reservation.findUnique).mockResolvedValue(existingReservation as any)
      const transactionContext = buildTransactionContext(existingReservation, {
        coursePrice: {
          findFirst: vi.fn(),
          findMany: vi.fn().mockResolvedValue([
            {
              id: 'course-190',
              name: '190分',
              duration: 190,
              price: 30_000,
              storeShare: 10_000,
              castShare: 20_000,
            },
            {
              id: 'extension-30',
              name: '30分延長',
              duration: 30,
              price: 5_000,
              storeShare: 2_000,
              castShare: 3_000,
            },
          ]),
        },
      })
      vi.mocked(db.$transaction).mockImplementation(async (callback) =>
        callback(transactionContext as any)
      )

      const response = await PUT(
        new NextRequest('http://localhost/api/reservation', {
          method: 'PUT',
          body: JSON.stringify({
            id: mockReservation.id,
            courseId: 'course-190',
            courseIds: ['course-190', 'extension-30', 'extension-30'],
          }),
        })
      )

      expect(response.status).toBe(200)
      expect(transactionContext.reservation.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            courseId: 'course-190',
            price: 40_000,
            storeRevenue: 14_000,
            staffRevenue: 26_000,
            courseItems: [
              expect.objectContaining({ id: 'course-190', sortOrder: 0 }),
              expect.objectContaining({ id: 'extension-30', sortOrder: 1 }),
              expect.objectContaining({ id: 'extension-30', sortOrder: 2 }),
            ],
          }),
        })
      )
    })

    it('rejects customer attempts to alter reservation state or financial fields', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: 'cust-123', role: 'customer' },
      } as any)

      const request = new NextRequest('http://localhost/api/reservation', {
        method: 'PUT',
        body: JSON.stringify({
          id: 'res-123',
          status: 'completed',
          price: 1,
          designationFee: -5000,
          transportationFee: -5000,
          additionalFee: -5000,
          discountAmount: 999999,
          storeRevenue: 999999,
          staffRevenue: 999999,
          castId: 'cast-other',
          courseId: 'course-other',
          paymentMethod: 'cash',
          options: ['option-other'],
        }),
      })

      const response = await PUT(request)

      expect(response.status).toBe(403)
      await expect(response.json()).resolves.toEqual({
        error: '予約内容の変更は店舗へお問い合わせください',
      })
      expect(db.$transaction).not.toHaveBeenCalled()
    })

    it('rejects a customer PUT even when no mutable fields are supplied', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: 'cust-123', role: 'customer' },
      } as any)

      const request = new NextRequest('http://localhost/api/reservation', {
        method: 'PUT',
        body: JSON.stringify({ id: 'res-123' }),
      })

      const response = await PUT(request)

      expect(response.status).toBe(403)
      expect(db.$transaction).not.toHaveBeenCalled()
    })

    it('rejects an admin without reservation:update permission before loading the reservation', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: 'staff-1', role: 'admin', permissions: ['reservation:read'] },
      } as any)
      const request = new NextRequest('http://localhost/api/reservation', {
        method: 'PUT',
        body: JSON.stringify({ id: 'res-123', status: 'confirmed' }),
      })

      const response = await PUT(request)

      expect(response.status).toBe(403)
      expect(db.reservation.findUnique).not.toHaveBeenCalled()
      expect(db.$transaction).not.toHaveBeenCalled()
    })

    it('ignores the current reservation but rejects other overlapping reservations', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: {
          role: 'admin',
          adminRole: 'manager',
          permissions: ['reservation:update'],
          storeIds: ['ikebukuro'],
        },
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
          startTime: new Date('2099-07-04T09:00:00.000Z'),
          endTime: new Date('2099-07-04T10:00:00.000Z'),
        },
        {
          id: 'other-reservation',
          startTime: new Date('2099-07-04T09:30:00.000Z'),
          endTime: new Date('2099-07-04T11:00:00.000Z'),
        },
      ] as any)

      const request = new NextRequest('http://localhost/api/reservation', {
        method: 'PUT',
        body: JSON.stringify({
          id: 'res-123',
          startTime: '2099-07-04T18:00:00+09:00',
          endTime: '2099-07-04T19:00:00+09:00',
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
            startTime: '2099-07-04T09:30:00.000Z',
            endTime: '2099-07-04T11:00:00.000Z',
          },
        ],
      })
      expect(db.$transaction).not.toHaveBeenCalled()
    })
  })

  describe('DELETE endpoint permissions', () => {
    it('rejects an admin without reservation:delete permission before loading the reservation', async () => {
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: 'staff-1', role: 'admin', permissions: ['reservation:read'] },
      } as any)
      const request = new NextRequest('http://localhost/api/reservation?id=res-123', {
        method: 'DELETE',
      })

      const response = await DELETE(request)

      expect(response.status).toBe(403)
      expect(db.reservation.findFirst).not.toHaveBeenCalled()
      expect(db.reservation.update).not.toHaveBeenCalled()
    })

    it('sanitizes the cancelled reservation returned to its customer', async () => {
      const futureReservation = {
        ...mockReservation,
        startTime: new Date('2099-07-04T09:00:00.000Z'),
        endTime: new Date('2099-07-04T10:00:00.000Z'),
        storeRevenue: 12_000,
        staffRevenue: 18_000,
        welfareExpense: 3_000,
        entryReceivedBy: 'staff-secret-id',
      }
      vi.mocked(getServerSession).mockResolvedValue({
        user: { id: 'cust-123', role: 'customer' },
      } as any)
      vi.mocked(db.reservation.findFirst).mockResolvedValue(futureReservation as any)
      vi.mocked(db.reservation.update).mockResolvedValue({
        ...futureReservation,
        status: 'cancelled',
      } as any)

      const response = await DELETE(
        new NextRequest('http://localhost/api/reservation?id=res-123', { method: 'DELETE' })
      )
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data).toMatchObject({ id: 'res-123', status: 'cancelled' })
      expect(JSON.stringify(data)).not.toMatch(
        /storeRevenue|staffRevenue|welfareExpense|entryReceivedBy|staff-secret-id/
      )
    })
  })
})
