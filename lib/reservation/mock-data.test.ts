import { describe, it, expect, beforeEach } from 'vitest'
import {
  getMockReservationsByCustomerId,
  getAllMockReservations,
  updateMockReservation,
  addMockReservation,
  resetMockReservations,
  getMockReservations,
} from './mock-data'

import { Reservation } from '@/lib/types/reservation'

const baseMockReservation: Reservation = {
  id: '1',
  customerId: '1',
  staffId: '1',
  castId: '1',
  serviceId: 'service1',
  startTime: new Date('2024-01-01T10:00:00Z'),
  endTime: new Date('2024-01-01T11:00:00Z'),
  status: 'confirmed',
  price: 10000,
  storeId: 'ikebukuro',
  createdAt: new Date('2024-01-01T09:00:00Z'),
  updatedAt: new Date('2024-01-01T09:00:00Z'),
}

beforeEach(() => {
  resetMockReservations([baseMockReservation])
})

describe('mock reservation data helpers', () => {
  it('returns reservations for a customer', async () => {
    const reservations = await getMockReservationsByCustomerId('1')
    expect(reservations).toHaveLength(1)
    expect(reservations[0].customerId).toBe('1')
  })

  it('returns empty array when customer has no reservations', async () => {
    const reservations = await getMockReservationsByCustomerId('999')
    expect(reservations).toEqual([])
  })

  it('returns a snapshot of all reservations', async () => {
    const reservations = await getAllMockReservations()
    expect(reservations).toHaveLength(1)
  })

  it('updates a mock reservation in place', () => {
    updateMockReservation('1', { status: 'pending' })
    const reservations = getMockReservations()
    expect(reservations[0].status).toBe('pending')
  })

  it('adds a mock reservation', () => {
    const created = addMockReservation({
      customerId: '2',
      staffId: '1',
      castId: '1',
      storeId: 'ikebukuro',
      serviceId: 'service2',
      startTime: new Date('2024-01-02T10:00:00Z'),
      endTime: new Date('2024-01-02T11:00:00Z'),
      status: 'confirmed',
      price: 12000,
    } as any)

    expect(created.id).toBe('2')
    const reservations = getMockReservations()
    expect(reservations).toHaveLength(2)
  })
})
