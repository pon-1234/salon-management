import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ReservationRepositoryImpl } from './repository-impl'
import { Reservation } from '../types/reservation'

// Mock fetch globally
global.fetch = vi.fn()

describe('ReservationRepositoryImpl', () => {
  let repository: ReservationRepositoryImpl
  
  beforeEach(() => {
    vi.clearAllMocks()
    repository = new ReservationRepositoryImpl()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  const mockReservation: Reservation = {
    id: '1',
    castId: 'cast1',
    castName: 'テストキャスト',
    customerId: 'customer1',
    customerName: '山田太郎',
    customerEmail: 'yamada@example.com',
    customerPhone: '090-1234-5678',
    date: new Date('2024-01-01'),
    startTime: '10:00',
    endTime: '11:00',
    services: [
      {
        id: 'service1',
        name: 'カット',
        duration: 60,
        price: 5000
      }
    ],
    options: [],
    totalAmount: 5000,
    status: 'confirmed',
    notes: 'テスト予約',
    createdAt: new Date('2023-12-01'),
    updatedAt: new Date('2023-12-01')
  }

  describe('getAll', () => {
    it('should fetch all reservations successfully', async () => {
      const mockReservations = [mockReservation]
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockReservations
      } as Response)

      const result = await repository.getAll()

      expect(fetch).toHaveBeenCalledWith('/api/reservation')
      expect(result).toEqual(mockReservations)
    })

    it('should throw error when fetch fails', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        statusText: 'Internal Server Error'
      } as Response)

      await expect(repository.getAll())
        .rejects.toThrow('Failed to fetch reservations: Internal Server Error')
    })
  })

  describe('getById', () => {
    it('should fetch reservation by id successfully', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockReservation
      } as Response)

      const result = await repository.getById('1')

      expect(fetch).toHaveBeenCalledWith('/api/reservation?id=1')
      expect(result).toEqual(mockReservation)
    })

    it('should return null for 404 response', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 404
      } as Response)

      const result = await repository.getById('999')

      expect(result).toBeNull()
    })

    it('should throw error for other failures', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      } as Response)

      await expect(repository.getById('1'))
        .rejects.toThrow('Failed to fetch reservation: Internal Server Error')
    })
  })

  describe('create', () => {
    it('should create reservation successfully', async () => {
      const newReservationData = {
        castId: 'cast1',
        castName: 'テストキャスト',
        customerId: 'customer1',
        customerName: '新規顧客',
        customerEmail: 'new@example.com',
        customerPhone: '090-9876-5432',
        date: new Date('2024-01-15'),
        startTime: '14:00',
        endTime: '15:00',
        services: [
          {
            id: 'service1',
            name: 'カット',
            duration: 60,
            price: 5000
          }
        ],
        options: [],
        totalAmount: 5000,
        status: 'confirmed' as const,
        notes: ''
      }

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ...newReservationData, id: '2', createdAt: new Date(), updatedAt: new Date() })
      } as Response)

      const result = await repository.create(newReservationData)

      expect(fetch).toHaveBeenCalledWith('/api/reservation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newReservationData)
      })
      expect(result).toHaveProperty('id', '2')
    })

    it('should handle 409 conflict with conflict information', async () => {
      const conflictData = {
        error: 'Time slot is not available',
        conflicts: [
          {
            id: 'conflict1',
            castName: 'Other Cast',
            startTime: '14:00',
            endTime: '15:00'
          }
        ]
      }

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: async () => conflictData
      } as Response)

      try {
        await repository.create({
          castId: 'cast1',
          castName: 'テストキャスト',
          customerId: 'customer1',
          customerName: '顧客',
          customerEmail: 'test@example.com',
          customerPhone: '090-0000-0000',
          date: new Date(),
          startTime: '14:00',
          endTime: '15:00',
          services: [],
          options: [],
          totalAmount: 0,
          status: 'confirmed',
          notes: ''
        })
        expect.fail('Should have thrown an error')
      } catch (error: any) {
        expect(error.message).toBe('Time slot is not available')
        expect(error.conflicts).toEqual(conflictData.conflicts)
        expect(error.status).toBe(409)
      }
    })

    it('should throw generic error for other failures', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        json: async () => ({ error: 'Invalid data' })
      } as Response)

      await expect(repository.create({
        castId: 'cast1',
        castName: 'テストキャスト',
        customerId: 'customer1',
        customerName: '顧客',
        customerEmail: 'test@example.com',
        customerPhone: '090-0000-0000',
        date: new Date(),
        startTime: '14:00',
        endTime: '15:00',
        services: [],
        options: [],
        totalAmount: 0,
        status: 'confirmed',
        notes: ''
      })).rejects.toThrow('Invalid data')
    })
  })

  describe('update', () => {
    it('should update reservation successfully', async () => {
      const updateData = { status: 'cancelled' as const, notes: '顧客都合でキャンセル' }
      const updatedReservation = { ...mockReservation, ...updateData }

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => updatedReservation
      } as Response)

      const result = await repository.update('1', updateData)

      expect(fetch).toHaveBeenCalledWith('/api/reservation', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: '1', ...updateData })
      })
      expect(result).toEqual(updatedReservation)
    })

    it('should handle 409 conflict on update', async () => {
      const conflictData = {
        error: 'Time slot is not available',
        conflicts: [{ id: 'conflict1' }]
      }

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 409,
        json: async () => conflictData
      } as Response)

      try {
        await repository.update('1', { startTime: '15:00' })
        expect.fail('Should have thrown an error')
      } catch (error: any) {
        expect(error.message).toBe('Time slot is not available')
        expect(error.conflicts).toEqual(conflictData.conflicts)
        expect(error.status).toBe(409)
      }
    })

    it('should throw error for other update failures', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        statusText: 'Not Found',
        json: async () => ({})
      } as Response)

      await expect(repository.update('999', { status: 'cancelled' }))
        .rejects.toThrow('Failed to update reservation: Not Found')
    })
  })

  describe('delete', () => {
    it('should delete reservation successfully', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: '1', status: 'cancelled' })
      } as Response)

      const result = await repository.delete('1')

      expect(fetch).toHaveBeenCalledWith('/api/reservation?id=1', {
        method: 'DELETE',
      })
      expect(result).toBe(true)
    })

    it('should throw error when delete fails', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        statusText: 'Forbidden',
        json: async () => ({ error: 'Access denied' })
      } as Response)

      await expect(repository.delete('1'))
        .rejects.toThrow('Access denied')
    })
  })

  describe('getReservationsByCustomer', () => {
    it('should fetch reservations by customer id successfully', async () => {
      const mockReservations = [mockReservation]
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockReservations
      } as Response)

      const result = await repository.getReservationsByCustomer('customer1')

      expect(fetch).toHaveBeenCalledWith('/api/reservation?customerId=customer1')
      expect(result).toEqual(mockReservations)
    })

    it('should throw error when fetch fails', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        statusText: 'Server Error'
      } as Response)

      await expect(repository.getReservationsByCustomer('customer1'))
        .rejects.toThrow('Failed to fetch customer reservations: Server Error')
    })
  })

  describe('getReservationsByStaff', () => {
    it('should fetch reservations by staff id successfully', async () => {
      const startDate = new Date('2024-01-01')
      const endDate = new Date('2024-01-31')
      const mockReservations = [mockReservation]
      
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockReservations
      } as Response)

      const result = await repository.getReservationsByStaff('cast1', startDate, endDate)

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/reservation?castId=cast1&startDate=')
      )
      expect(result).toEqual(mockReservations)
    })

    it('should throw error when fetch fails', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        statusText: 'Server Error'
      } as Response)

      await expect(repository.getReservationsByStaff('cast1', new Date(), new Date()))
        .rejects.toThrow('Failed to fetch staff reservations: Server Error')
    })
  })

  describe('getServices', () => {
    it('should fetch and transform services successfully', async () => {
      const mockCourses = [
        {
          id: 'course1',
          name: 'カット',
          duration: 60,
          price: 5000,
          description: 'カットサービス'
        }
      ]
      const mockOptions = [
        {
          id: 'option1',
          name: 'シャンプー',
          price: 1000
        }
      ]

      vi.mocked(fetch)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockCourses
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockOptions
        } as Response)

      const result = await repository.getServices()

      expect(fetch).toHaveBeenNthCalledWith(1, '/api/course')
      expect(fetch).toHaveBeenNthCalledWith(2, '/api/option')
      expect(result).toEqual([
        {
          id: 'course1',
          name: 'カット',
          type: 'course',
          duration: 60,
          price: 5000,
          description: 'カットサービス'
        },
        {
          id: 'option1',
          name: 'シャンプー',
          type: 'option',
          duration: 0,
          price: 1000,
          description: ''
        }
      ])
    })

    it('should throw error when fetching services fails', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false
      } as Response)

      await expect(repository.getServices())
        .rejects.toThrow('Failed to fetch services')
    })
  })

  describe('checkAvailability', () => {
    it('should check availability successfully', async () => {
      const startTime = new Date('2024-01-01T10:00:00')
      const endTime = new Date('2024-01-01T11:00:00')
      const mockResponse = { available: true }

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      } as Response)

      const result = await repository.checkAvailability('cast1', startTime, endTime)

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/reservation/availability/check?castId=cast1&startTime=')
      )
      expect(result).toEqual(mockResponse)
    })

    it('should return conflicts when not available', async () => {
      const startTime = new Date('2024-01-01T10:00:00')
      const endTime = new Date('2024-01-01T11:00:00')
      const mockResponse = {
        available: false,
        conflicts: [{ id: 'conflict1', startTime: '10:00', endTime: '11:00' }]
      }

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      } as Response)

      const result = await repository.checkAvailability('cast1', startTime, endTime)

      expect(result).toEqual(mockResponse)
    })

    it('should throw error when check fails', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        statusText: 'Server Error'
      } as Response)

      await expect(repository.checkAvailability('cast1', new Date(), new Date()))
        .rejects.toThrow('Failed to check availability: Server Error')
    })
  })

  describe('getAvailableSlots', () => {
    it('should fetch available slots successfully', async () => {
      const date = new Date('2024-01-01')
      const mockSlots = {
        availableSlots: [
          { startTime: '10:00', endTime: '11:00' },
          { startTime: '14:00', endTime: '15:00' }
        ]
      }

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockSlots
      } as Response)

      const result = await repository.getAvailableSlots('cast1', date, 60)

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/reservation/availability?castId=cast1&date=')
      )
      expect(result).toEqual(mockSlots.availableSlots)
    })

    it('should return empty array when no slots available', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({})
      } as Response)

      const result = await repository.getAvailableSlots('cast1', new Date(), 60)

      expect(result).toEqual([])
    })

    it('should throw error when fetch fails', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        statusText: 'Server Error'
      } as Response)

      await expect(repository.getAvailableSlots('cast1', new Date(), 60))
        .rejects.toThrow('Failed to get available slots: Server Error')
    })
  })
})