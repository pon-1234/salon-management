import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getReservationsByCustomerId,
  getAllReservations,
  updateReservation,
  addReservation,
} from './data'

describe('Reservation Data', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // Note: services array is not exported as it's only used internally
  // The test for services has been removed as it's not part of the public API

  describe('getReservationsByCustomerId', () => {
    it('should return reservations for a specific customer', async () => {
      const reservations = await getReservationsByCustomerId('1')

      expect(Array.isArray(reservations)).toBe(true)
      reservations.forEach((reservation) => {
        expect(reservation.customerId).toBe('1')
      })
    })

    it('should return empty array for non-existent customer', async () => {
      const reservations = await getReservationsByCustomerId('non-existent')
      expect(reservations).toEqual([])
    })

    it('should have valid reservation structure', async () => {
      const reservations = await getReservationsByCustomerId('1')

      if (reservations.length > 0) {
        const reservation = reservations[0]
        expect(reservation).toHaveProperty('id')
        expect(reservation).toHaveProperty('customerId')
        expect(reservation).toHaveProperty('staffId')
        expect(reservation).toHaveProperty('serviceId')
        expect(reservation).toHaveProperty('startTime')
        expect(reservation).toHaveProperty('endTime')
        expect(reservation).toHaveProperty('status')
        expect(reservation).toHaveProperty('price')
        expect(reservation).toHaveProperty('createdAt')
        expect(reservation).toHaveProperty('updatedAt')

        expect(reservation.startTime).toBeInstanceOf(Date)
        expect(reservation.endTime).toBeInstanceOf(Date)
        expect(reservation.createdAt).toBeInstanceOf(Date)
        expect(reservation.updatedAt).toBeInstanceOf(Date)
      }
    })
  })

  describe('getAllReservations', () => {
    it('should return all reservations', async () => {
      const reservations = await getAllReservations()

      expect(Array.isArray(reservations)).toBe(true)
      expect(reservations.length).toBeGreaterThan(0)
    })

    it('should have different statuses in reservations', async () => {
      const reservations = await getAllReservations()
      const statuses = [...new Set(reservations.map((r) => r.status))]

      expect(statuses.length).toBeGreaterThan(1)
      expect(statuses).toContain('confirmed')
    })
  })

  describe('updateReservation', () => {
    it('should update a reservation', async () => {
      const reservations = await getAllReservations()
      const originalReservation = reservations[0]
      const originalNotes = originalReservation.notes

      updateReservation(originalReservation.id, { notes: 'Updated notes' })

      const updatedReservations = await getAllReservations()
      const updatedReservation = updatedReservations.find((r) => r.id === originalReservation.id)

      expect(updatedReservation?.notes).toBe('Updated notes')
    })

    it('should handle non-existent reservation ID', () => {
      // The function doesn't return anything or throw, so we just ensure it doesn't crash
      expect(() => {
        updateReservation('non-existent', { notes: 'Test' })
      }).not.toThrow()
    })
  })

  describe('addReservation', () => {
    it('should add a new reservation', () => {
      const newReservation = {
        customerId: '1',
        staffId: '1',
        serviceId: 'campaign90',
        startTime: new Date('2024-01-15T10:00:00'),
        endTime: new Date('2024-01-15T11:30:00'),
        status: 'confirmed' as const,
        price: 19000,
      }

      const result = addReservation(newReservation)

      expect(result).toBeDefined()
      expect(result.customerId).toBe('1')
      expect(result.id).toBeDefined()
      expect(result.createdAt).toBeInstanceOf(Date)
      expect(result.updatedAt).toBeInstanceOf(Date)
    })

    it('should generate unique IDs for new reservations', () => {
      const reservations = []

      for (let i = 0; i < 3; i++) {
        const result = addReservation({
          customerId: '1',
          staffId: '1',
          serviceId: 'campaign90',
          startTime: new Date('2024-01-15T10:00:00'),
          endTime: new Date('2024-01-15T11:30:00'),
          status: 'confirmed',
          price: 19000,
        })

        reservations.push(result)
      }

      const ids = reservations.map((r) => r.id)
      const uniqueIds = [...new Set(ids)]

      expect(ids.length).toBe(uniqueIds.length)
    })
  })
})
