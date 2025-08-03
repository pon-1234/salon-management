/**
 * @design_doc   Integration tests for reservation API with notifications
 * @related_to   reservation/route.ts, notification/service.ts
 * @known_issues None currently
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from './route'
import { db } from '@/lib/db'
// Mock checkCastAvailability since it's now internal to route.ts
import { NotificationService } from '@/lib/notification/service'
import { getServerSession } from 'next-auth'

// Mock dependencies
vi.mock('@/lib/db', () => ({
  db: {
    reservation: {
      create: vi.fn(),
    },
    $transaction: vi.fn((callback) =>
      callback({
        reservation: {
          create: vi.fn(),
        },
      })
    ),
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

describe('Reservation API - Notification Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should send notification when reservation is created successfully', async () => {
    // Mock session
    vi.mocked(getServerSession).mockResolvedValueOnce(null)

    // Availability check is handled within the transaction

    // Mock customer data with preferences
    const mockReservation = {
      id: 'reservation1',
      customerId: 'customer1',
      castId: 'cast1',
      courseId: 'course1',
      startTime: new Date('2025-07-10T10:00:00Z'),
      endTime: new Date('2025-07-10T11:00:00Z'),
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

    // Get the mocked notification function
    const notificationModule = (await import('@/lib/notification/service')) as any
    const mockSendReservationConfirmation = notificationModule.mockSendReservationConfirmation
    mockSendReservationConfirmation.mockResolvedValueOnce(undefined)

    const reservationData = {
      customerId: 'customer1',
      castId: 'cast1',
      courseId: 'course1',
      startTime: '2025-07-10T10:00:00Z',
      endTime: '2025-07-10T11:00:00Z',
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
    vi.mocked(getServerSession).mockResolvedValueOnce(null)

    // Availability check is handled within the transaction

    const mockReservation = {
      id: 'reservation1',
      customerId: 'customer1',
      castId: 'cast1',
      courseId: 'course1',
      startTime: new Date('2025-07-10T10:00:00Z'),
      endTime: new Date('2025-07-10T11:00:00Z'),
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
      startTime: '2025-07-10T10:00:00Z',
      endTime: '2025-07-10T11:00:00Z',
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
