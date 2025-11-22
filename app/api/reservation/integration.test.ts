/**
 * @design_doc   Integration tests for reservation API with notifications
 * @related_to   reservation/route.ts, notification/service.ts
 * @known_issues None currently
 */
import { describe, it, expect, beforeEach, vi, beforeAll } from 'vitest'
import { NextRequest } from 'next/server'
import { getServerSession } from 'next-auth'

// Mock dependencies
vi.mock('@/lib/db', () => ({
  db: {
    reservation: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
    $transaction: vi.fn((callback) =>
      callback({
        reservation: {
          create: vi.fn(),
          findMany: vi.fn(),
        },
      })
    ),
    cast: {
      findFirst: vi.fn(),
    },
    customer: {
      findUnique: vi.fn(),
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
    store: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
  },
}))

// Mock is handled inline in the transaction mock

vi.mock('@/lib/logger', () => ({
  default: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}))

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}))

vi.mock('@/lib/auth/config', () => ({
  authOptions: {},
}))

vi.mock('@/lib/notification/service', () => {
  const mockSendReservationConfirmation = vi.fn()
  const mockSendReservationModification = vi.fn()
  const mockSendReservationCancellation = vi.fn()

  return {
    NotificationService: vi.fn(() => ({
      sendReservationConfirmation: mockSendReservationConfirmation,
      sendReservationModification: mockSendReservationModification,
      sendReservationCancellation: mockSendReservationCancellation,
      sendBulkNotifications: vi.fn(),
      getNotificationHistory: vi.fn(),
      getFailedNotifications: vi.fn(),
      retryFailedNotifications: vi.fn(),
    })),
    mockSendReservationConfirmation,
    mockSendReservationModification,
    mockSendReservationCancellation,
  }
})

let POST: typeof import('./route')['POST']
let db: typeof import('@/lib/db')['db']

beforeAll(async () => {
  ;({ db } = await import('@/lib/db'))
  ;({ POST } = await import('./route'))
})

describe('Reservation API - Notification Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(db.store.findUnique).mockResolvedValue({ id: 'store-1' } as any)
  })

  it('should send notification when reservation is created successfully', async () => {
    // Mock session
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: {
        id: 'admin-1',
        role: 'admin',
        permissions: ['*'],
      },
    } as any)

    // Availability check is handled within the transaction

    // Mock customer data with preferences
    const startTime = new Date(Date.now() + 24 * 60 * 60 * 1000)
    const endTime = new Date(startTime.getTime() + 60 * 60 * 1000)

    const mockReservation = {
      id: 'reservation1',
      customerId: 'customer1',
      castId: 'cast1',
      courseId: 'course1',
      startTime,
      endTime,
      status: 'confirmed',
      customer: {
        id: 'customer1',
        name: 'Test Customer',
        email: 'test@example.com',
        phone: '+1234567890',
        preferences: {
          emailNotifications: true,
          smsNotifications: true,
          pushNotifications: true,
        },
      },
      cast: {
        id: 'cast1',
        name: 'Test Cast',
      },
      course: {
        id: 'course1',
        name: '60-minute Course',
        price: 10000,
      },
      options: [],
    }

    // Mock the transaction to return the reservation with includes
    vi.mocked(db.$transaction).mockImplementationOnce(async (callback: any) => {
      const tx = {
        reservation: {
          create: vi.fn().mockResolvedValueOnce(mockReservation),
          findMany: vi.fn().mockResolvedValueOnce([]), // No conflicts
        },
      }
      return callback(tx)
    })
    vi.mocked(db.reservation.findMany).mockResolvedValueOnce([])
    vi.mocked(db.cast.findFirst).mockResolvedValueOnce({
      id: 'cast1',
      storeId: 'store-1',
    } as any)
    vi.mocked(db.customer.findUnique).mockResolvedValueOnce({
      id: 'customer1',
      name: 'Test Customer',
    } as any)
    vi.mocked(db.coursePrice.findFirst).mockResolvedValueOnce({
      id: 'course1',
      name: '60-minute Course',
    } as any)
    vi.mocked(db.areaInfo.findFirst).mockResolvedValueOnce(null as any)
    vi.mocked(db.stationInfo.findFirst).mockResolvedValueOnce(null as any)
    vi.mocked(db.reservation.findMany).mockResolvedValueOnce([])
    vi.mocked(db.cast.findFirst).mockResolvedValueOnce({
      id: 'cast1',
      storeId: 'store-1',
    } as any)
    vi.mocked(db.customer.findUnique).mockResolvedValueOnce({
      id: 'customer1',
      name: 'Test Customer',
    } as any)
    vi.mocked(db.coursePrice.findFirst).mockResolvedValueOnce({
      id: 'course1',
      name: '60-minute Course',
    } as any)
    vi.mocked(db.areaInfo.findFirst).mockResolvedValueOnce(null as any)
    vi.mocked(db.stationInfo.findFirst).mockResolvedValueOnce(null as any)

    // Get the mocked notification function
    const notificationModule = (await import('@/lib/notification/service')) as any
    const mockSendReservationConfirmation = notificationModule.mockSendReservationConfirmation
    mockSendReservationConfirmation.mockResolvedValueOnce(undefined)

    const reservationData = {
      customerId: 'customer1',
      castId: 'cast1',
      courseId: 'course1',
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
    }

    const request = new NextRequest('http://localhost:3000/api/reservation', {
      method: 'POST',
      headers: {
        'x-customer-id': 'customer1',
      },
      body: JSON.stringify(reservationData),
    })

    const response = await POST(request)
    const data = await response.json()

    if (response.status !== 201) {
      console.error('Response:', data)
    }

    expect(response.status).toBe(201)
    expect(data.id).toBe('reservation1')

    // Verify notification was sent
    expect(mockSendReservationConfirmation).toHaveBeenCalledWith(mockReservation)
  })

  it('should not fail reservation creation if notification fails', async () => {
    // Mock session
    vi.mocked(getServerSession).mockResolvedValueOnce({
      user: {
        id: 'admin-1',
        role: 'admin',
        permissions: ['*'],
      },
    } as any)

    // Availability check is handled within the transaction

    const startTime = new Date(Date.now() + 24 * 60 * 60 * 1000)
    const endTime = new Date(startTime.getTime() + 60 * 60 * 1000)

    const mockReservation = {
      id: 'reservation1',
      customerId: 'customer1',
      castId: 'cast1',
      courseId: 'course1',
      startTime,
      endTime,
      status: 'confirmed',
      customer: { id: 'customer1', name: 'Test Customer' },
      cast: { id: 'cast1', name: 'Test Cast' },
      course: { id: 'course1', name: '60-minute Course' },
      options: [],
    }

    // Mock the transaction to return the reservation with includes
    vi.mocked(db.$transaction).mockImplementationOnce(async (callback: any) => {
      const tx = {
        reservation: {
          create: vi.fn().mockResolvedValueOnce(mockReservation),
          findMany: vi.fn().mockResolvedValueOnce([]), // No conflicts
        },
      }
      return callback(tx)
    })

    // Mock notification service to throw error
    const notificationModule = (await import('@/lib/notification/service')) as any
    const mockSendReservationConfirmation = notificationModule.mockSendReservationConfirmation
    mockSendReservationConfirmation.mockRejectedValueOnce(new Error('Notification failed'))

    const reservationData = {
      customerId: 'customer1',
      castId: 'cast1',
      courseId: 'course1',
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
    }

    const request = new NextRequest('http://localhost:3000/api/reservation', {
      method: 'POST',
      headers: {
        'x-customer-id': 'customer1',
      },
      body: JSON.stringify(reservationData),
    })

    // Should not throw even if notification fails
    const response = await POST(request)
    const data = await response.json()

    if (response.status !== 201) {
      console.error('Response:', data)
    }

    expect(response.status).toBe(201)
    expect(data.id).toBe('reservation1')
    expect(mockSendReservationConfirmation).toHaveBeenCalled()
  })
})
