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
    reservation: {
      findUnique: vi.fn(),
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

  beforeEach(() => {
    vi.clearAllMocks()
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

      vi.mocked(db.reservation.findUnique).mockResolvedValue(mockReservation as any)

      const modifiableUntil = new Date(Date.now() + 30 * 60 * 1000) // 30 minutes from now

      vi.mocked(db.$transaction).mockImplementation(async (callback) => {
        const updatedReservation = {
          ...mockReservation,
          status: 'modifiable',
          modifiableUntil,
        }
        return callback({
          reservation: {
            update: vi.fn().mockResolvedValue(updatedReservation),
          },
          reservationOption: {
            deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
          },
        } as any)
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

      vi.mocked(db.reservation.findUnique).mockResolvedValue(modifiableReservation as any)

      vi.mocked(db.$transaction).mockImplementation(async (callback) => {
        const updatedReservation = {
          ...modifiableReservation,
          courseId: 'course-456',
        }
        return callback({
          reservation: {
            update: vi.fn().mockResolvedValue(updatedReservation),
          },
          reservationOption: {
            deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
          },
        } as any)
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

      vi.mocked(db.$transaction).mockImplementation(async (callback) => {
        const updatedReservation = {
          ...expiredModifiableReservation,
          status: 'confirmed',
          modifiableUntil: null,
        }
        return callback({
          reservation: {
            update: vi.fn().mockResolvedValue(updatedReservation),
          },
          reservationOption: {
            deleteMany: vi.fn().mockResolvedValue({ count: 0 }),
          },
        } as any)
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
