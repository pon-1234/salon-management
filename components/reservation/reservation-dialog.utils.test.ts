/**
 * @design_doc   refactor-instructions.md Phase 5 reservation dialog extraction
 * @related_to   reservation-dialog.tsx: shared pure formatting and normalization helpers
 * @known_issues Baseline reservation dialog component still contains large UI/state sections
 */
import { describe, expect, it } from 'vitest'
import { PAYMENT_METHODS } from '@/lib/constants'

import {
  calculateReservationPriceBreakdown,
  formatCurrency,
  formatMinutes,
  normalizeMarketingChannelValue,
  normalizePaymentMethodValue,
  toNullableNumber,
  toNumber,
} from './reservation-dialog.utils'

describe('reservation-dialog utils', () => {
  describe('calculateReservationPriceBreakdown', () => {
    it('combines course, options, designation, fees, discounts, and points through the canonical revenue calculator', () => {
      expect(
        calculateReservationPriceBreakdown({
          selectedCoursePrice: 10_000,
          fallbackCoursePrice: 9_000,
          options: [{ price: 2_000, storeShare: 500, castShare: 1_500 }],
          transportationFee: 500,
          additionalFee: 300,
          discountAmount: 100,
          pointsUsed: 400,
          designationFee: 1_000,
          designation: { storeShare: 0, castShare: 1_000 },
          welfareRate: 10,
        })
      ).toEqual({
        basePrice: 10_000,
        optionTotal: 2_000,
        transportation: 500,
        additional: 300,
        designation: 1_000,
        discount: 100,
        pointsUsed: 400,
        total: 13_300,
        storeRevenue: 1_800,
        staffRevenue: 11_500,
        welfareExpense: 1_000,
        welfareRate: 10,
      })
    })
  })

  describe('toNumber', () => {
    it('parses numbers and currency-like strings without changing current invalid-string behavior', () => {
      expect(toNumber(1200)).toBe(1200)
      expect(toNumber('¥12,300')).toBe(12300)
      expect(toNumber('invalid', 99)).toBe(0)
    })
  })

  describe('toNullableNumber', () => {
    it('returns null for invalid input', () => {
      expect(toNullableNumber('2,500')).toBe(2500)
      expect(toNullableNumber('abc')).toBe(0)
    })
  })

  describe('formatMinutes', () => {
    it('formats zero, minute-only, hour-only, and hour-minute values', () => {
      expect(formatMinutes(0)).toBe('0分')
      expect(formatMinutes(45)).toBe('45分')
      expect(formatMinutes(60)).toBe('1時間')
      expect(formatMinutes(95)).toBe('1時間35分')
    })
  })

  describe('formatCurrency', () => {
    it('formats yen amounts with the current fallback', () => {
      expect(formatCurrency(123456)).toBe('¥123,456')
      expect(formatCurrency(undefined)).toBe('¥0')
    })
  })

  describe('normalizePaymentMethodValue', () => {
    it('normalizes Japanese and English payment labels', () => {
      expect(normalizePaymentMethodValue('カード')).toBe(PAYMENT_METHODS.CARD)
      expect(normalizePaymentMethodValue('credit card')).toBe(PAYMENT_METHODS.CARD)
      expect(normalizePaymentMethodValue('現金')).toBe(PAYMENT_METHODS.CASH)
      expect(normalizePaymentMethodValue(null)).toBe(PAYMENT_METHODS.CASH)
    })
  })

  describe('normalizeMarketingChannelValue', () => {
    it('uses the first available channel for empty input and preserves custom labels', () => {
      expect(normalizeMarketingChannelValue('', ['公式', '口コミ'])).toBe('公式')
      expect(normalizeMarketingChannelValue('口コミ', ['公式', '口コミ'])).toBe('口コミ')
      expect(normalizeMarketingChannelValue('kuchikomi', ['公式'])).toBe('kuchikomi')
    })

    it('matches available channels case-insensitively', () => {
      expect(normalizeMarketingChannelValue('web', ['WEB', '公式'])).toBe('WEB')
    })
  })
})
