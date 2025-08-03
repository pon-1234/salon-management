/**
 * @design_doc   Tests for Cast Schedule API endpoints
 * @related_to   cast-schedule/route.ts, CastScheduleRepository, CastSchedule type
 * @known_issues None currently
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST, PUT, DELETE } from './route'
import { db } from '@/lib/db'

// Mock the database
vi.mock('@/lib/db', () => ({
  db: {
    castSchedule: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}))

// Mock logger
vi.mock('@/lib/logger', () => ({
  default: {
    error: vi.fn(),
  },
}))

// Mock auth utils
vi.mock('@/lib/auth/utils', () => ({
  requireAdmin: vi.fn().mockResolvedValue(undefined),
}))

describe('GET /api/cast-schedule', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should get schedule by ID', async () => {
    const mockSchedule = {
      id: 'schedule1',
      castId: 'cast1',
      date: new Date('2025-07-15'),
      startTime: new Date('2025-07-15T09:00:00Z'),
      endTime: new Date('2025-07-15T18:00:00Z'),
      isAvailable: true,
      cast: { id: 'cast1', name: 'Test Cast' },
    }

    vi.mocked(db.castSchedule.findUnique).mockResolvedValueOnce(mockSchedule as any)

    const request = new NextRequest('http://localhost:3000/api/cast-schedule?id=schedule1', {
      method: 'GET',
    })

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.id).toBe('schedule1')
    expect(vi.mocked(db.castSchedule.findUnique)).toHaveBeenCalledWith({
      where: { id: 'schedule1' },
      include: { cast: true },
    })
  })

  it('should return 404 for non-existent schedule', async () => {
    vi.mocked(db.castSchedule.findUnique).mockResolvedValueOnce(null)

    const request = new NextRequest('http://localhost:3000/api/cast-schedule?id=non-existent', {
      method: 'GET',
    })

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Not Found')
    expect(data.message).toBe('スケジュールが見つかりません')
  })

  it('should filter schedules by castId', async () => {
    const mockSchedules = [
      {
        id: 'schedule1',
        castId: 'cast1',
        date: new Date('2025-07-15'),
        startTime: new Date('2025-07-15T09:00:00Z'),
        endTime: new Date('2025-07-15T18:00:00Z'),
        isAvailable: true,
        cast: { id: 'cast1', name: 'Test Cast' },
      },
    ]

    vi.mocked(db.castSchedule.findMany).mockResolvedValueOnce(mockSchedules as any)

    const request = new NextRequest('http://localhost:3000/api/cast-schedule?castId=cast1', {
      method: 'GET',
    })

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data).toHaveLength(1)
    expect(vi.mocked(db.castSchedule.findMany)).toHaveBeenCalledWith({
      where: { castId: 'cast1' },
      include: { cast: true },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    })
  })

  it('should filter schedules by specific date', async () => {
    const mockSchedules: any[] = []

    vi.mocked(db.castSchedule.findMany).mockResolvedValueOnce(mockSchedules as any)

    const request = new NextRequest('http://localhost:3000/api/cast-schedule?date=2025-07-15', {
      method: 'GET',
    })

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(vi.mocked(db.castSchedule.findMany)).toHaveBeenCalledWith({
      where: { date: new Date('2025-07-15') },
      include: { cast: true },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    })
  })

  it('should filter schedules by date range', async () => {
    const mockSchedules: any[] = []

    vi.mocked(db.castSchedule.findMany).mockResolvedValueOnce(mockSchedules as any)

    const request = new NextRequest(
      'http://localhost:3000/api/cast-schedule?startDate=2025-07-14&endDate=2025-07-16',
      {
        method: 'GET',
      }
    )

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(vi.mocked(db.castSchedule.findMany)).toHaveBeenCalledWith({
      where: {
        date: {
          gte: new Date('2025-07-14'),
          lte: new Date('2025-07-16'),
        },
      },
      include: { cast: true },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    })
  })

  it('should combine multiple filters', async () => {
    const mockSchedules: any[] = []

    vi.mocked(db.castSchedule.findMany).mockResolvedValueOnce(mockSchedules as any)

    const request = new NextRequest(
      'http://localhost:3000/api/cast-schedule?castId=cast1&startDate=2025-07-14&endDate=2025-07-16',
      {
        method: 'GET',
      }
    )

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(vi.mocked(db.castSchedule.findMany)).toHaveBeenCalledWith({
      where: {
        castId: 'cast1',
        date: {
          gte: new Date('2025-07-14'),
          lte: new Date('2025-07-16'),
        },
      },
      include: { cast: true },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    })
  })
})

describe('POST /api/cast-schedule', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should create a new schedule', async () => {
    const newScheduleData = {
      castId: 'cast1',
      date: '2025-07-15',
      startTime: '2025-07-15T09:00:00Z',
      endTime: '2025-07-15T18:00:00Z',
      isAvailable: true,
    }

    const mockCreatedSchedule = {
      id: 'new-schedule-id',
      ...newScheduleData,
      date: new Date('2025-07-15'),
      startTime: new Date('2025-07-15T09:00:00Z'),
      endTime: new Date('2025-07-15T18:00:00Z'),
      cast: { id: 'cast1', name: 'Test Cast' },
    }

    vi.mocked(db.castSchedule.create).mockResolvedValueOnce(mockCreatedSchedule as any)

    const request = new NextRequest('http://localhost:3000/api/cast-schedule', {
      method: 'POST',
      body: JSON.stringify(newScheduleData),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.data.id).toBe('new-schedule-id')
    expect(vi.mocked(db.castSchedule.create)).toHaveBeenCalledWith({
      data: {
        castId: 'cast1',
        date: new Date('2025-07-15'),
        startTime: new Date('2025-07-15T09:00:00Z'),
        endTime: new Date('2025-07-15T18:00:00Z'),
        isAvailable: true,
      },
      include: { cast: true },
    })
  })

  it('should default isAvailable to true if not provided', async () => {
    const newScheduleData = {
      castId: 'cast1',
      date: '2025-07-15',
      startTime: '2025-07-15T09:00:00Z',
      endTime: '2025-07-15T18:00:00Z',
    }

    const mockCreatedSchedule = {
      id: 'new-schedule-id',
      ...newScheduleData,
      isAvailable: true,
      date: new Date('2025-07-15'),
      startTime: new Date('2025-07-15T09:00:00Z'),
      endTime: new Date('2025-07-15T18:00:00Z'),
      cast: { id: 'cast1', name: 'Test Cast' },
    }

    vi.mocked(db.castSchedule.create).mockResolvedValueOnce(mockCreatedSchedule as any)

    const request = new NextRequest('http://localhost:3000/api/cast-schedule', {
      method: 'POST',
      body: JSON.stringify(newScheduleData),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(vi.mocked(db.castSchedule.create)).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          isAvailable: true,
        }),
      })
    )
  })
})

describe('PUT /api/cast-schedule', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should require ID field', async () => {
    const request = new NextRequest('http://localhost:3000/api/cast-schedule', {
      method: 'PUT',
      body: JSON.stringify({
        startTime: '2025-07-15T10:00:00Z',
      }),
    })

    const response = await PUT(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('ID is required')
  })

  it('should update schedule', async () => {
    const updateData = {
      id: 'schedule1',
      startTime: '2025-07-15T10:00:00Z',
      endTime: '2025-07-15T19:00:00Z',
      isAvailable: false,
    }

    const mockUpdatedSchedule = {
      id: 'schedule1',
      castId: 'cast1',
      date: new Date('2025-07-15'),
      startTime: new Date('2025-07-15T10:00:00Z'),
      endTime: new Date('2025-07-15T19:00:00Z'),
      isAvailable: false,
      cast: { id: 'cast1', name: 'Test Cast' },
    }

    vi.mocked(db.castSchedule.update).mockResolvedValueOnce(mockUpdatedSchedule as any)

    const request = new NextRequest('http://localhost:3000/api/cast-schedule', {
      method: 'PUT',
      body: JSON.stringify(updateData),
    })

    const response = await PUT(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.isAvailable).toBe(false)
    expect(vi.mocked(db.castSchedule.update)).toHaveBeenCalledWith({
      where: { id: 'schedule1' },
      data: {
        date: undefined,
        startTime: new Date('2025-07-15T10:00:00Z'),
        endTime: new Date('2025-07-15T19:00:00Z'),
        isAvailable: false,
      },
      include: { cast: true },
    })
  })

  it('should handle non-existent schedule', async () => {
    vi.mocked(db.castSchedule.update).mockRejectedValueOnce({
      code: 'P2025',
      message: 'Record not found',
    })

    const request = new NextRequest('http://localhost:3000/api/cast-schedule', {
      method: 'PUT',
      body: JSON.stringify({
        id: 'non-existent',
        isAvailable: false,
      }),
    })

    const response = await PUT(request)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Not Found')
    expect(data.message).toBe('スケジュールが見つかりません')
  })
})

describe('DELETE /api/cast-schedule', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should require ID parameter', async () => {
    const request = new NextRequest('http://localhost:3000/api/cast-schedule', {
      method: 'DELETE',
    })

    const response = await DELETE(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Bad Request')
    expect(data.message).toBe('IDが必要です')
  })

  it('should delete schedule', async () => {
    vi.mocked(db.castSchedule.delete).mockResolvedValueOnce({} as any)

    const request = new NextRequest('http://localhost:3000/api/cast-schedule?id=schedule1', {
      method: 'DELETE',
    })

    const response = await DELETE(request)

    expect(response.status).toBe(204)
    expect(vi.mocked(db.castSchedule.delete)).toHaveBeenCalledWith({
      where: { id: 'schedule1' },
    })
  })

  it('should handle non-existent schedule', async () => {
    vi.mocked(db.castSchedule.delete).mockRejectedValueOnce({
      code: 'P2025',
      message: 'Record not found',
    })

    const request = new NextRequest('http://localhost:3000/api/cast-schedule?id=non-existent', {
      method: 'DELETE',
    })

    const response = await DELETE(request)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.error).toBe('Not Found')
    expect(data.message).toBe('スケジュールが見つかりません')
  })
})

describe('Cast Schedule API - Conflict Detection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should detect schedule conflicts when creating overlapping schedules', async () => {
    const conflictingScheduleData = {
      castId: 'cast1',
      date: '2025-07-15',
      startTime: '2025-07-15T10:00:00Z',
      endTime: '2025-07-15T12:00:00Z',
    }

    // Simulate unique constraint violation
    vi.mocked(db.castSchedule.create).mockRejectedValueOnce({
      code: 'P2002',
      message: 'Unique constraint failed',
    })

    const request = new NextRequest('http://localhost:3000/api/cast-schedule', {
      method: 'POST',
      body: JSON.stringify(conflictingScheduleData),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(409)
    expect(data.error).toBe('Conflict')
    expect(data.message).toBe('スケジュールの競合が検出されました')
  })
})
