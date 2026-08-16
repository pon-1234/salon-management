/**
 * @design_doc   Public slot listing and administrator-only reservation conflict checks
 * @related_to   reservation/route.ts, requireAdmin, canonical store resolver
 * @known_issues None currently
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest, NextResponse } from 'next/server'
import { GET } from './route'
import { db } from '@/lib/db'

const authMocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(),
}))

const storeResolverMocks = vi.hoisted(() => ({
  resolveStoreId: vi.fn(),
  ensureStoreId: vi.fn(),
}))

vi.mock('@/lib/auth/utils', () => authMocks)
vi.mock('@/lib/store/server', () => storeResolverMocks)

// Mock the database
vi.mock('@/lib/db', () => ({
  db: {
    reservation: {
      findMany: vi.fn(),
    },
    cast: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    castSchedule: {
      findFirst: vi.fn(),
    },
    storeSettings: {
      findFirst: vi.fn(),
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
    authMocks.requireAdmin.mockResolvedValue(null)
    storeResolverMocks.resolveStoreId.mockImplementation((request: NextRequest) =>
      Promise.resolve(request.nextUrl.searchParams.get('storeId')?.trim().toLowerCase() ?? null)
    )
    storeResolverMocks.ensureStoreId.mockImplementation((storeId: string) =>
      Promise.resolve(storeId)
    )
    vi.mocked(db.cast.findMany).mockImplementation((({ where }: any) =>
      Promise.resolve(where.id.in.map((id: string) => ({ id })))) as any)
    vi.mocked(db.storeSettings.findFirst).mockResolvedValue({
      businessHours: '09:00 - 23:00',
    } as any)
    vi.mocked(db.storeSettings.findUnique).mockResolvedValue({
      businessHours: '09:00 - 23:00',
    } as any)
    vi.mocked(db.castSchedule.findFirst).mockResolvedValue({
      id: 'schedule-1',
      castId: 'cast1',
      startTime: new Date('2025-07-10T00:00:00.000Z'),
      endTime: new Date('2025-07-10T14:00:00.000Z'),
      isAvailable: true,
    } as any)
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
      storeId: 'store-1',
      netReservation: true,
    }

    vi.mocked(db.cast.findUnique).mockResolvedValue(mockCast as any)
    vi.mocked(db.reservation.findMany).mockResolvedValue(mockReservations as any)

    const request = new NextRequest(
      'http://localhost:3000/api/reservation/availability?storeId=store-1&castId=cast1&date=2025-07-10&duration=60'
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
    expect(db.storeSettings.findUnique).toHaveBeenCalledWith({
      where: { storeId: 'store-1' },
      select: { businessHours: true },
    })
    expect(db.castSchedule.findFirst).toHaveBeenCalled()
  })

  it('lists public slots with the canonical store id resolved from a slug', async () => {
    storeResolverMocks.ensureStoreId.mockResolvedValue('uat-ikebukuro')
    vi.mocked(db.cast.findUnique).mockResolvedValue({
      id: 'cast1',
      name: 'Test Cast',
      storeId: 'uat-ikebukuro',
      netReservation: true,
    } as any)
    vi.mocked(db.reservation.findMany).mockResolvedValue([])

    const request = new NextRequest(
      'http://localhost:3000/api/reservation/availability?storeId=ikebukuro&castId=cast1&date=2025-07-10&duration=60'
    )

    const response = await GET(request)

    expect(response.status).toBe(200)
    expect(storeResolverMocks.resolveStoreId).toHaveBeenCalledWith(request)
    expect(storeResolverMocks.ensureStoreId).toHaveBeenCalledWith('ikebukuro')
    expect(authMocks.requireAdmin).not.toHaveBeenCalled()
    expect(db.storeSettings.findUnique).toHaveBeenCalledWith({
      where: { storeId: 'uat-ikebukuro' },
      select: { businessHours: true },
    })
    expect(db.reservation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ storeId: 'uat-ikebukuro' }) })
    )
    expect(storeResolverMocks.ensureStoreId.mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(db.cast.findUnique).mock.invocationCallOrder[0]
    )
  })

  it('returns no slots when the cast has disabled web reservations', async () => {
    vi.mocked(db.cast.findUnique).mockResolvedValue({
      id: 'cast1',
      name: 'Test Cast',
      storeId: 'store-1',
      netReservation: false,
    } as any)
    vi.mocked(db.reservation.findMany).mockResolvedValue([])

    const request = new NextRequest(
      'http://localhost:3000/api/reservation/availability?storeId=store-1&castId=cast1&date=2025-07-10&duration=60'
    )

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual({
      castId: 'cast1',
      date: '2025-07-10',
      duration: 60,
      availableSlots: [],
    })
    expect(db.castSchedule.findFirst).not.toHaveBeenCalled()
    expect(db.reservation.findMany).not.toHaveBeenCalled()
  })

  it('limits available slots to the cast working schedule', async () => {
    vi.mocked(db.cast.findUnique).mockResolvedValue({
      id: 'cast1',
      name: 'Test Cast',
      storeId: 'store-1',
      netReservation: true,
    } as any)
    vi.mocked(db.castSchedule.findFirst).mockResolvedValue({
      id: 'schedule-1',
      castId: 'cast1',
      startTime: new Date('2025-07-10T03:00:00.000Z'),
      endTime: new Date('2025-07-10T09:00:00.000Z'),
      isAvailable: true,
    } as any)
    vi.mocked(db.reservation.findMany).mockResolvedValue([])

    const request = new NextRequest(
      'http://localhost:3000/api/reservation/availability?storeId=store-1&castId=cast1&date=2025-07-10&duration=60'
    )

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.availableSlots).toEqual([
      {
        startTime: '2025-07-10T03:00:00.000Z',
        endTime: '2025-07-10T09:00:00.000Z',
      },
    ])
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
      'http://localhost:3000/api/reservation/availability?mode=check&storeId=store-1&castId=cast1&startTime=2025-07-10T10:30:00&endTime=2025-07-10T11:30:00'
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
    expect(db.reservation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ storeId: 'store-1', castId: 'cast1' }),
      })
    )
    expect(authMocks.requireAdmin).toHaveBeenCalledWith({
      permissions: 'reservation:read',
      storeId: 'store-1',
    })
  })

  it('rejects unauthenticated conflict checks before querying reservation data', async () => {
    authMocks.requireAdmin.mockResolvedValue(
      NextResponse.json({ error: '認証が必要です' }, { status: 401 })
    )
    const request = new NextRequest(
      'http://localhost:3000/api/reservation/availability?mode=check&storeId=store-1&castId=cast1&startTime=2025-07-10T10:30:00&endTime=2025-07-10T11:30:00'
    )

    const response = await GET(request)

    expect(response.status).toBe(401)
    expect(authMocks.requireAdmin).toHaveBeenCalledWith({
      permissions: 'reservation:read',
      storeId: 'store-1',
    })
    expect(db.cast.findMany).not.toHaveBeenCalled()
    expect(db.reservation.findMany).not.toHaveBeenCalled()
  })

  it('rejects conflict checks for an admin without access to the canonical store', async () => {
    storeResolverMocks.ensureStoreId.mockResolvedValue('uat-ikebukuro')
    authMocks.requireAdmin.mockResolvedValue(
      NextResponse.json({ error: 'この店舗を操作する権限がありません' }, { status: 403 })
    )
    const request = new NextRequest(
      'http://localhost:3000/api/reservation/availability?mode=check&storeId=ikebukuro&castId=cast1&startTime=2025-07-10T10:30:00&endTime=2025-07-10T11:30:00'
    )

    const response = await GET(request)

    expect(response.status).toBe(403)
    expect(authMocks.requireAdmin).toHaveBeenCalledWith({
      permissions: 'reservation:read',
      storeId: 'uat-ikebukuro',
    })
    expect(db.cast.findMany).not.toHaveBeenCalled()
    expect(db.reservation.findMany).not.toHaveBeenCalled()
  })

  it('uses the canonical store id for every conflict query', async () => {
    storeResolverMocks.ensureStoreId.mockResolvedValue('uat-ikebukuro')
    vi.mocked(db.reservation.findMany).mockResolvedValue([])
    const request = new NextRequest(
      'http://localhost:3000/api/reservation/availability?mode=check&storeId=ikebukuro&castId=cast1&startTime=2025-07-10T10:30:00&endTime=2025-07-10T11:30:00'
    )

    const response = await GET(request)

    expect(response.status).toBe(200)
    expect(authMocks.requireAdmin).toHaveBeenCalledWith({
      permissions: 'reservation:read',
      storeId: 'uat-ikebukuro',
    })
    expect(db.cast.findMany).toHaveBeenCalledWith({
      where: { id: { in: ['cast1'] }, storeId: 'uat-ikebukuro' },
      select: { id: true },
    })
    expect(db.reservation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ storeId: 'uat-ikebukuro', castId: 'cast1' }),
      })
    )
  })

  it('should return true when no conflicts exist', async () => {
    vi.mocked(db.reservation.findMany).mockResolvedValue([])

    const request = new NextRequest(
      'http://localhost:3000/api/reservation/availability?mode=check&storeId=store-1&castId=cast1&startTime=2025-07-10T10:00:00&endTime=2025-07-10T11:00:00'
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
      'http://localhost:3000/api/reservation/availability?mode=check&storeId=store-1&castIds=cast1,cast2&startTime=2025-07-10T09:30:00&endTime=2025-07-10T10:30:00'
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
      'http://localhost:3000/api/reservation/availability?mode=check&storeId=store-1&castId=cast1&startTime=2025-07-10T10:00:00&endTime=2025-07-10T11:00:00'
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
      'http://localhost:3000/api/reservation/availability?mode=check&storeId=store-1&startTime=2025-07-10T10:00:00'
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
      'http://localhost:3000/api/reservation/availability?mode=check&storeId=store-1&castId=cast1&startTime=invalid-date&endTime=2025-07-10T11:00:00'
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
      'http://localhost:3000/api/reservation/availability?mode=check&storeId=store-1&castId=cast1&startTime=2025-07-10T10:00:00&endTime=2025-07-10T11:00:00'
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

  it('requires an explicit store for conflict checks', async () => {
    const request = new NextRequest(
      'http://localhost:3000/api/reservation/availability?mode=check&castId=cast1&startTime=2025-07-10T10:00:00&endTime=2025-07-10T11:00:00'
    )

    const response = await GET(request)

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({ error: 'Missing required parameter: storeId' })
    expect(db.reservation.findMany).not.toHaveBeenCalled()
  })

  it('requires an explicit store when listing available slots', async () => {
    const request = new NextRequest(
      'http://localhost:3000/api/reservation/availability?castId=cast1&date=2025-07-10&duration=60'
    )

    const response = await GET(request)

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({ error: 'Missing required parameter: storeId' })
    expect(db.cast.findUnique).not.toHaveBeenCalled()
  })

  it('does not expose conflicts for a cast outside the requested store', async () => {
    vi.mocked(db.cast.findMany).mockResolvedValue([])
    const request = new NextRequest(
      'http://localhost:3000/api/reservation/availability?mode=check&storeId=store-1&castId=cast-from-store-2&startTime=2025-07-10T10:00:00&endTime=2025-07-10T11:00:00'
    )

    const response = await GET(request)

    expect(response.status).toBe(404)
    await expect(response.json()).resolves.toEqual({ error: 'Cast not found' })
    expect(db.reservation.findMany).not.toHaveBeenCalled()
  })
})
