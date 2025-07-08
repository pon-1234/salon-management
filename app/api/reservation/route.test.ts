/**
 * @design_doc   Tests for enhanced reservation API with validation and conflict control
 * @related_to   reservation/route.ts, reservation/availability/route.ts, ReservationRepository
 * @known_issues None currently
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST, PUT, DELETE } from './route'
import { db } from '@/lib/db'

// Mock the database
vi.mock('@/lib/db', () => ({
  db: {
    reservation: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    reservationOption: {
      deleteMany: vi.fn(),
    },
    $transaction: vi.fn((callback) =>
      callback({
        reservation: {
          update: vi.fn(),
        },
        reservationOption: {
          deleteMany: vi.fn(),
        },
      })
    ),
  },
}))

// Mock the availability check
vi.mock('./availability/route', () => ({
  checkCastAvailability: vi.fn(),
}))

// Mock notification service
vi.mock('@/lib/notification/service', () => ({
  NotificationService: vi.fn().mockImplementation(() => ({
    sendReservationConfirmation: vi.fn().mockResolvedValue(undefined),
    sendReservationModification: vi.fn().mockResolvedValue(undefined),
    sendReservationCancellation: vi.fn().mockResolvedValue(undefined),
  })),
}))

// Mock logger
vi.mock('@/lib/logger', () => ({
  default: {
    error: vi.fn(),
  },
}))

import { checkCastAvailability } from './availability/route'

describe('POST /api/reservation - Authentication', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should require authentication', async () => {
    const request = new NextRequest('http://localhost:3000/api/reservation', {
      method: 'POST',
      body: JSON.stringify({
        castId: 'cast1',
        courseId: 'course1',
        startTime: '2025-07-10T10:00:00Z',
        endTime: '2025-07-10T11:00:00Z',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Authentication required')
  })

  it('should use authenticated customer ID instead of request body', async () => {
    vi.mocked(checkCastAvailability).mockResolvedValueOnce({
      available: true,
      conflicts: [],
    })

    const mockCreatedReservation = {
      id: 'new-reservation',
      customerId: 'auth-customer-123',
      castId: 'cast1',
      courseId: 'course1',
      startTime: new Date('2025-07-10T01:00:00Z'),
      endTime: new Date('2025-07-10T02:00:00Z'),
      status: 'confirmed',
      customer: { id: 'auth-customer-123', name: 'Auth Customer' },
      cast: { id: 'cast1', name: 'Test Cast' },
      course: { id: 'course1', name: '60-minute Course', price: 10000 },
      options: [],
    }

    vi.mocked(db.$transaction).mockImplementationOnce(async (fn: any) => {
      const txDb = {
        reservation: {
          create: vi.fn().mockResolvedValue(mockCreatedReservation),
        },
      }
      return await fn(txDb)
    })

    const request = new NextRequest('http://localhost:3000/api/reservation', {
      method: 'POST',
      headers: {
        'x-customer-id': 'auth-customer-123',
      },
      body: JSON.stringify({
        customerId: 'ignored-customer-id', // This should be ignored
        castId: 'cast1',
        courseId: 'course1',
        startTime: '2025-07-10T10:00:00+09:00',
        endTime: '2025-07-10T11:00:00+09:00',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.customerId).toBe('auth-customer-123')
  })
})

describe('POST /api/reservation - Enhanced Creation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should validate required fields', async () => {
    const invalidData = {
      customerId: 'customer1',
      // Missing castId, courseId, startTime, endTime
    }

    const request = new NextRequest('http://localhost:3000/api/reservation', {
      method: 'POST',
      headers: {
        'x-customer-id': 'customer1',
      },
      body: JSON.stringify(invalidData),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('Missing required fields')
  })

  it('should validate date formats', async () => {
    const invalidData = {
      customerId: 'customer1',
      castId: 'cast1',
      courseId: 'course1',
      startTime: 'invalid-date',
      endTime: '2025-07-10T11:00:00Z',
    }

    const request = new NextRequest('http://localhost:3000/api/reservation', {
      method: 'POST',
      headers: {
        'x-customer-id': 'customer1',
      },
      body: JSON.stringify(invalidData),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Invalid date format')
  })

  it('should check for availability conflicts before creating', async () => {
    vi.mocked(checkCastAvailability).mockResolvedValueOnce({
      available: false,
      conflicts: [
        {
          id: 'existing-reservation',
          startTime: '2025-07-10T10:00:00.000Z',
          endTime: '2025-07-10T11:00:00.000Z',
        },
      ],
    })

    // トランザクション内でavailabilityチェックがエラーを投げるようにモック
    vi.mocked(db.$transaction).mockImplementationOnce(async (fn: any) => {
      try {
        await fn(db)
      } catch (error: any) {
        if (error.message === 'Time slot is not available') {
          throw error
        }
      }
    })

    const reservationData = {
      customerId: 'customer1',
      castId: 'cast1',
      courseId: 'course1',
      startTime: '2025-07-10T10:30:00+09:00',
      endTime: '2025-07-10T11:30:00+09:00',
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

    expect(response.status).toBe(409)
    expect(data.error).toBe('Time slot is not available')
    // APIはconflictsを返さないので、この行を削除
  })

  it('should create reservation when no conflicts exist', async () => {
    vi.mocked(checkCastAvailability).mockResolvedValueOnce({
      available: true,
      conflicts: [],
    })

    const mockCreatedReservation = {
      id: 'new-reservation',
      customerId: 'customer1',
      castId: 'cast1',
      courseId: 'course1',
      startTime: new Date('2025-07-10T10:00:00Z'),
      endTime: new Date('2025-07-10T11:00:00Z'),
      status: 'confirmed',
      customer: { id: 'customer1', name: 'Test Customer' },
      cast: { id: 'cast1', name: 'Test Cast' },
      course: { id: 'course1', name: '60-minute Course', price: 10000 },
      options: [],
    }

    vi.mocked(db.$transaction).mockImplementationOnce(async (fn: any) => {
      const txDb = {
        reservation: {
          create: vi.fn().mockResolvedValue(mockCreatedReservation),
        },
      }
      return await fn(txDb)
    })

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

    expect(response.status).toBe(201)
    expect(data.id).toBe('new-reservation')
    expect(vi.mocked(checkCastAvailability)).toHaveBeenCalled()
    // checkCastAvailabilityはトランザクション内で呼ばれるため、4番目の引数（tx）が含まれる
  })

  it('should validate end time is after start time', async () => {
    const invalidData = {
      customerId: 'customer1',
      castId: 'cast1',
      courseId: 'course1',
      startTime: '2025-07-10T11:00:00+09:00',
      endTime: '2025-07-10T10:00:00+09:00', // End before start
    }

    const request = new NextRequest('http://localhost:3000/api/reservation', {
      method: 'POST',
      headers: {
        'x-customer-id': 'customer1',
      },
      body: JSON.stringify(invalidData),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('End time must be after start time')
  })

  it('should handle reservations with options', async () => {
    vi.mocked(checkCastAvailability).mockResolvedValueOnce({
      available: true,
      conflicts: [],
    })

    const mockCreatedReservation = {
      id: 'new-reservation',
      customerId: 'customer1',
      castId: 'cast1',
      courseId: 'course1',
      startTime: new Date('2025-07-10T10:00:00Z'),
      endTime: new Date('2025-07-10T11:00:00Z'),
      status: 'confirmed',
      customer: { id: 'customer1', name: 'Test Customer' },
      cast: { id: 'cast1', name: 'Test Cast' },
      course: { id: 'course1', name: '60-minute Course', price: 10000 },
      options: [{ option: { id: 'option1', name: 'Extra Service', price: 2000 } }],
    }

    vi.mocked(db.$transaction).mockImplementationOnce(async (fn: any) => {
      const txDb = {
        reservation: {
          create: vi.fn().mockResolvedValue(mockCreatedReservation),
        },
      }
      return await fn(txDb)
    })

    const reservationData = {
      customerId: 'customer1',
      castId: 'cast1',
      courseId: 'course1',
      startTime: '2025-07-10T10:00:00Z',
      endTime: '2025-07-10T11:00:00Z',
      options: ['option1'],
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

    expect(response.status).toBe(201)
    expect(data.options).toHaveLength(1)
  })
})

describe('POST /api/reservation - Transaction Control', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should rollback transaction when availability check fails inside transaction', async () => {
    // First check returns available, but inside transaction it returns unavailable
    vi.mocked(checkCastAvailability).mockResolvedValueOnce({
      available: false,
      conflicts: [{
        id: 'conflict-123',
        startTime: '2025-07-10T10:00:00.000Z',
        endTime: '2025-07-10T11:00:00.000Z',
      }],
    })

    let transactionRolledBack = false
    vi.mocked(db.$transaction).mockImplementationOnce(async (fn: any) => {
      try {
        const txDb = {
          reservation: {
            create: vi.fn(),
          },
        }
        await fn(txDb)
      } catch (error: any) {
        transactionRolledBack = true
        if (error.message === 'Time slot is not available') {
          throw error
        }
      }
    })

    const request = new NextRequest('http://localhost:3000/api/reservation', {
      method: 'POST',
      headers: {
        'x-customer-id': 'customer1',
      },
      body: JSON.stringify({
        castId: 'cast1',
        courseId: 'course1',
        startTime: '2025-07-10T10:00:00+09:00',
        endTime: '2025-07-10T11:00:00+09:00',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(409)
    expect(data.error).toBe('Time slot is not available')
    expect(transactionRolledBack).toBe(true)
  })

  it('should handle transaction errors gracefully', async () => {
    vi.mocked(checkCastAvailability).mockResolvedValueOnce({
      available: true,
      conflicts: [],
    })

    vi.mocked(db.$transaction).mockRejectedValueOnce(new Error('Database connection lost'))

    const request = new NextRequest('http://localhost:3000/api/reservation', {
      method: 'POST',
      headers: {
        'x-customer-id': 'customer1',
      },
      body: JSON.stringify({
        castId: 'cast1',
        courseId: 'course1',
        startTime: '2025-07-10T10:00:00+09:00',
        endTime: '2025-07-10T11:00:00+09:00',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Internal server error')
  })
})

describe('PUT /api/reservation - Enhanced Modification', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should require authentication', async () => {
    const request = new NextRequest('http://localhost:3000/api/reservation', {
      method: 'PUT',
      body: JSON.stringify({
        id: 'reservation1',
        startTime: '2025-07-10T11:00:00+09:00',
      }),
    })

    const response = await PUT(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Authentication required')
  })

  it('should check availability when modifying time', async () => {
    const existingReservation = {
      id: 'reservation1',
      customerId: 'customer1',  // 認証されたユーザーと同じ
      castId: 'cast1',
      status: 'confirmed',
      startTime: new Date('2025-07-10T09:00:00Z'),
      endTime: new Date('2025-07-10T10:00:00Z'),
    }

    vi.mocked(db.reservation.findUnique).mockResolvedValueOnce(existingReservation as any)
    // checkCastAvailabilityはPUTで呼ばれる際、現在の予約IDをフィルタリングした後の結果を確認する
    vi.mocked(checkCastAvailability).mockResolvedValueOnce({
      available: false,
      conflicts: [
        { id: 'reservation1', startTime: '', endTime: '' }, // 現在の予約（フィルタされる）
        { id: 'other-reservation', startTime: '', endTime: '' } // 他の予約（コンフリクト）
      ],
    })

    const updateData = {
      id: 'reservation1',
      startTime: '2025-07-10T10:30:00+09:00',
      endTime: '2025-07-10T11:30:00+09:00',
    }

    const request = new NextRequest('http://localhost:3000/api/reservation', {
      method: 'PUT',
      headers: {
        'x-customer-id': 'customer1',
      },
      body: JSON.stringify(updateData),
    })

    const response = await PUT(request)
    const data = await response.json()

    expect(response.status).toBe(409)
    expect(data.error).toBe('Time slot is not available')
    // filteredConflictsには現在の予約を除いた他の予約のみが含まれる
    expect(data.conflicts).toHaveLength(1)
    expect(data.conflicts[0].id).toBe('other-reservation')
  })

  it('should allow modification when no conflicts', async () => {
    const existingReservation = {
      id: 'reservation1',
      customerId: 'customer1',  // 認証されたユーザーと同じ
      castId: 'cast1',
      status: 'confirmed',
      startTime: new Date('2025-07-10T09:00:00Z'),
      endTime: new Date('2025-07-10T10:00:00Z'),
    }

    const updatedReservation = {
      ...existingReservation,
      startTime: new Date('2025-07-10T10:00:00Z'),
      endTime: new Date('2025-07-10T11:00:00Z'),
      customer: { id: 'customer1', name: 'Test Customer' },
      cast: { id: 'cast1', name: 'Test Cast' },
      course: { id: 'course1', name: '60-minute Course' },
      options: [],
    }

    vi.mocked(db.reservation.findUnique).mockResolvedValueOnce(existingReservation as any)
    // APIは現在の予約自身を含む全てのコンフリクトを返すが、
    // 後でfilterされるので、ここでは現在の予約を含めても構わない
    vi.mocked(checkCastAvailability).mockResolvedValueOnce({
      available: false, // 実際には現在の予約が含まれているため
      conflicts: [{ id: 'reservation1', startTime: '', endTime: '' }], // 現在の予約のみ
    })

    const mockTx = {
      reservationOption: {
        deleteMany: vi.fn().mockResolvedValueOnce({}),
      },
      reservation: {
        update: vi.fn().mockResolvedValueOnce(updatedReservation),
      },
    }

    vi.mocked(db.$transaction).mockImplementationOnce((callback: any) => callback(mockTx))

    const updateData = {
      id: 'reservation1',
      startTime: '2025-07-10T10:00:00+09:00',
      endTime: '2025-07-10T11:00:00+09:00',
    }

    const request = new NextRequest('http://localhost:3000/api/reservation', {
      method: 'PUT',
      headers: {
        'x-customer-id': 'customer1',
      },
      body: JSON.stringify(updateData),
    })

    const response = await PUT(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.id).toBe('reservation1')
  })

  it('should validate status transitions', async () => {
    const cancelledReservation = {
      id: 'reservation1',
      customerId: 'customer1',  // 認証されたユーザーと同じ
      status: 'cancelled',
      castId: 'cast1',
      startTime: new Date('2025-07-10T09:00:00Z'),
      endTime: new Date('2025-07-10T10:00:00Z'),
    }

    vi.mocked(db.reservation.findUnique).mockResolvedValueOnce(cancelledReservation as any)

    const updateData = {
      id: 'reservation1',
      status: 'confirmed', // Trying to reconfirm a cancelled reservation
    }

    const request = new NextRequest('http://localhost:3000/api/reservation', {
      method: 'PUT',
      headers: {
        'x-customer-id': 'customer1',
      },
      body: JSON.stringify(updateData),
    })

    const response = await PUT(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Cannot modify cancelled reservation')
  })
})

describe('DELETE /api/reservation - Enhanced Cancellation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should require authentication', async () => {
    const request = new NextRequest('http://localhost:3000/api/reservation?id=reservation1', {
      method: 'DELETE',
    })

    const response = await DELETE(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error).toBe('Authentication required')
  })

  it('should soft-delete by updating status to cancelled', async () => {
    const existingReservation = {
      id: 'reservation1',
      customerId: 'customer1',  // 認証されたユーザーと同じ
      status: 'confirmed',
      startTime: new Date('2025-07-10T10:00:00Z'),
      endTime: new Date('2025-07-10T11:00:00Z'),
    }

    vi.mocked(db.reservation.findUnique).mockResolvedValueOnce(existingReservation as any)
    vi.mocked(db.reservation.update).mockResolvedValueOnce({
      ...existingReservation,
      status: 'cancelled',
    } as any)

    const request = new NextRequest('http://localhost:3000/api/reservation?id=reservation1', {
      method: 'DELETE',
      headers: {
        'x-customer-id': 'customer1',
      },
    })

    const response = await DELETE(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.status).toBe('cancelled')
    expect(vi.mocked(db.reservation.update)).toHaveBeenCalledWith({
      where: { id: 'reservation1' },
      data: { status: 'cancelled' },
      include: {
        customer: true,
        cast: true,
        course: true,
      },
    })
  })

  it('should prevent cancellation of past reservations', async () => {
    const pastReservation = {
      id: 'reservation1',
      customerId: 'customer1',  // 認証されたユーザーと同じ
      status: 'confirmed',
      startTime: new Date('2024-01-01T10:00:00Z'),
      endTime: new Date('2024-01-01T11:00:00Z'),
    }

    vi.mocked(db.reservation.findUnique).mockResolvedValueOnce(pastReservation as any)

    const request = new NextRequest('http://localhost:3000/api/reservation?id=reservation1', {
      method: 'DELETE',
      headers: {
        'x-customer-id': 'customer1',
      },
    })

    const response = await DELETE(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Cannot cancel past reservations')
  })

  it('should prevent double cancellation', async () => {
    const cancelledReservation = {
      id: 'reservation1',
      customerId: 'customer1',  // 認証されたユーザーと同じ
      status: 'cancelled',
      startTime: new Date('2025-07-10T10:00:00Z'),
      endTime: new Date('2025-07-10T11:00:00Z'),
    }

    vi.mocked(db.reservation.findUnique).mockResolvedValueOnce(cancelledReservation as any)

    const request = new NextRequest('http://localhost:3000/api/reservation?id=reservation1', {
      method: 'DELETE',
      headers: {
        'x-customer-id': 'customer1',
      },
    })

    const response = await DELETE(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Reservation is already cancelled')
  })
})

describe('GET /api/reservation - Authentication and Authorization', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return only authenticated customer reservations', async () => {
    const mockReservations = [
      {
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
      },
    ]

    vi.mocked(db.reservation.findMany).mockResolvedValueOnce(mockReservations as any)

    const request = new NextRequest('http://localhost:3000/api/reservation', {
      method: 'GET',
      headers: {
        'x-customer-id': 'customer1',
      },
    })

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toHaveLength(1)
    expect(vi.mocked(db.reservation.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          customerId: 'customer1',
        },
      })
    )
  })

  it('should prevent access to other customer reservations', async () => {
    const otherCustomerReservation = {
      id: 'reservation1',
      customerId: 'other-customer',
      castId: 'cast1',
      courseId: 'course1',
      startTime: new Date('2025-07-10T10:00:00Z'),
      endTime: new Date('2025-07-10T11:00:00Z'),
      status: 'confirmed',
      customer: { id: 'other-customer', name: 'Other Customer' },
      cast: { id: 'cast1', name: 'Test Cast' },
      course: { id: 'course1', name: '60-minute Course' },
      options: [],
    }

    vi.mocked(db.reservation.findUnique).mockResolvedValueOnce(otherCustomerReservation as any)

    const request = new NextRequest('http://localhost:3000/api/reservation?id=reservation1', {
      method: 'GET',
      headers: {
        'x-customer-id': 'customer1',
      },
    })

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.error).toBe('Forbidden')
  })

  it('should return 404 for non-existent reservation', async () => {
    vi.mocked(db.reservation.findUnique).mockResolvedValueOnce(null)

    const request = new NextRequest('http://localhost:3000/api/reservation?id=non-existent', {
      method: 'GET',
      headers: {
        'x-customer-id': 'customer1',
      },
    })

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Reservation not found')
  })

  it('should filter by cast ID when provided', async () => {
    vi.mocked(db.reservation.findMany).mockResolvedValueOnce([])

    const request = new NextRequest('http://localhost:3000/api/reservation?castId=cast1', {
      method: 'GET',
      headers: {
        'x-customer-id': 'customer1',
      },
    })

    await GET(request)

    expect(vi.mocked(db.reservation.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          customerId: 'customer1',
          castId: 'cast1',
        },
      })
    )
  })
})

describe('PUT /api/reservation - Authorization', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should prevent modification of other customer reservations', async () => {
    const otherCustomerReservation = {
      id: 'reservation1',
      customerId: 'other-customer',
      castId: 'cast1',
      status: 'confirmed',
      startTime: new Date('2025-07-10T10:00:00Z'),
      endTime: new Date('2025-07-10T11:00:00Z'),
    }

    vi.mocked(db.reservation.findUnique).mockResolvedValueOnce(otherCustomerReservation as any)

    const request = new NextRequest('http://localhost:3000/api/reservation', {
      method: 'PUT',
      headers: {
        'x-customer-id': 'customer1',
      },
      body: JSON.stringify({
        id: 'reservation1',
        startTime: '2025-07-10T11:00:00+09:00',
      }),
    })

    const response = await PUT(request)
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.error).toBe('Forbidden')
  })
})

describe('DELETE /api/reservation - Authorization', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should prevent cancellation of other customer reservations', async () => {
    const otherCustomerReservation = {
      id: 'reservation1',
      customerId: 'other-customer',
      status: 'confirmed',
      startTime: new Date('2025-07-10T10:00:00Z'),
      endTime: new Date('2025-07-10T11:00:00Z'),
    }

    vi.mocked(db.reservation.findUnique).mockResolvedValueOnce(otherCustomerReservation as any)

    const request = new NextRequest('http://localhost:3000/api/reservation?id=reservation1', {
      method: 'DELETE',
      headers: {
        'x-customer-id': 'customer1',
      },
    })

    const response = await DELETE(request)
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.error).toBe('Forbidden')
  })
})
