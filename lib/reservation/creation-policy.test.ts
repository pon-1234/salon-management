/**
 * @design_doc   Reservation creation authorization policy
 * @related_to   app/api/reservation/route.ts customer and admin reservation creation
 * @known_issues None currently
 */
import { describe, expect, it } from 'vitest'
import { sanitizeReservationCreationInput } from './creation-policy'

describe('sanitizeReservationCreationInput', () => {
  const maliciousCustomerInput = {
    castId: 'cast-1',
    courseId: 'course-1',
    startTime: '2099-07-04T09:00:00.000Z',
    endTime: '2099-07-04T10:00:00.000Z',
    options: ['option-1'],
    pointsUsed: 100,
    paymentMethod: 'cash',
    designationType: 'regular',
    areaId: 'area-1',
    stationId: 'station-1',
    hotelId: 'hotel-1',
    hotelName: 'Hotel',
    hotelExpense: 12_000,
    roomNumber: '101',
    locationMemo: 'front desk',
    notes: 'customer note',
    status: 'completed',
    price: 1,
    designationFee: -5000,
    transportationFee: -5000,
    additionalFee: -5000,
    discountAmount: 999999,
    welfareExpense: -5000,
    storeRevenue: -5000,
    staffRevenue: 999999,
    marketingChannel: 'forged-channel',
    unknownField: 'must-not-pass-through',
  }

  it('allowlists customer fields and forces server-owned status and channel values', () => {
    expect(sanitizeReservationCreationInput(maliciousCustomerInput, false)).toEqual({
      castId: 'cast-1',
      courseId: 'course-1',
      startTime: '2099-07-04T09:00:00.000Z',
      endTime: '2099-07-04T10:00:00.000Z',
      options: ['option-1'],
      pointsUsed: 100,
      paymentMethod: 'cash',
      designationType: 'regular',
      areaId: 'area-1',
      stationId: 'station-1',
      hotelId: 'hotel-1',
      hotelName: 'Hotel',
      roomNumber: '101',
      locationMemo: 'front desk',
      notes: 'customer note',
      status: 'pending',
      marketingChannel: 'WEB',
    })
  })

  it('preserves admin input for the manual booking workflow', () => {
    expect(sanitizeReservationCreationInput(maliciousCustomerInput, true)).toEqual(
      maliciousCustomerInput
    )
  })

  it('normalizes an unsupported customer designation instead of persisting arbitrary analytics data', () => {
    expect(
      sanitizeReservationCreationInput(
        {
          castId: 'cast-1',
          designationType: 'forged-designation',
        },
        false
      )
    ).toEqual({
      castId: 'cast-1',
      designationType: 'none',
      status: 'pending',
      marketingChannel: 'WEB',
    })
  })
})
