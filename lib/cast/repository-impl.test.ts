import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { CastRepositoryImpl } from './repository-impl'
import { Cast, CastSchedule } from './types'
import { ApiError } from '@/lib/http/api-client'

vi.mock('@/lib/http/base-url', () => ({
  resolveApiUrl: (path: string) => path,
}))

// Mock fetch globally
global.fetch = vi.fn()

function mockResponse({
  ok = true,
  status = 200,
  body,
  statusText = 'OK',
}: {
  ok?: boolean
  status?: number
  body?: unknown
  statusText?: string
}): Response {
  return {
    ok,
    status,
    statusText,
    text: async () => {
      if (body === undefined || body === null) {
        return ''
      }
      if (typeof body === 'string') {
        return body
      }
      return JSON.stringify(body)
    },
  } as Response
}

describe('CastRepositoryImpl', () => {
  let repository: CastRepositoryImpl

  beforeEach(() => {
    vi.clearAllMocks()
    repository = new CastRepositoryImpl()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  const mockCast: Cast = {
    id: '1',
    name: 'テストキャスト',
    nameKana: 'テストキャスト',
    age: 28,
    height: 165,
    bust: 'C',
    waist: 58,
    hip: 88,
    type: 'スタンダード',
    image: '/images/cast1.jpg',
    images: ['/images/cast1.jpg'],
    description: 'テスト自己紹介',
    netReservation: true,
    specialDesignationFee: null,
    regularDesignationFee: null,
    panelDesignationRank: 0,
    regularDesignationRank: 0,
    workStatus: '出勤',
    workStart: new Date(),
    workEnd: new Date(),
    appointments: [],
    availableOptions: [],
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-01'),
  }

  describe('getAll', () => {
    it('should fetch all casts successfully', async () => {
      const mockCasts = [mockCast]
      vi.mocked(fetch).mockResolvedValueOnce(mockResponse({ body: mockCasts }))

      const result = await repository.getAll()

      const [url, init] = vi.mocked(fetch).mock.calls[0]
      expect(url).toBe('/api/cast')
      expect(init?.method).toBe('GET')
      expect(result).toEqual([
        expect.objectContaining({ id: mockCast.id, name: mockCast.name }),
      ])
    })

    it('should throw error when fetch fails', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        mockResponse({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
          body: { error: 'Internal Server Error' },
        })
      )

      const promise = repository.getAll()
      await expect(promise).rejects.toThrow(ApiError)
      await expect(promise).rejects.toMatchObject({
        status: 500,
        message: 'Internal Server Error',
      })
    })
  })

  describe('getById', () => {
    it('should fetch cast by id successfully', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        mockResponse({ status: 200, body: mockCast, statusText: 'OK' })
      )

      const result = await repository.getById('1')

      const [url, init] = vi.mocked(fetch).mock.calls[0]
      expect(url).toBe('/api/cast?id=1')
      expect(init?.method).toBe('GET')
      expect(result).toMatchObject({ id: mockCast.id, name: mockCast.name })
    })

    it('should return null for 404 response', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        mockResponse({ ok: false, status: 404, statusText: 'Not Found' })
      )

      const result = await repository.getById('999')

      expect(result).toBeNull()
    })

    it('should throw error for other failures', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        mockResponse({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
        })
      )

      const promise = repository.getById('1')
      await expect(promise).rejects.toThrow(ApiError)
      await expect(promise).rejects.toMatchObject({
        status: 500,
        message: 'Internal Server Error',
      })
    })
  })

  describe('create', () => {
    it('should create cast successfully', async () => {
      const newCastData = {
        name: '新規キャスト',
        nameKana: 'シンキキャスト',
        age: 25,
        height: 170,
        bust: 'D',
        waist: 60,
        hip: 90,
        type: 'モデル系',
        image: '/images/new.jpg',
        images: ['/images/new.jpg'],
        description: '新規自己紹介',
        netReservation: true,
        specialDesignationFee: null,
        regularDesignationFee: null,
        panelDesignationRank: 0,
        regularDesignationRank: 0,
        workStatus: '出勤' as const,
        appointments: [],
        availableOptions: [],
      }

      vi.mocked(fetch).mockResolvedValueOnce(
        mockResponse({
          body: {
            ...newCastData,
            id: '2',
          },
        })
      )

      const result = await repository.create(newCastData)

      const [url, init] = vi.mocked(fetch).mock.calls[0]
      expect(url).toBe('/api/cast')
      expect(init?.method).toBe('POST')
      expect(init?.body).toBe(JSON.stringify(newCastData))
      const headers = init?.headers instanceof Headers ? init.headers : new Headers(init?.headers)
      expect(headers?.get('Content-Type')).toBe('application/json')
      expect(result).toHaveProperty('id', '2')
    })

    it('should throw error when create fails', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        mockResponse({
          ok: false,
          status: 400,
          statusText: 'Bad Request',
        })
      )

      const promise = repository.create({
        name: 'Test',
        nameKana: 'テスト',
        age: 28,
        height: 165,
        bust: 'C',
        waist: 58,
        hip: 88,
        type: 'スタンダード',
        image: '/test.jpg',
        images: ['/test.jpg'],
        description: 'Test',
        netReservation: true,
        specialDesignationFee: null,
        regularDesignationFee: null,
        panelDesignationRank: 0,
        regularDesignationRank: 0,
        workStatus: '出勤',
        appointments: [],
        availableOptions: [],
      })

      await expect(promise).rejects.toThrow(ApiError)
      await expect(promise).rejects.toMatchObject({
        status: 400,
        message: 'Bad Request',
      })
    })
  })

  describe('update', () => {
    it('should update cast successfully', async () => {
      const updateData = { name: '更新名前', status: 'break' as const }
      const updatedCast = { ...mockCast, ...updateData }

      vi.mocked(fetch).mockResolvedValueOnce(mockResponse({ body: updatedCast }))

      const result = await repository.update('1', updateData)

      const [url, init] = vi.mocked(fetch).mock.calls[0]
      expect(url).toBe('/api/cast')
      expect(init?.method).toBe('PUT')
      expect(init?.body).toBe(JSON.stringify({ id: '1', ...updateData }))
      const headers = init?.headers instanceof Headers ? init.headers : new Headers(init?.headers)
      expect(headers?.get('Content-Type')).toBe('application/json')
      expect(result).toMatchObject({ id: mockCast.id, name: updateData.name })
    })

    it('should throw error when update fails', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        mockResponse({
          ok: false,
          status: 404,
          statusText: 'Not Found',
        })
      )

      const promise = repository.update('999', { name: 'Test' })
      await expect(promise).rejects.toThrow(ApiError)
      await expect(promise).rejects.toMatchObject({
        status: 404,
        message: 'Not Found',
      })
    })
  })

  describe('delete', () => {
    it('should delete cast successfully', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(mockResponse({ status: 204, body: '' }))

      const result = await repository.delete('1')

      const [url, init] = vi.mocked(fetch).mock.calls[0]
      expect(url).toBe('/api/cast?id=1')
      expect(init?.method).toBe('DELETE')
      expect(result).toBe(true)
    })

    it('should throw error when delete fails', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        mockResponse({
          ok: false,
          status: 403,
          statusText: 'Forbidden',
        })
      )

      const promise = repository.delete('1')
      await expect(promise).rejects.toThrow(ApiError)
      await expect(promise).rejects.toMatchObject({
        status: 403,
        message: 'Forbidden',
      })
    })
  })

  describe('getCastSchedule', () => {
    it('should fetch schedules successfully', async () => {
      const mockSchedules: CastSchedule[] = [
        {
          castId: '1',
          date: new Date('2024-01-01'),
          startTime: new Date('2024-01-01T10:00:00'),
          endTime: new Date('2024-01-01T18:00:00'),
          bookings: 3,
        },
      ]

      vi.mocked(fetch).mockResolvedValueOnce(mockResponse({ body: mockSchedules }))

      const startDate = new Date('2024-01-01')
      const endDate = new Date('2024-01-31')
      const result = await repository.getCastSchedule('1', startDate, endDate)

      const [url, init] = vi.mocked(fetch).mock.calls[0]
      expect(url).toContain('/api/cast-schedule?')
      expect(url).toContain('castId=1')
      expect(url).toContain(`startDate=${encodeURIComponent(startDate.toISOString())}`)
      expect(url).toContain(`endDate=${encodeURIComponent(endDate.toISOString())}`)
      expect(init?.method).toBe('GET')
      expect(result).toEqual([
        expect.objectContaining({ castId: '1' }),
      ])
    })

    it('should throw error when fetch fails', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        mockResponse({
          ok: false,
          status: 500,
          statusText: 'Server Error',
        })
      )

      const promise = repository.getCastSchedule('1', new Date(), new Date())
      await expect(promise).rejects.toThrow(ApiError)
      await expect(promise).rejects.toMatchObject({
        status: 500,
        message: 'Server Error',
      })
    })
  })

  describe('updateCastSchedule', () => {
    it('should update existing schedule successfully', async () => {
      const existingSchedule = {
        id: 'schedule-1',
        castId: '1',
        date: new Date('2024-01-01'),
        startTime: new Date('2024-01-01T10:00:00'),
        endTime: new Date('2024-01-01T18:00:00'),
        bookings: 2,
      }

      const newSchedule = {
        castId: '1',
        date: new Date('2024-01-01'),
        startTime: new Date('2024-01-01T11:00:00'),
        endTime: new Date('2024-01-01T19:00:00'),
        bookings: 1,
      }

      // Mock getCastSchedule call
      vi.mocked(fetch).mockResolvedValueOnce(
        mockResponse({ body: [existingSchedule] })
      )

      // Mock update call
      vi.mocked(fetch).mockResolvedValueOnce(mockResponse({ body: { success: true } }))

      await repository.updateCastSchedule('1', [newSchedule])

      const [, updateInit] = vi.mocked(fetch).mock.calls[1]
      expect(updateInit?.method).toBe('PUT')
      const updateBody = JSON.parse((updateInit?.body as string) ?? '{}')
      expect(updateBody).toMatchObject({
        id: 'schedule-1',
        castId: '1',
        bookings: 1,
      })
      expect(new Date(updateBody.date).toISOString()).toBe(newSchedule.date.toISOString())
    })

    it('should create new schedule when none exists', async () => {
      const newSchedule = {
        castId: '1',
        date: new Date('2024-01-01'),
        startTime: new Date('2024-01-01T10:00:00'),
        endTime: new Date('2024-01-01T18:00:00'),
        bookings: 0,
      }

      // Mock getCastSchedule to return empty
      vi.mocked(fetch).mockResolvedValueOnce(mockResponse({ body: [] }))

      // Mock create call
      vi.mocked(fetch).mockResolvedValueOnce(mockResponse({ body: { success: true } }))

      await repository.updateCastSchedule('1', [newSchedule])

      const [, createInit] = vi.mocked(fetch).mock.calls[1]
      expect(createInit?.method).toBe('POST')
      const createBody = JSON.parse((createInit?.body as string) ?? '{}')
      expect(createBody.castId).toBe('1')
      expect(new Date(createBody.date).toISOString()).toBe(newSchedule.date.toISOString())
    })

    it('should throw error when update fails', async () => {
      const schedule = {
        id: 'schedule-1',
        castId: '1',
        date: new Date('2024-01-01'),
        startTime: new Date('2024-01-01T10:00:00'),
        endTime: new Date('2024-01-01T18:00:00'),
        bookings: 1,
      }

      // Mock getCastSchedule
      vi.mocked(fetch).mockResolvedValueOnce(mockResponse({ body: [schedule] }))

      // Mock failed update
      vi.mocked(fetch).mockResolvedValueOnce(
        mockResponse({ ok: false, status: 400, statusText: 'Bad Request' })
      )

      const promise = repository.updateCastSchedule('1', [schedule])
      await expect(promise).rejects.toThrow(ApiError)
      await expect(promise).rejects.toMatchObject({ status: 400, message: 'Bad Request' })
    })
  })
})
