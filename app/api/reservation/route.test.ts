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

import { checkCastAvailability } from './availability/route'

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

    const reservationData = {
      customerId: 'customer1',
      castId: 'cast1',
      courseId: 'course1',
      startTime: '2025-07-10T10:30:00Z',
      endTime: '2025-07-10T11:30:00Z',
    }

    const request = new NextRequest('http://localhost:3000/api/reservation', {
      method: 'POST',
      body: JSON.stringify(reservationData),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(409)
    expect(data.error).toBe('Time slot is not available')
    expect(data.conflicts).toHaveLength(1)
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

    vi.mocked(db.reservation.create).mockResolvedValueOnce(mockCreatedReservation as any)

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
    expect(data.id).toBe('new-reservation')
    expect(vi.mocked(checkCastAvailability)).toHaveBeenCalledWith(
      'cast1',
      new Date('2025-07-10T10:00:00Z'),
      new Date('2025-07-10T11:00:00Z')
    )
  })

  it('should validate end time is after start time', async () => {
    const invalidData = {
      customerId: 'customer1',
      castId: 'cast1',
      courseId: 'course1',
      startTime: '2025-07-10T11:00:00Z',
      endTime: '2025-07-10T10:00:00Z', // End before start
    }

    const request = new NextRequest('http://localhost:3000/api/reservation', {
      method: 'POST',
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

    vi.mocked(db.reservation.create).mockResolvedValueOnce(mockCreatedReservation as any)

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
      body: JSON.stringify(reservationData),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.options).toHaveLength(1)
  })
})

describe('PUT /api/reservation - Enhanced Modification', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should check availability when modifying time', async () => {
    const existingReservation = {
      id: 'reservation1',
      castId: 'cast1',
      startTime: new Date('2025-07-10T09:00:00Z'),
      endTime: new Date('2025-07-10T10:00:00Z'),
    }

    vi.mocked(db.reservation.findUnique).mockResolvedValueOnce(existingReservation as any)
    vi.mocked(checkCastAvailability).mockResolvedValueOnce({
      available: false,
      conflicts: [{ id: 'other-reservation', startTime: '', endTime: '' }],
    })

    const updateData = {
      id: 'reservation1',
      startTime: '2025-07-10T10:30:00Z',
      endTime: '2025-07-10T11:30:00Z',
    }

    const request = new NextRequest('http://localhost:3000/api/reservation', {
      method: 'PUT',
      body: JSON.stringify(updateData),
    })

    const response = await PUT(request)
    const data = await response.json()

    expect(response.status).toBe(409)
    expect(data.error).toBe('Time slot is not available')
  })

  it('should allow modification when no conflicts', async () => {
    const existingReservation = {
      id: 'reservation1',
      castId: 'cast1',
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
    vi.mocked(checkCastAvailability).mockResolvedValueOnce({
      available: true,
      conflicts: [],
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
      startTime: '2025-07-10T10:00:00Z',
      endTime: '2025-07-10T11:00:00Z',
    }

    const request = new NextRequest('http://localhost:3000/api/reservation', {
      method: 'PUT',
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

  it('should soft-delete by updating status to cancelled', async () => {
    const existingReservation = {
      id: 'reservation1',
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
      status: 'confirmed',
      startTime: new Date('2024-01-01T10:00:00Z'),
      endTime: new Date('2024-01-01T11:00:00Z'),
    }

    vi.mocked(db.reservation.findUnique).mockResolvedValueOnce(pastReservation as any)

    const request = new NextRequest('http://localhost:3000/api/reservation?id=reservation1', {
      method: 'DELETE',
    })

    const response = await DELETE(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Cannot cancel past reservations')
  })

  it('should prevent double cancellation', async () => {
    const cancelledReservation = {
      id: 'reservation1',
      status: 'cancelled',
      startTime: new Date('2025-07-10T10:00:00Z'),
      endTime: new Date('2025-07-10T11:00:00Z'),
    }

    vi.mocked(db.reservation.findUnique).mockResolvedValueOnce(cancelledReservation as any)

    const request = new NextRequest('http://localhost:3000/api/reservation?id=reservation1', {
      method: 'DELETE',
    })

    const response = await DELETE(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Reservation is already cancelled')
  })
})
