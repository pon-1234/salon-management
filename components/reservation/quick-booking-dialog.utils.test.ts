/**
 * @design_doc   docs/SYSTEM_AUDIT_2026-07-26.md D-1 reservation module split
 * @related_to   QuickBookingDialog pure option-selection and catalog helpers
 * @known_issues None currently
 */
import { describe, it, expect } from 'vitest'
import {
  ensureBookingDesignationOptions,
  getCastAvailableOptions,
  getUniqueSelectedOptionIds,
} from './quick-booking.utils'
import type { Cast } from '@/lib/cast/types'
import type { DesignationFee } from '@/lib/designation/types'

const baseCast: Cast = {
  id: 'cast-1',
  name: 'テストキャスト',
  nameKana: 'てすとかすと',
  age: 25,
  height: 160,
  bust: 'B',
  waist: 60,
  hip: 88,
  type: 'カワイイ系',
  image: '/placeholder.jpg',
  images: [],
  description: '',
  netReservation: true,
  specialDesignationFee: null,
  regularDesignationFee: null,
  panelDesignationRank: 0,
  regularDesignationRank: 0,
  workStatus: '出勤',
  appointments: [],
  availableOptions: [],
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-02-01'),
}

const normalizedOptions = [
  { id: 'option-1', name: 'アロマ追加', price: 1000 },
  { id: '1', name: '膝枕耳かき', price: 0 },
  { id: 'option-2', name: '延長30分', price: 5000 },
]

describe('getCastAvailableOptions', () => {
  it('returns an empty list when no cast is selected', () => {
    const result = getCastAvailableOptions(undefined, normalizedOptions)
    expect(result).toEqual([])
  })

  it('returns an empty list when the cast has no available options', () => {
    const result = getCastAvailableOptions({ ...baseCast, availableOptions: [] }, normalizedOptions)
    expect(result).toEqual([])
  })

  it('returns only options explicitly allowed for the cast', () => {
    const result = getCastAvailableOptions(
      { ...baseCast, availableOptions: ['option-1'] },
      normalizedOptions
    )
    expect(result).toEqual([{ id: 'option-1', name: 'アロマ追加', price: 1000 }])
  })

  it('resolves legacy option identifiers using resolveOptionId', () => {
    const result = getCastAvailableOptions(
      { ...baseCast, availableOptions: ['healing-knee'] },
      normalizedOptions
    )
    expect(result).toEqual([{ id: '1', name: '膝枕耳かき', price: 0 }])
  })
})

describe('getUniqueSelectedOptionIds', () => {
  it('preserves the selected option IDs while removing duplicates', () => {
    expect(
      getUniqueSelectedOptionIds([
        'legacy-option-aroma',
        'legacy-option-stone',
        'legacy-option-aroma',
      ])
    ).toEqual(['legacy-option-aroma', 'legacy-option-stone'])
  })
})

describe('ensureBookingDesignationOptions', () => {
  const repeatFee: DesignationFee = {
    id: 'fee-repeat',
    name: 'リピート指名',
    price: 3_000,
    storeShare: 1_000,
    castShare: 2_000,
    sortOrder: 2,
    isActive: true,
    kind: 'repeat',
  }

  it('adds フリー指名 and おすすめパネル指名 when the catalog lacks them', () => {
    const options = ensureBookingDesignationOptions([repeatFee], 5_000)
    expect(options.map((fee) => fee.name)).toEqual([
      'フリー指名',
      'リピート指名',
      'おすすめパネル指名',
    ])
    expect(options.find((fee) => fee.kind === 'panel')?.price).toBe(5_000)
  })

  it('applies the cast special designation fee to an existing panel option', () => {
    const panelFee: DesignationFee = {
      id: 'fee-panel',
      name: 'パネル指名',
      price: 2_000,
      storeShare: 1_200,
      castShare: 800,
      sortOrder: 2,
      isActive: true,
      kind: 'panel',
    }
    const options = ensureBookingDesignationOptions([panelFee], 8_000)
    expect(options).toHaveLength(2)
    expect(options.find((fee) => fee.kind === 'panel')).toEqual(
      expect.objectContaining({ name: 'パネル指名', price: 8_000 })
    )
  })
})
