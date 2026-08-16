/**
 * @design_doc   Customer-facing API response boundaries
 * @related_to   customer-dto.ts, reservation API, customer API
 * @known_issues None currently
 */
import { describe, expect, it } from 'vitest'
import {
  sanitizeCustomerAdminDetailResponse,
  sanitizeCustomerReservationResponse,
  sanitizeCustomerSelfResponse,
} from './customer-dto'

const internalReservation = {
  id: 'reservation-1',
  storeId: 'store-1',
  customerId: 'customer-1',
  castId: 'cast-1',
  courseId: 'course-1',
  startTime: new Date('2026-08-01T03:00:00.000Z'),
  endTime: new Date('2026-08-01T05:00:00.000Z'),
  status: 'confirmed',
  settlementStatus: 'paid',
  price: 30_000,
  storeRevenue: 12_000,
  staffRevenue: 18_000,
  welfareExpense: 3_000,
  entryReceivedBy: 'staff-secret-id',
  entryMemo: 'internal entry memo',
  marketingChannel: 'internal campaign',
  storeMemo: 'internal store memo',
  pointsUsed: 100,
  customer: {
    id: 'customer-1',
    name: '顧客本人',
    email: 'customer@example.com',
    password: 'password-secret',
    resetToken: 'reset-secret',
  },
  cast: {
    id: 'cast-1',
    name: '公開キャスト名',
    image: '/cast.jpg',
    loginEmail: 'cast@example.com',
    lineUserId: 'line-secret',
    passwordHash: 'cast-password',
    welfareExpenseRate: 10,
  },
  course: {
    id: 'course-1',
    name: '90分コース',
    duration: 90,
    price: 20_000,
    description: '公開説明',
    storeShare: 8_000,
    castShare: 12_000,
    archivedAt: null,
  },
  options: [
    {
      id: 'reservation-option-1',
      reservationId: 'reservation-1',
      optionId: 'option-1',
      optionName: '公開オプション',
      optionPrice: 10_000,
      storeShare: 4_000,
      castShare: 6_000,
      option: {
        id: 'option-1',
        name: '公開オプション',
        price: 10_000,
        storeShare: 4_000,
        castShare: 6_000,
        visibility: 'private',
      },
    },
  ],
}

describe('sanitizeCustomerReservationResponse', () => {
  it('uses an allowlist for reservation and nested pricing records', () => {
    const result = sanitizeCustomerReservationResponse(internalReservation)

    expect(result).toMatchObject({
      id: 'reservation-1',
      customerId: 'customer-1',
      price: 30_000,
      pointsUsed: 100,
      cast: { id: 'cast-1', name: '公開キャスト名', image: '/cast.jpg' },
      course: { id: 'course-1', name: '90分コース', duration: 90, price: 20_000 },
      options: [
        {
          id: 'reservation-option-1',
          optionId: 'option-1',
          optionName: '公開オプション',
          optionPrice: 10_000,
          option: { id: 'option-1', name: '公開オプション', price: 10_000 },
        },
      ],
    })
    expect(JSON.stringify(result)).not.toMatch(
      /storeRevenue|staffRevenue|welfareExpense|entryReceivedBy|entryMemo|marketingChannel|storeMemo|storeShare|castShare|loginEmail|lineUserId|passwordHash|password-secret|reset-secret|archivedAt|visibility/
    )
  })

  it('sanitizes every reservation in list responses', () => {
    const result = sanitizeCustomerReservationResponse([internalReservation, internalReservation])

    expect(result).toHaveLength(2)
    expect(JSON.stringify(result)).not.toContain('staff-secret-id')
    expect(JSON.stringify(result)).not.toContain('cast@example.com')
  })
})

describe('sanitizeCustomerSelfResponse', () => {
  it('uses an allowlist for the customer and every nested cast/reservation', () => {
    const result = sanitizeCustomerSelfResponse({
      id: 'customer-1',
      name: '顧客本人',
      phone: '09012345678',
      email: 'customer@example.com',
      points: 500,
      password: 'password-secret',
      resetToken: 'reset-secret',
      phoneVerificationCode: '654321',
      internalRiskScore: 99,
      ngCasts: [
        {
          castId: 'cast-1',
          assignedAt: new Date('2026-01-01T00:00:00.000Z'),
          notes: 'staff-only note',
          cast: internalReservation.cast,
        },
      ],
      reservations: [internalReservation],
      reviews: [
        {
          id: 'review-1',
          castId: 'cast-1',
          reservationId: 'reservation-1',
          rating: 5,
          comment: 'よかったです',
          moderationMemo: 'internal moderation memo',
          cast: internalReservation.cast,
        },
      ],
    })

    expect(result).toMatchObject({
      id: 'customer-1',
      name: '顧客本人',
      phone: '09012345678',
      email: 'customer@example.com',
      points: 500,
      ngCasts: [{ castId: 'cast-1', cast: { id: 'cast-1', name: '公開キャスト名' } }],
      reservations: [{ id: 'reservation-1', cast: { id: 'cast-1' } }],
      reviews: [{ id: 'review-1', rating: 5, cast: { id: 'cast-1' } }],
    })
    expect(JSON.stringify(result)).not.toMatch(
      /password-secret|reset-secret|654321|internalRiskScore|staff-only note|moderationMemo|loginEmail|lineUserId|welfareExpenseRate|storeRevenue|staffRevenue|storeShare|castShare/
    )
  })
})

describe('sanitizeCustomerAdminDetailResponse', () => {
  it('omits the reservation relation when reservation access was not authorized', () => {
    const result = sanitizeCustomerAdminDetailResponse(
      {
        id: 'customer-1',
        name: '顧客',
        phone: '09012345678',
        reservations: [internalReservation],
      },
      { includeReservationOperations: false }
    )

    expect(result).toMatchObject({ id: 'customer-1', name: '顧客', phone: '09012345678' })
    expect(result).not.toHaveProperty('reservations')
  })
})
