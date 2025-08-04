import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ReservationUseCases } from './usecases'
import { ReservationRepository } from './repository'
import type { Reservation, Service } from '../types/reservation'

describe('ReservationUseCases', () => {
  let mockRepository: ReservationRepository
  let useCases: ReservationUseCases

  beforeEach(() => {
    mockRepository = {
      getReservationsByCustomer: vi.fn(),
      getReservationsByStaff: vi.fn(),
      getServices: vi.fn(),
      checkAvailability: vi.fn(),
      getAvailableSlots: vi.fn(),
      getAll: vi.fn(),
      getById: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    } as unknown as ReservationRepository
    useCases = new ReservationUseCases(mockRepository)
  })

  describe('getReservationsByCustomer', () => {
    it('should return reservations for a specific customer', async () => {
      const customerId = 'customer-123'
      const mockReservations: Reservation[] = [
        {
          id: 'res-1',
          customerId,
          staffId: 'cast-1',
          serviceId: 'course-1',
          startTime: new Date('2024-01-01T10:00:00Z'),
          endTime: new Date('2024-01-01T11:00:00Z'),
          status: 'confirmed',
          price: 10000,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

      vi.mocked(mockRepository.getReservationsByCustomer).mockResolvedValue(mockReservations)

      const result = await useCases.getReservationsByCustomer(customerId)

      expect(mockRepository.getReservationsByCustomer).toHaveBeenCalledWith(customerId)
      expect(result).toEqual(mockReservations)
    })

    it('should return empty array when no reservations found', async () => {
      const customerId = 'customer-456'
      vi.mocked(mockRepository.getReservationsByCustomer).mockResolvedValue([])

      const result = await useCases.getReservationsByCustomer(customerId)

      expect(mockRepository.getReservationsByCustomer).toHaveBeenCalledWith(customerId)
      expect(result).toEqual([])
    })
  })

  describe('getReservationsByStaff', () => {
    it('should return reservations for a specific staff within date range', async () => {
      const staffId = 'staff-123'
      const startDate = new Date('2024-01-01')
      const endDate = new Date('2024-01-31')
      const mockReservations: Reservation[] = [
        {
          id: 'res-2',
          customerId: 'customer-1',
          staffId: staffId,
          serviceId: 'course-1',
          startTime: new Date('2024-01-15T10:00:00Z'),
          endTime: new Date('2024-01-15T11:00:00Z'),
          status: 'confirmed',
          price: 15000,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

      vi.mocked(mockRepository.getReservationsByStaff).mockResolvedValue(mockReservations)

      const result = await useCases.getReservationsByStaff(staffId, startDate, endDate)

      expect(mockRepository.getReservationsByStaff).toHaveBeenCalledWith(
        staffId,
        startDate,
        endDate
      )
      expect(result).toEqual(mockReservations)
    })

    it('should handle empty date range', async () => {
      const staffId = 'staff-789'
      const startDate = new Date('2024-02-01')
      const endDate = new Date('2024-02-01')

      vi.mocked(mockRepository.getReservationsByStaff).mockResolvedValue([])

      const result = await useCases.getReservationsByStaff(staffId, startDate, endDate)

      expect(mockRepository.getReservationsByStaff).toHaveBeenCalledWith(
        staffId,
        startDate,
        endDate
      )
      expect(result).toEqual([])
    })
  })

  describe('getServices', () => {
    it('should return all available services', async () => {
      const mockServices: Service[] = [
        {
          id: 'service-1',
          name: 'カット',
          duration: 30,
          price: 3000,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'service-2',
          name: 'カラー',
          duration: 90,
          price: 8000,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

      vi.mocked(mockRepository.getServices).mockResolvedValue(mockServices)

      const result = await useCases.getServices()

      expect(mockRepository.getServices).toHaveBeenCalled()
      expect(result).toEqual(mockServices)
    })

    it('should return empty array when no services available', async () => {
      vi.mocked(mockRepository.getServices).mockResolvedValue([])

      const result = await useCases.getServices()

      expect(mockRepository.getServices).toHaveBeenCalled()
      expect(result).toEqual([])
    })
  })
})
