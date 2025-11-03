import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ReservationRepositoryImpl } from './repository-impl'
import { Reservation } from '../types/reservation'
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
    customerId: 'customer1',
    staffId: 'cast1',
    castId: 'cast1',
    serviceId: 'service1',
    startTime: new Date('2024-01-01T10:00:00'),
    endTime: new Date('2024-01-01T11:00:00'),
    status: 'confirmed',
    price: 5000,
    notes: 'テスト予約',
    discountAmount: 0,
    storeId: 'ikebukuro',
    createdAt: new Date('2023-12-01'),
    updatedAt: new Date('2023-12-01'),
  }

  describe('getAll', () => {
    it('should fetch all reservations successfully', async () => {
      const mockReservations = [mockReservation]
      vi.mocked(fetch).mockResolvedValueOnce(mockResponse({ body: mockReservations }))

      const result = await repository.getAll()

      const [url, init] = vi.mocked(fetch).mock.calls[0]
      expect(url).toBe('/api/reservation')
      expect(init?.method).toBe('GET')
      expect(result).toEqual([
        expect.objectContaining({ id: mockReservation.id, customerId: mockReservation.customerId }),
      ])
    })

    it('should throw error when fetch fails', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        mockResponse({ ok: false, status: 500, statusText: 'Internal Server Error' })
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
    it('should fetch reservation by id successfully', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(mockResponse({ status: 200, body: mockReservation }))

      const result = await repository.getById('1')

      const [url, init] = vi.mocked(fetch).mock.calls[0]
      expect(url).toBe('/api/reservation?id=1')
      expect(init?.method).toBe('GET')
      expect(result).toMatchObject({ id: mockReservation.id, customerId: mockReservation.customerId })
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
        mockResponse({ ok: false, status: 500, statusText: 'Internal Server Error' })
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
    it('should create reservation successfully', async () => {
      const newReservationData = {
        customerId: 'customer1',
        staffId: 'cast1',
        storeId: 'ikebukuro',
        serviceId: 'service1',
        startTime: new Date('2024-01-15T14:00:00'),
        endTime: new Date('2024-01-15T15:00:00'),
        status: 'confirmed' as const,
        price: 5000,
        notes: '',
      }

      vi.mocked(fetch).mockResolvedValueOnce(
        mockResponse({
          body: {
            ...newReservationData,
            id: '2',
          },
        })
      )

      const result = await repository.create(newReservationData)

      const [url, init] = vi.mocked(fetch).mock.calls[0]
      expect(url).toBe('/api/reservation')
      expect(init?.method).toBe('POST')
      expect(init?.body).toBe(JSON.stringify(newReservationData))
      const headers = init?.headers instanceof Headers ? init.headers : new Headers(init?.headers)
      expect(headers?.get('Content-Type')).toBe('application/json')
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
            endTime: '15:00',
          },
        ],
      }

      vi.mocked(fetch).mockResolvedValueOnce(
        mockResponse({ ok: false, status: 409, statusText: 'Conflict', body: conflictData })
      )

      await expect(
        repository.create({
          customerId: 'customer1',
          staffId: 'cast1',
          storeId: 'ikebukuro',
          serviceId: 'service1',
          startTime: new Date('2024-01-15T14:00:00'),
          endTime: new Date('2024-01-15T15:00:00'),
          status: 'confirmed',
          price: 0,
          notes: '',
        })
      ).rejects.toMatchObject({
        message: 'Time slot is not available',
        status: 409,
        conflicts: conflictData.conflicts,
      })
    })

    it('should throw generic error for other failures', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        mockResponse({
          ok: false,
          status: 400,
          statusText: 'Bad Request',
          body: { error: 'Invalid data' },
        })
      )

      const promise = repository.create({
        customerId: 'customer1',
        staffId: 'cast1',
        storeId: 'ikebukuro',
        serviceId: 'service1',
        startTime: new Date('2024-01-15T14:00:00'),
        endTime: new Date('2024-01-15T15:00:00'),
        status: 'confirmed',
        price: 0,
        notes: '',
      })

      await expect(promise).rejects.toThrow(ApiError)
      await expect(promise).rejects.toMatchObject({
        status: 400,
        message: 'Invalid data',
      })
    })
  })

  describe('update', () => {
    it('should update reservation successfully', async () => {
      const updateData = { status: 'cancelled' as const, notes: '顧客都合でキャンセル' }
      const updatedReservation = { ...mockReservation, ...updateData }

      vi.mocked(fetch).mockResolvedValueOnce(mockResponse({ body: updatedReservation }))

      const result = await repository.update('1', updateData)

      const [url, init] = vi.mocked(fetch).mock.calls[0]
      expect(url).toBe('/api/reservation')
      expect(init?.method).toBe('PUT')
      expect(init?.body).toBe(JSON.stringify({ id: '1', ...updateData }))
      expect(result).toMatchObject({ id: mockReservation.id, status: updateData.status })
    })

    it('should handle 409 conflict on update', async () => {
      const conflictData = {
        error: 'Time slot is not available',
        conflicts: [{ id: 'conflict1' }],
      }

      vi.mocked(fetch).mockResolvedValueOnce(
        mockResponse({ ok: false, status: 409, statusText: 'Conflict', body: conflictData })
      )

      const promise = repository.update('1', { startTime: new Date('2024-01-01T15:00:00') })
      await expect(promise).rejects.toThrow(ApiError)
      await expect(promise).rejects.toMatchObject({
        status: 409,
        message: 'Time slot is not available',
        conflicts: conflictData.conflicts,
      })
    })

    it('should throw error for other update failures', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        mockResponse({
          ok: false,
          status: 404,
          statusText: 'Not Found',
          body: { error: 'Reservation not found' },
        })
      )

      const promise = repository.update('999', { status: 'cancelled' })
      await expect(promise).rejects.toThrow(ApiError)
      await expect(promise).rejects.toMatchObject({
        status: 404,
        message: 'Reservation not found',
      })
    })
  })

  describe('delete', () => {
    it('should delete reservation successfully', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(mockResponse({ status: 204 }))

      const result = await repository.delete('1')

      const [url, init] = vi.mocked(fetch).mock.calls[0]
      expect(url).toBe('/api/reservation?id=1')
      expect(init?.method).toBe('DELETE')
      expect(result).toBe(true)
    })

    it('should throw error when delete fails', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        mockResponse({
          ok: false,
          status: 403,
          statusText: 'Forbidden',
          body: { error: 'Access denied' },
        })
      )

      const promise = repository.delete('1')
      await expect(promise).rejects.toThrow(ApiError)
      await expect(promise).rejects.toMatchObject({
        status: 403,
        message: 'Access denied',
      })
    })
  })

  describe('getReservationsByCustomer', () => {
    it('should fetch reservations by customer id successfully', async () => {
      const mockReservations = [mockReservation]
      vi.mocked(fetch).mockResolvedValueOnce(mockResponse({ body: mockReservations }))

      const result = await repository.getReservationsByCustomer('customer1')

      const [url, init] = vi.mocked(fetch).mock.calls[0]
      expect(url).toBe('/api/reservation?customerId=customer1')
      expect(init?.method).toBe('GET')
      expect(result).toEqual([
        expect.objectContaining({ id: mockReservation.id, customerId: mockReservation.customerId }),
      ])
    })

    it('should throw error when fetch fails', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        mockResponse({ ok: false, status: 500, statusText: 'Server Error' })
      )

      const promise = repository.getReservationsByCustomer('customer1')
      await expect(promise).rejects.toThrow(ApiError)
      await expect(promise).rejects.toMatchObject({ status: 500, message: 'Server Error' })
    })
  })

  describe('getReservationsByStaff', () => {
    it('should fetch reservations by staff id successfully', async () => {
      const startDate = new Date('2024-01-01')
      const endDate = new Date('2024-01-31')
      const mockReservations = [mockReservation]

      vi.mocked(fetch).mockResolvedValueOnce(mockResponse({ body: mockReservations }))

      const result = await repository.getReservationsByStaff('cast1', startDate, endDate)

      const [url, init] = vi.mocked(fetch).mock.calls[0]
      expect(url).toContain('/api/reservation?')
      expect(url).toContain('castId=cast1')
      expect(url).toContain(`startDate=${encodeURIComponent(startDate.toISOString())}`)
      expect(url).toContain(`endDate=${encodeURIComponent(endDate.toISOString())}`)
      expect(init?.method).toBe('GET')
      expect(result).toEqual([
        expect.objectContaining({ id: mockReservation.id, staffId: mockReservation.staffId }),
      ])
    })

    it('should throw error when fetch fails', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        mockResponse({ ok: false, status: 500, statusText: 'Server Error' })
      )

      const promise = repository.getReservationsByStaff('cast1', new Date(), new Date())
      await expect(promise).rejects.toThrow(ApiError)
      await expect(promise).rejects.toMatchObject({ status: 500, message: 'Server Error' })
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
          description: 'カットサービス',
        },
      ]
      const mockOptions = [
        {
          id: 'option1',
          name: 'シャンプー',
          price: 1000,
        },
      ]

      vi.mocked(fetch)
        .mockResolvedValueOnce(mockResponse({ body: mockCourses }))
        .mockResolvedValueOnce(mockResponse({ body: mockOptions }))

      const result = await repository.getServices()

      expect(fetch).toHaveBeenNthCalledWith(1, '/api/course', expect.any(Object))
      expect(fetch).toHaveBeenNthCalledWith(2, '/api/option', expect.any(Object))
      expect(result).toEqual([
        {
          id: 'course1',
          name: 'カット',
          type: 'course',
          duration: 60,
          price: 5000,
          description: 'カットサービス',
        },
        {
          id: 'option1',
          name: 'シャンプー',
          type: 'option',
          duration: 0,
          price: 1000,
          description: '',
        },
      ])
    })

    it('should throw error when fetching services fails', async () => {
      vi.mocked(fetch)
        .mockResolvedValueOnce(
          mockResponse({ ok: false, status: 500, statusText: 'Server Error' })
        )
        .mockResolvedValueOnce(mockResponse({ body: [] }))

      const promise = repository.getServices()
      await expect(promise).rejects.toThrow(ApiError)
    })
  })

  describe('checkAvailability', () => {
    it('should check availability successfully', async () => {
      const startTime = new Date('2024-01-01T10:00:00')
      const endTime = new Date('2024-01-01T11:00:00')
      const availability = { available: true }

      vi.mocked(fetch).mockResolvedValueOnce(mockResponse({ body: availability }))

      const result = await repository.checkAvailability('cast1', startTime, endTime)

      const [url, init] = vi.mocked(fetch).mock.calls[0]
      expect(url).toContain('/api/reservation/availability?')
      expect(url).toContain('castId=cast1')
      expect(url).toContain(`startTime=${encodeURIComponent(startTime.toISOString())}`)
      expect(url).toContain(`endTime=${encodeURIComponent(endTime.toISOString())}`)
      expect(url).toContain('mode=check')
      expect(init?.method).toBe('GET')
      expect(result).toEqual(availability)
    })

    it('should return conflicts when not available', async () => {
      const startTime = new Date('2024-01-01T10:00:00')
      const endTime = new Date('2024-01-01T11:00:00')
      const availabilityResponse = {
        available: false,
        conflicts: [{ id: 'conflict1', startTime: '10:00', endTime: '11:00' }],
      }

      vi.mocked(fetch).mockResolvedValueOnce(
        mockResponse({ body: availabilityResponse })
      )

      const result = await repository.checkAvailability('cast1', startTime, endTime)

      expect(result).toEqual(availabilityResponse)
    })

    it('should throw error when check fails', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        mockResponse({ ok: false, status: 500, statusText: 'Server Error' })
      )

      const promise = repository.checkAvailability('cast1', new Date(), new Date())
      await expect(promise).rejects.toThrow(ApiError)
    })
  })

  describe('getAvailableSlots', () => {
    it('should fetch available slots successfully', async () => {
      const date = new Date('2024-01-01')
      const mockSlots = {
        availableSlots: [
          { startTime: '10:00', endTime: '11:00' },
          { startTime: '14:00', endTime: '15:00' },
        ],
      }

      vi.mocked(fetch).mockResolvedValueOnce(mockResponse({ body: mockSlots }))

      const result = await repository.getAvailableSlots('cast1', date, 60)

      const [url, init] = vi.mocked(fetch).mock.calls[0]
      expect(url).toContain('/api/reservation/availability?')
      expect(url).toContain('castId=cast1')
      expect(url).toContain('date=2024-01-01')
      expect(url).toContain('duration=60')
      expect(init?.method).toBe('GET')
      expect(result).toEqual(mockSlots.availableSlots)
    })

    it('should return empty array when no slots available', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(mockResponse({ body: {} }))

      const result = await repository.getAvailableSlots('cast1', new Date(), 60)

      expect(result).toEqual([])
    })

    it('should throw error when fetch fails', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        mockResponse({ ok: false, status: 500, statusText: 'Server Error' })
      )

      const promise = repository.getAvailableSlots('cast1', new Date(), 60)
      await expect(promise).rejects.toThrow(ApiError)
    })
  })
})
