/**
 * @design_doc   Tests for reservation availability check API
 * @related_to   reservation/route.ts, ReservationRepository, Prisma Reservation model
 * @known_issues None currently
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from './route'
import { db } from '@/lib/db'

// Mock the database
vi.mock('@/lib/db', () => ({
  db: {
    reservation: {
      findMany: vi.fn(),
    },
    cast: {
      findUnique: vi.fn(),
    },
  },
}))

// Mock logger
vi.mock('@/lib/logger', () => ({
  default: {
    error: vi.fn(),
  },
}))

describe('GET /api/reservation/availability', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return available time slots for a specific cast and date', async () => {
    const mockReservations = [
      {
        id: '1',
        castId: 'cast1',
        startTime: new Date('2025-07-10T10:00:00Z'),
        endTime: new Date('2025-07-10T11:00:00Z'),
        status: 'confirmed',
      },
      {
        id: '2',
        castId: 'cast1',
        startTime: new Date('2025-07-10T14:00:00Z'),
        endTime: new Date('2025-07-10T15:30:00Z'),
        status: 'confirmed',
      },
    ]

    const mockCast = {
      id: 'cast1',
      name: 'Test Cast',
    }

    vi.mocked(db.cast.findUnique).mockResolvedValue(mockCast as any)
    vi.mocked(db.reservation.findMany).mockResolvedValue(mockReservations as any)

    const request = new NextRequest(
      'http://localhost:3000/api/reservation/availability?castId=cast1&date=2025-07-10&duration=60'
    )
    // Mock the pathname for this test
    Object.defineProperty(request.nextUrl, 'pathname', {
      value: '/api/reservation/availability',
      writable: false,
    })

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toHaveProperty('availableSlots')
    expect(data.availableSlots).toBeInstanceOf(Array)

    // Should have slots before and between reservations
    // The API returns the full available time periods, not just 60-minute slots
    expect(data.availableSlots).toContainEqual({
      startTime: '2025-07-10T00:00:00.000Z',
      endTime: '2025-07-10T10:00:00.000Z',
    })
    expect(data.availableSlots).toContainEqual({
      startTime: '2025-07-10T11:00:00.000Z',
      endTime: '2025-07-10T14:00:00.000Z',
    })
  })

  it('should check for conflicts when a specific time range is provided', async () => {
    const mockReservations = [
      {
        id: '1',
        castId: 'cast1',
        startTime: new Date('2025-07-10T10:00:00Z'),
        endTime: new Date('2025-07-10T11:00:00Z'),
        status: 'confirmed',
      },
    ]

    vi.mocked(db.reservation.findMany).mockResolvedValue(mockReservations as any)

    const request = new NextRequest(
      'http://localhost:3000/api/reservation/availability?mode=check&castId=cast1&startTime=2025-07-10T10:30:00&endTime=2025-07-10T11:30:00'
    )
    Object.defineProperty(request.nextUrl, 'pathname', {
      value: '/api/reservation/availability',
      writable: false,
    })

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual({
      available: false,
      conflicts: [
        {
          id: '1',
          startTime: '2025-07-10T10:00:00.000Z',
          endTime: '2025-07-10T11:00:00.000Z',
        },
      ],
    })
  })

  it('should return true when no conflicts exist', async () => {
    vi.mocked(db.reservation.findMany).mockResolvedValue([])

    const request = new NextRequest(
      'http://localhost:3000/api/reservation/availability?mode=check&castId=cast1&startTime=2025-07-10T10:00:00&endTime=2025-07-10T11:00:00'
    )
    Object.defineProperty(request.nextUrl, 'pathname', {
      value: '/api/reservation/availability',
      writable: false,
    })

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual({
      available: true,
      conflicts: [],
    })
  })

  it('should handle multiple cast availability check', async () => {
    const mockReservations = [
      {
        id: '1',
        castId: 'cast1',
        startTime: new Date('2025-07-10T10:00:00'),
        endTime: new Date('2025-07-10T11:00:00'),
        status: 'confirmed',
      },
      {
        id: '2',
        castId: 'cast2',
        startTime: new Date('2025-07-10T09:00:00'),
        endTime: new Date('2025-07-10T10:00:00'),
        status: 'confirmed',
      },
    ]

    vi.mocked(db.reservation.findMany).mockResolvedValue(mockReservations as any)

    const request = new NextRequest(
      'http://localhost:3000/api/reservation/availability?mode=check&castIds=cast1,cast2&startTime=2025-07-10T09:30:00&endTime=2025-07-10T10:30:00'
    )
    Object.defineProperty(request.nextUrl, 'pathname', {
      value: '/api/reservation/availability',
      writable: false,
    })

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toHaveProperty('cast1')
    expect(data).toHaveProperty('cast2')
    expect(data.cast1.available).toBe(false)
    expect(data.cast2.available).toBe(false)
  })

  it('should exclude cancelled reservations from conflict check', async () => {
    const mockReservations = [
      {
        id: '1',
        castId: 'cast1',
        startTime: new Date('2025-07-10T10:00:00Z'),
        endTime: new Date('2025-07-10T11:00:00Z'),
        status: 'cancelled',
      },
    ]

    vi.mocked(db.reservation.findMany).mockResolvedValue([])

    const request = new NextRequest(
      'http://localhost:3000/api/reservation/availability?mode=check&castId=cast1&startTime=2025-07-10T10:00:00&endTime=2025-07-10T11:00:00'
    )
    Object.defineProperty(request.nextUrl, 'pathname', {
      value: '/api/reservation/availability',
      writable: false,
    })

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual({
      available: true,
      conflicts: [],
    })
  })

  it('should validate required parameters', async () => {
    const request = new NextRequest(
      'http://localhost:3000/api/reservation/availability?mode=check&startTime=2025-07-10T10:00:00'
    )
    Object.defineProperty(request.nextUrl, 'pathname', {
      value: '/api/reservation/availability',
      writable: false,
    })

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data).toEqual({
      error: 'Missing required parameters: castId or castIds',
    })
  })

  it('should handle invalid date formats', async () => {
    const request = new NextRequest(
      'http://localhost:3000/api/reservation/availability?mode=check&castId=cast1&startTime=invalid-date&endTime=2025-07-10T11:00:00'
    )
    Object.defineProperty(request.nextUrl, 'pathname', {
      value: '/api/reservation/availability',
      writable: false,
    })

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data).toEqual({
      error: 'Invalid date format',
    })
  })

  it('should handle database errors gracefully', async () => {
    const dbError = new Error('Database error')
    vi.mocked(db.reservation.findMany).mockRejectedValueOnce(dbError)

    const request = new NextRequest(
      'http://localhost:3000/api/reservation/availability?mode=check&castId=cast1&startTime=2025-07-10T10:00:00&endTime=2025-07-10T11:00:00'
    )
    Object.defineProperty(request.nextUrl, 'pathname', {
      value: '/api/reservation/availability',
      writable: false,
    })

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data).toEqual({
      error: 'Internal server error',
    })
  })
})
