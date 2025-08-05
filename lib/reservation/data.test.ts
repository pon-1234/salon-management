import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  services,
  getReservationsByCustomerId,
  getAllReservations,
  updateReservation,
  addReservation,
} from './data'

describe('Reservation Data', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('services', () => {
    it('should export an array of services', () => {
      expect(Array.isArray(services)).toBe(true)
      expect(services.length).toBeGreaterThan(0)
    })

    it('should have valid service structure', () => {
      services.forEach((service) => {
        expect(service).toHaveProperty('id')
        expect(service).toHaveProperty('name')
        expect(service).toHaveProperty('duration')
        expect(service).toHaveProperty('price')
        expect(service).toHaveProperty('createdAt')
        expect(service).toHaveProperty('updatedAt')
        expect(service.createdAt).toBeInstanceOf(Date)
        expect(service.updatedAt).toBeInstanceOf(Date)
        expect(typeof service.duration).toBe('number')
        expect(typeof service.price).toBe('number')
      })
    })

    it('should have unique service IDs', () => {
      const ids = services.map((service) => service.id)
      const uniqueIds = [...new Set(ids)]
      expect(ids.length).toBe(uniqueIds.length)
    })

    it('should include different types of services', () => {
      const campaignServices = services.filter((s) => s.id.includes('campaign'))
      const regularServices = services.filter((s) => s.id.includes('min'))
      const extensionServices = services.filter((s) => s.id.includes('extension'))

      expect(campaignServices.length).toBeGreaterThan(0)
      expect(regularServices.length).toBeGreaterThan(0)
      expect(extensionServices.length).toBeGreaterThan(0)
    })
  })

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
        reservations.forEach((reservation) => {
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
        })
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
    })
  })

  describe('updateReservation', () => {
    it('should update a reservation', async () => {
      const allReservations = await getAllReservations()
      const firstReservation = allReservations[0]
      const originalStatus = firstReservation.status
      const newStatus = originalStatus === 'confirmed' ? 'pending' : 'confirmed'

      updateReservation(firstReservation.id, { status: newStatus })

      const updatedReservations = await getAllReservations()
      const updatedReservation = updatedReservations.find((r) => r.id === firstReservation.id)

      expect(updatedReservation?.status).toBe(newStatus)
      expect(updatedReservation?.updatedAt.getTime()).toBeGreaterThan(
        firstReservation.updatedAt.getTime()
      )
    })

    it('should handle non-existent reservation ID', () => {
      expect(() => {
        updateReservation('non-existent', { status: 'cancelled' })
      }).not.toThrow()
    })
  })

  describe('addReservation', () => {
    it('should add a new reservation', async () => {
      const initialReservations = await getAllReservations()
      const initialCount = initialReservations.length

      const newReservation = addReservation({
        customerId: '1',
        staffId: '1',
        serviceId: '60min',
        startTime: new Date(2024, 11, 20, 10, 0),
        endTime: new Date(2024, 11, 20, 11, 0),
        status: 'pending',
        price: 16000,
      })

      expect(newReservation).toHaveProperty('id')
      expect(newReservation).toHaveProperty('createdAt')
      expect(newReservation).toHaveProperty('updatedAt')
      expect(newReservation.customerId).toBe('1')
      expect(newReservation.status).toBe('pending')

      const updatedReservations = await getAllReservations()
      expect(updatedReservations.length).toBe(initialCount + 1)
    })

    it('should generate unique IDs for new reservations', async () => {
      const reservation1 = addReservation({
        customerId: '1',
        staffId: '1',
        serviceId: '60min',
        startTime: new Date(),
        endTime: new Date(),
        status: 'pending',
        price: 16000,
      })

      const reservation2 = addReservation({
        customerId: '2',
        staffId: '2',
        serviceId: '80min',
        startTime: new Date(),
        endTime: new Date(),
        status: 'confirmed',
        price: 21000,
      })

      expect(reservation1.id).not.toBe(reservation2.id)
    })
  })
})
