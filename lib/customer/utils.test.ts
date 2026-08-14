import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  calculateAge,
  deserializeCustomer,
  findCustomerReservationByUsageRecordId,
  partitionCustomerReservationHistory,
} from './utils'

describe('Customer Utils', () => {
  it('preserves and date-normalizes reservation relations from the customer detail API', () => {
    const customer = deserializeCustomer({
      id: 'customer-1',
      name: '顧客',
      phone: '09012345678',
      email: 'customer@example.com',
      birthDate: '1990-01-01T00:00:00.000Z',
      createdAt: '2020-01-01T00:00:00.000Z',
      updatedAt: '2026-07-28T00:00:00.000Z',
      reservations: [
        {
          id: 'reservation-1',
          customerId: 'customer-1',
          castId: 'cast-1',
          courseId: 'course-1',
          startTime: '2026-07-29T10:00:00.000Z',
          endTime: '2026-07-29T11:20:00.000Z',
          status: 'confirmed',
          price: 21000,
          storeId: 'uat-ikebukuro',
          cast: { name: '確認キャスト' },
          course: { name: '80分コース' },
          createdAt: '2026-07-28T00:00:00.000Z',
          updatedAt: '2026-07-28T00:00:00.000Z',
        },
      ],
    })

    expect(customer.reservations).toEqual([
      expect.objectContaining({
        id: 'reservation-1',
        startTime: new Date('2026-07-29T10:00:00.000Z'),
        endTime: new Date('2026-07-29T11:20:00.000Z'),
        status: 'confirmed',
        staffName: '確認キャスト',
        serviceName: '80分コース',
      }),
    ])
  })

  it('preserves migrated membership state and activity timestamps', () => {
    const customer = deserializeCustomer({
      id: 'legacy-customer-member-1',
      name: '旧顧客',
      phone: '09012345678',
      email: 'legacy@example.com',
      birthDate: '1990-01-01T00:00:00.000Z',
      accountStatus: 'blocked',
      membershipStage: 'gold',
      lastLoginAt: '2026-07-18T00:00:00.000Z',
      lastVisitAt: '2026-07-19T00:00:00.000Z',
      createdAt: '2020-01-01T00:00:00.000Z',
      updatedAt: '2026-07-28T00:00:00.000Z',
    })

    expect(customer).toEqual(
      expect.objectContaining({
        accountStatus: 'blocked',
        membershipStage: 'gold',
        lastLoginDate: new Date('2026-07-18T00:00:00.000Z'),
        lastVisitDate: new Date('2026-07-19T00:00:00.000Z'),
      })
    )
  })

  it('separates active reservations from completed customer usage history', () => {
    const customer = deserializeCustomer({
      id: 'customer-1',
      name: '顧客',
      phone: '09012345678',
      email: 'customer@example.com',
      birthDate: '1990-01-01T00:00:00.000Z',
      createdAt: '2020-01-01T00:00:00.000Z',
      updatedAt: '2026-07-28T00:00:00.000Z',
      reservations: [
        {
          id: 'active',
          customerId: 'customer-1',
          castId: 'cast-1',
          courseId: 'course-1',
          startTime: '2026-07-29T10:00:00.000Z',
          endTime: '2026-07-29T11:20:00.000Z',
          status: 'confirmed',
          price: 21000,
          storeId: 'uat-ikebukuro',
          cast: { name: '確認キャスト' },
          course: { name: '80分コース' },
        },
        {
          id: 'completed',
          customerId: 'customer-1',
          castId: 'cast-1',
          courseId: 'course-1',
          startTime: '2026-07-20T10:00:00.000Z',
          endTime: '2026-07-20T11:20:00.000Z',
          status: 'completed',
          price: 21000,
          storeId: 'uat-ikebukuro',
          cast: { name: '確認キャスト' },
          course: { name: '80分コース' },
        },
      ],
    })

    expect(partitionCustomerReservationHistory(customer.reservations ?? [])).toEqual({
      activeReservations: [expect.objectContaining({ id: 'active' })],
      usageHistory: [
        expect.objectContaining({
          id: 'completed',
          serviceName: '80分コース',
          staffName: '確認キャスト',
          amount: 21000,
          status: 'completed',
        }),
      ],
    })
  })

  it('finds the exact historical reservation by usage record id when dates overlap', () => {
    const customer = deserializeCustomer({
      id: 'customer-1',
      name: '顧客',
      phone: '09012345678',
      email: 'customer@example.com',
      birthDate: '1990-01-01T00:00:00.000Z',
      createdAt: '2020-01-01T00:00:00.000Z',
      updatedAt: '2026-07-28T00:00:00.000Z',
      reservations: [
        {
          id: 'completed-first',
          customerId: 'customer-1',
          castId: 'cast-1',
          courseId: 'course-1',
          startTime: '2026-07-20T10:00:00.000Z',
          endTime: '2026-07-20T11:20:00.000Z',
          status: 'completed',
          price: 21000,
          storeId: 'uat-ikebukuro',
        },
        {
          id: 'completed-target',
          customerId: 'customer-1',
          castId: 'cast-2',
          courseId: 'course-2',
          startTime: '2026-07-20T12:00:00.000Z',
          endTime: '2026-07-20T13:20:00.000Z',
          status: 'completed',
          price: 24000,
          storeId: 'uat-ikebukuro',
        },
      ],
    })

    expect(
      findCustomerReservationByUsageRecordId(customer.reservations ?? [], 'completed-target')
    ).toEqual(expect.objectContaining({ id: 'completed-target', castId: 'cast-2' }))
  })

  describe('calculateAge', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should calculate age correctly when birthday has passed this year', () => {
      vi.setSystemTime(new Date('2024-06-15'))
      const birthDate = new Date('1990-03-20')

      expect(calculateAge(birthDate)).toBe(34)
    })

    it('should calculate age correctly when birthday has not passed this year', () => {
      vi.setSystemTime(new Date('2024-02-15'))
      const birthDate = new Date('1990-03-20')

      expect(calculateAge(birthDate)).toBe(33)
    })

    it('should calculate age correctly on birthday', () => {
      vi.setSystemTime(new Date('2024-03-20'))
      const birthDate = new Date('1990-03-20')

      expect(calculateAge(birthDate)).toBe(34)
    })

    it('should calculate age correctly for leap year birthdays', () => {
      vi.setSystemTime(new Date('2024-03-01'))
      const birthDate = new Date('2000-02-29')

      expect(calculateAge(birthDate)).toBe(24)
    })

    it('should handle future dates (negative age)', () => {
      vi.setSystemTime(new Date('2024-01-01'))
      const birthDate = new Date('2025-01-01')

      expect(calculateAge(birthDate)).toBe(-1)
    })

    it('should calculate age for someone born today', () => {
      const today = new Date('2024-03-20')
      vi.setSystemTime(today)
      const birthDate = new Date('2024-03-20')

      expect(calculateAge(birthDate)).toBe(0)
    })
  })
})
