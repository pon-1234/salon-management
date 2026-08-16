/**
 * @design_doc   Customer phone identity normalization and customer detail serialization
 * @related_to   Customer API phone lookup, legacy migration, and customer repositories
 * @known_issues None
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  calculateAge,
  deserializeCustomer,
  findCustomerReservationByUsageRecordId,
  formatPhoneNumber,
  getCustomerPhoneTelHref,
  getCustomerPhoneIdentityVariants,
  getCustomerPhoneSearchFragments,
  isSameCustomerPhone,
  normalizeCustomerPhoneIdentity,
  normalizeWritableCustomerPhoneIdentity,
  partitionCustomerReservationHistory,
} from './utils'

describe('Customer Utils', () => {
  it.each([
    ['090-1234-5678', '+819012345678'],
    ['+81 90 1234 5678', '+819012345678'],
    ['819012345678', '+819012345678'],
    ['03-1234-5678', '+81312345678'],
  ])('canonicalizes Japanese phone identity %s to %s', (input, expected) => {
    expect(normalizeCustomerPhoneIdentity(input)).toBe(expected)
  })

  it('builds exact canonical and historical-national lookup variants', () => {
    expect(getCustomerPhoneIdentityVariants('090-1234-5678')).toEqual([
      '+819012345678',
      '09012345678',
      '819012345678',
    ])
    expect(isSameCustomerPhone('+819012345678', '090-1234-5678')).toBe(true)
    expect(isSameCustomerPhone('+819012345678', '080-1234-5678')).toBe(false)
  })

  it('keeps an exact legacy non-Japanese numeric identity searchable and comparable', () => {
    expect(normalizeCustomerPhoneIdentity('65-1234-5678')).toBeNull()
    expect(getCustomerPhoneIdentityVariants('65-1234-5678')).toEqual(['6512345678'])
    expect(isSameCustomerPhone('6512345678', '65-1234-5678')).toBe(true)
    expect(normalizeWritableCustomerPhoneIdentity('65-1234-5678')).toBeNull()
  })

  it('returns a usable search fragment for an exact legacy numeric identity', () => {
    expect(getCustomerPhoneSearchFragments('65-1234-5678')).toEqual(['6512345678'])
  })

  it('normalizes the explicit optional Japanese trunk only in international notation', () => {
    expect(normalizeCustomerPhoneIdentity('+81 (0)3-1234-5678')).toBe('+81312345678')
    expect(normalizeCustomerPhoneIdentity('+810312345678')).toBeNull()
    expect(normalizeCustomerPhoneIdentity('810312345678')).toBeNull()
  })

  it('builds domestic and international fragments from optional trunk notation', () => {
    expect(getCustomerPhoneSearchFragments('+81 (0)3-1234-5678')).toEqual([
      '0312345678',
      '81312345678',
    ])
  })

  it.each(['', '123', '000-0000-0000', '090abc12345', '+1 202 555 0100'])(
    'rejects unsupported customer phone identity %j',
    (input) => {
      expect(normalizeCustomerPhoneIdentity(input)).toBeNull()
      expect(getCustomerPhoneIdentityVariants(input)).toEqual([])
    }
  )

  it('formats a migrated E.164 Japanese number in familiar national form', () => {
    expect(formatPhoneNumber('+819012345678')).toBe('090-1234-5678')
    expect(formatPhoneNumber('+81312345678')).toBe('03-1234-5678')
  })

  it.each([
    ['090-1234-5678', '+819012345678'],
    ['+81 90 1234 5678', '+819012345678'],
    ['+81 (0)3-1234-5678', '+81312345678'],
    ['06-1234-5678', '+81612345678'],
    ['0120-123-456', '+81120123456'],
    ['0570-123-456', '+81570123456'],
    ['0800-123-4567', '+818001234567'],
  ])('accepts a writable Japanese phone %s as %s', (input, expected) => {
    expect(normalizeWritableCustomerPhoneIdentity(input)).toBe(expected)
  })

  it.each([
    '090-123-4567',
    '050-123-4567',
    '03-1234-56789',
    '0120-1234-567',
    '0570-1234-567',
    '0800-123-456',
  ])(
    'rejects an unsupported phone length for new writes while preserving legacy lookup: %s',
    (input) => {
      expect(normalizeCustomerPhoneIdentity(input)).not.toBeNull()
      expect(getCustomerPhoneIdentityVariants(input)).not.toEqual([])
      expect(normalizeWritableCustomerPhoneIdentity(input)).toBeNull()
    }
  )

  it.each([
    ['+81612345678', '06-1234-5678'],
    ['+81120123456', '0120-123-456'],
    ['+81570123456', '0570-123-456'],
    ['+818001234567', '0800-123-4567'],
    ['+81595123456', '0595123456'],
    ['+81901234567', '0901234567'],
  ])('formats %s without inventing an incorrect separator as %s', (input, expected) => {
    expect(formatPhoneNumber(input)).toBe(expected)
  })

  it('keeps the international prefix when building a migrated customer phone link', () => {
    expect(getCustomerPhoneTelHref('+819012345678')).toBe('tel:+819012345678')
  })

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

  it('keeps an intentionally incomplete backoffice profile unset', () => {
    const customer = deserializeCustomer({
      id: 'customer-name-only',
      name: '名前のみ顧客',
      phone: '+819012345678',
      email: null,
      password: null,
      birthDate: null,
      createdAt: '2026-08-15T00:00:00.000Z',
      updatedAt: '2026-08-15T00:00:00.000Z',
    })

    expect(customer.email).toBe('')
    expect(customer.password).toBe('')
    expect(customer.birthDate).toBeUndefined()
    expect(customer.age).toBeUndefined()
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
