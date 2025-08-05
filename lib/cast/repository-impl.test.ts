import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { CastRepositoryImpl } from './repository-impl'
import { Cast, CastSchedule } from './types'

// Mock fetch globally
global.fetch = vi.fn()

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
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockCasts,
      } as Response)

      const result = await repository.getAll()

      expect(fetch).toHaveBeenCalledWith('/api/cast')
      expect(result).toEqual(mockCasts)
    })

    it('should throw error when fetch fails', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        statusText: 'Internal Server Error',
      } as Response)

      await expect(repository.getAll()).rejects.toThrow(
        'Failed to fetch casts: Internal Server Error'
      )
    })
  })

  describe('getById', () => {
    it('should fetch cast by id successfully', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockCast,
      } as Response)

      const result = await repository.getById('1')

      expect(fetch).toHaveBeenCalledWith('/api/cast?id=1')
      expect(result).toEqual(mockCast)
    })

    it('should return null for 404 response', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 404,
      } as Response)

      const result = await repository.getById('999')

      expect(result).toBeNull()
    })

    it('should throw error for other failures', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      } as Response)

      await expect(repository.getById('1')).rejects.toThrow(
        'Failed to fetch cast: Internal Server Error'
      )
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

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          ...newCastData,
          id: '2',
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      } as Response)

      const result = await repository.create(newCastData)

      expect(fetch).toHaveBeenCalledWith('/api/cast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newCastData),
      })
      expect(result).toHaveProperty('id', '2')
    })

    it('should throw error when create fails', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        statusText: 'Bad Request',
      } as Response)

      await expect(
        repository.create({
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
      ).rejects.toThrow('Failed to create cast: Bad Request')
    })
  })

  describe('update', () => {
    it('should update cast successfully', async () => {
      const updateData = { name: '更新名前', status: 'break' as const }
      const updatedCast = { ...mockCast, ...updateData }

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => updatedCast,
      } as Response)

      const result = await repository.update('1', updateData)

      expect(fetch).toHaveBeenCalledWith('/api/cast', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: '1', ...updateData }),
      })
      expect(result).toEqual(updatedCast)
    })

    it('should throw error when update fails', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        statusText: 'Not Found',
      } as Response)

      await expect(repository.update('999', { name: 'Test' })).rejects.toThrow(
        'Failed to update cast: Not Found'
      )
    })
  })

  describe('delete', () => {
    it('should delete cast successfully', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      } as Response)

      const result = await repository.delete('1')

      expect(fetch).toHaveBeenCalledWith('/api/cast?id=1', {
        method: 'DELETE',
      })
      expect(result).toBe(true)
    })

    it('should throw error when delete fails', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        statusText: 'Forbidden',
      } as Response)

      await expect(repository.delete('1')).rejects.toThrow('Failed to delete cast: Forbidden')
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

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockSchedules,
      } as Response)

      const startDate = new Date('2024-01-01')
      const endDate = new Date('2024-01-31')
      const result = await repository.getCastSchedule('1', startDate, endDate)

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/cast-schedule?castId=1&startDate=')
      )
      expect(result).toEqual(mockSchedules)
    })

    it('should throw error when fetch fails', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        statusText: 'Server Error',
      } as Response)

      await expect(repository.getCastSchedule('1', new Date(), new Date())).rejects.toThrow(
        'Failed to fetch cast schedule: Server Error'
      )
    })
  })

  describe('updateCastSchedule', () => {
    it('should update existing schedule successfully', async () => {
      const existingSchedule = {
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
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => [existingSchedule],
      } as Response)

      // Mock update call
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      } as Response)

      await repository.updateCastSchedule('1', [newSchedule])

      expect(fetch).toHaveBeenNthCalledWith(2, '/api/cast-schedule', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: '1',
          ...newSchedule,
        }),
      })
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
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      } as Response)

      // Mock create call
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      } as Response)

      await repository.updateCastSchedule('1', [newSchedule])

      expect(fetch).toHaveBeenNthCalledWith(2, '/api/cast-schedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newSchedule),
      })
    })

    it('should throw error when update fails', async () => {
      const schedule = {
        castId: '1',
        date: new Date('2024-01-01'),
        startTime: new Date('2024-01-01T10:00:00'),
        endTime: new Date('2024-01-01T18:00:00'),
        bookings: 1,
      }

      // Mock getCastSchedule
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => [{ ...schedule, id: '1' }],
      } as Response)

      // Mock failed update
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        statusText: 'Bad Request',
      } as Response)

      await expect(repository.updateCastSchedule('1', [schedule])).rejects.toThrow(
        'Failed to update cast schedule: Bad Request'
      )
    })
  })
})
