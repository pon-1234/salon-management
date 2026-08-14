/**
 * @design_doc   docs/SYSTEM_AUDIT_2026-07-26.md D-1 reservation module split
 * @related_to   QuickBookingDialog pure option-selection and catalog helpers
 * @known_issues None currently
 */
import { describe, it, expect } from 'vitest'
import { getCastAvailableOptions, getUniqueSelectedOptionIds } from './quick-booking.utils'
import type { Cast } from '@/lib/cast/types'

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
