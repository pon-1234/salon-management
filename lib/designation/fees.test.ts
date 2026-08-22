/**
 * @design_doc   refactor-instructions.md Phase 1 characterization coverage
 * @related_to   fees.ts - designation fee lookup and share normalization
 * @known_issues None currently
 */
import { describe, expect, it } from 'vitest'

import {
  DEFAULT_DESIGNATION_FEES,
  findDesignationFeeByName,
  findDesignationFeeByPrice,
  normalizeDesignationShares,
} from './fees'

describe('normalizeDesignationShares', () => {
  it('preserves shares when store and cast shares fit inside the price', () => {
    expect(normalizeDesignationShares(2000, 1200, 800)).toEqual({
      price: 2000,
      storeShare: 1200,
      castShare: 800,
    })
  })

  it('rounds inputs and clamps negative values before validating the share total', () => {
    expect(normalizeDesignationShares(1999.6, -10.4, 801.5)).toEqual({
      price: 2000,
      storeShare: 0,
      castShare: 802,
    })
  })

  it('reduces cast share when the normalized shares exceed the normalized price', () => {
    expect(normalizeDesignationShares(2000, 1800, 800)).toEqual({
      price: 2000,
      storeShare: 1800,
      castShare: 200,
    })
  })

  it('preserves an oversized store share and clamps cast share to zero', () => {
    expect(normalizeDesignationShares(2000, 2500, 800)).toEqual({
      price: 2000,
      storeShare: 2500,
      castShare: 0,
    })
  })
})

describe('findDesignationFeeByName', () => {
  it('finds exact default fee names and does not trim or partially match', () => {
    expect(findDesignationFeeByName('リピート指名')?.id).toBe('repeat-designation')
    expect(findDesignationFeeByName(' リピート指名')).toBeUndefined()
    expect(findDesignationFeeByName('指名')).toBeUndefined()
  })

  it('returns undefined for empty values', () => {
    expect(findDesignationFeeByName(null)).toBeUndefined()
    expect(findDesignationFeeByName(undefined)).toBeUndefined()
    expect(findDesignationFeeByName('')).toBeUndefined()
  })
})

describe('findDesignationFeeByPrice', () => {
  it('finds the first default fee with the parsed price', () => {
    expect(findDesignationFeeByPrice('¥2,000')?.id).toBe('panel-designation')
    expect(findDesignationFeeByPrice(0)?.id).toBe('free-designation')
  })

  it('uses the supplied fee list and exact numeric comparison', () => {
    expect(
      findDesignationFeeByPrice('2,500円', [
        ...DEFAULT_DESIGNATION_FEES,
        {
          id: 'vip-designation',
          name: 'VIP指名',
          price: 2500,
          storeShare: 1500,
          castShare: 1000,
          sortOrder: 5,
          isActive: true,
        },
      ])?.id
    ).toBe('vip-designation')
  })

  it('returns undefined for nullish values and treats strings without digits as zero', () => {
    expect(findDesignationFeeByPrice(null)).toBeUndefined()
    expect(findDesignationFeeByPrice(undefined)).toBeUndefined()
    expect(findDesignationFeeByPrice('未設定')?.id).toBe('free-designation')
  })
})
