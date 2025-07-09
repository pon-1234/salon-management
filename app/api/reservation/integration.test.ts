/**
 * @design_doc   Integration tests for reservation API with notifications
 * @related_to   reservation/route.ts, notification/service.ts
 * @known_issues None currently
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from './route'
import { db } from '@/lib/db'
import { checkCastAvailability } from './availability/route'
import { NotificationService } from '@/lib/notification/service'

// Mock dependencies
vi.mock('@/lib/db', () => ({
  db: {
    reservation: {
      create: vi.fn(),
    },
  },
}))

vi.mock('./availability/route', () => ({
  checkCastAvailability: vi.fn(),
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
    // Mock availability check to succeed
    vi.mocked(checkCastAvailability).mockResolvedValueOnce({
      available: true,
      conflicts: [],
    })

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

    vi.mocked(db.reservation.create).mockResolvedValueOnce(mockReservation as any)

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
      body: JSON.stringify(reservationData),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.id).toBe('reservation1')

    // Verify notification was sent
    expect(mockSendReservationConfirmation).toHaveBeenCalledWith(mockReservation)
  })

  it('should not fail reservation creation if notification fails', async () => {
    // Mock availability check to succeed
    vi.mocked(checkCastAvailability).mockResolvedValueOnce({
      available: true,
      conflicts: [],
    })

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

    vi.mocked(db.reservation.create).mockResolvedValueOnce(mockReservation as any)

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
      body: JSON.stringify(reservationData),
    })

    // Should not throw even if notification fails
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.id).toBe('reservation1')
    expect(mockSendReservationConfirmation).toHaveBeenCalled()
  })
})
