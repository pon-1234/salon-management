/**
 * @design_doc   PAY-01 クレジット手数料を 0% / 10% で切り替える
 * @related_to   calculateCreditCardFee, normalizeCreditCardFeeRate
 * @known_issues None
 */
import { describe, expect, it } from 'vitest'

import { PAYMENT_METHODS } from '@/lib/constants'

import {
  applyCreditCardFee,
  applyStoreCreditCardFee,
  calculateCreditCardFee,
  normalizeCreditCardFeeRate,
} from './credit-card-fee'

describe('normalizeCreditCardFeeRate', () => {
  it('defaults unknown values to 10 percent', () => {
    expect(normalizeCreditCardFeeRate(undefined)).toBe(10)
    expect(normalizeCreditCardFeeRate(7)).toBe(10)
    expect(normalizeCreditCardFeeRate(0)).toBe(0)
    expect(normalizeCreditCardFeeRate(10)).toBe(10)
  })
})

describe('calculateCreditCardFee', () => {
  it('adds 10 percent only when paying by credit card', () => {
    expect(calculateCreditCardFee(20_000, 10, PAYMENT_METHODS.CARD)).toBe(2_000)
    expect(calculateCreditCardFee(20_000, 10, PAYMENT_METHODS.CASH)).toBe(0)
  })

  it('adds nothing while the store rate is 0 percent', () => {
    expect(calculateCreditCardFee(20_000, 0, PAYMENT_METHODS.CARD)).toBe(0)
  })

  it('adds the surcharge to the reservation total and store share', () => {
    expect(
      applyCreditCardFee({ total: 20_000, storeRevenue: 8_000 }, 10, PAYMENT_METHODS.CARD)
    ).toEqual({
      total: 22_000,
      storeRevenue: 10_000,
      creditCardFee: 2_000,
    })
  })

  it('caps store revenue at the card-fee total using the store rate', () => {
    expect(
      applyStoreCreditCardFee(
        { total: 20_000, storeRevenue: 8_000, staffRevenue: 12_000 },
        10,
        PAYMENT_METHODS.CARD
      )
    ).toEqual({
      total: 22_000,
      storeRevenue: 10_000,
      staffRevenue: 12_000,
      creditCardFee: 2_000,
    })
  })
})
