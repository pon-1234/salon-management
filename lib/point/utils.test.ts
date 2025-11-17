/**
 * @design_doc   Point utility unit tests
 * @related_to   lib/point/utils.ts
 * @known_issues None currently
 */
import { describe, it, expect } from 'vitest'
import { calculateEarnedPoints, calculateExpiryDate, resolvePointConfig } from './utils'

describe('point utils', () => {
  describe('calculateEarnedPoints', () => {
    it('should floor earned points based on config rate', () => {
      expect(calculateEarnedPoints(10000, { earnRate: 0.015, expirationMonths: 12, minPointsToUse: 100 })).toBe(150)
      expect(calculateEarnedPoints(9999.99, { earnRate: 0.01, expirationMonths: 12, minPointsToUse: 100 })).toBe(99)
    })

    it('should return 0 for non-positive amounts', () => {
      expect(calculateEarnedPoints(0)).toBe(0)
      expect(calculateEarnedPoints(-5000)).toBe(0)
      expect(calculateEarnedPoints(Number.NaN)).toBe(0)
    })
  })

  describe('calculateExpiryDate', () => {
    it('should add configured months to provided date', () => {
      const base = new Date('2024-01-15T00:00:00Z')
      const expiry = calculateExpiryDate({ earnRate: 0.01, expirationMonths: 6, minPointsToUse: 100 }, base)
      expect(expiry.getUTCFullYear()).toBe(2024)
      expect(expiry.getUTCMonth()).toBe(6) // July (0-indexed)
    })

    it('should default to current date if not provided', () => {
      const now = Date.now()
      const expiry = calculateExpiryDate()
      expect(expiry.getTime()).toBeGreaterThanOrEqual(now)
    })
  })

  describe('resolvePointConfig', () => {
    it('falls back to defaults when settings missing', () => {
      expect(resolvePointConfig()).toEqual({
        earnRate: 0.01,
        expirationMonths: 12,
        minPointsToUse: 100,
      })
    })

    it('normalizes store settings into point config', () => {
      const config = resolvePointConfig({
        pointEarnRate: 2.5,
        pointExpirationMonths: 6,
        pointMinUsage: 200,
      })
      expect(config.earnRate).toBeCloseTo(0.025)
      expect(config.expirationMonths).toBe(6)
      expect(config.minPointsToUse).toBe(200)
    })
  })
})
