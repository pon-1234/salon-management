/**
 * @design_doc   refactor-instructions.md Phase 1 characterization coverage
 * @related_to   revenue.ts - reservation revenue and staff/store share calculation
 * @known_issues None currently
 */
import { describe, expect, it } from 'vitest'

import { calculateReservationRevenue } from './revenue'

describe('calculateReservationRevenue', () => {
  it('uses the migrated course shares without replacing them with the welfare rate', () => {
    expect(
      calculateReservationRevenue({
        basePrice: 30_000,
        course: { storeShare: 12_000, castShare: 18_000 },
        welfareRate: 10,
      })
    ).toMatchObject({
      courseStoreShare: 12_000,
      courseCastShare: 18_000,
      storeRevenue: 12_000,
      staffRevenue: 18_000,
    })
  })

  it('preserves the current course, option, designation, and fee breakdown', () => {
    expect(
      calculateReservationRevenue({
        basePrice: 30000,
        welfareRate: 10,
        options: [{ price: 5000, storeShare: 3000, castShare: 2000 }, { price: 1000 }],
        designation: { amount: 2000, storeShare: 1200, castShare: 800 },
        transportationFee: 1500,
        additionalFee: 500,
        discountAmount: 1000,
      })
    ).toEqual({
      total: 39000,
      welfareExpense: 3000,
      welfareRate: 10,
      courseStoreShare: 3000,
      courseCastShare: 27000,
      optionsTotal: 6000,
      optionStoreShare: 3600,
      optionCastShare: 2400,
      designationAmount: 2000,
      designationStoreShare: 1200,
      designationCastShare: 800,
      transportationFee: 1500,
      additionalFee: 500,
      discountAmount: 1000,
      storeRevenue: 8800,
      staffRevenue: 30200,
    })
  })

  it('clamps invalid and negative values without producing negative totals', () => {
    expect(
      calculateReservationRevenue({
        basePrice: -1200,
        welfareRate: 150,
        options: [
          { price: -500, storeShare: 300, castShare: 300 },
          { price: 1000, storeShare: 1200, castShare: 900 },
        ],
        designation: { amount: -2000, storeShare: 100, castShare: 100 },
        transportationFee: 'invalid' as unknown as number,
        additionalFee: -500,
        discountAmount: 5000,
      })
    ).toEqual({
      total: 0,
      welfareExpense: 0,
      welfareRate: 100,
      courseStoreShare: 0,
      courseCastShare: 0,
      optionsTotal: 1000,
      optionStoreShare: 1000,
      optionCastShare: 0,
      designationAmount: 0,
      designationStoreShare: 0,
      designationCastShare: 0,
      transportationFee: 0,
      additionalFee: 0,
      discountAmount: 5000,
      storeRevenue: 0,
      staffRevenue: 0,
    })
  })

  it('uses the default welfare rate and complementary shares when inputs are omitted', () => {
    expect(calculateReservationRevenue({ basePrice: 12345 })).toEqual({
      total: 12345,
      welfareExpense: 1235,
      welfareRate: 10,
      courseStoreShare: 1235,
      courseCastShare: 11110,
      optionsTotal: 0,
      optionStoreShare: 0,
      optionCastShare: 0,
      designationAmount: 0,
      designationStoreShare: 0,
      designationCastShare: 0,
      transportationFee: 0,
      additionalFee: 0,
      discountAmount: 0,
      storeRevenue: 1235,
      staffRevenue: 11110,
    })
  })
})
