/**
 * @design_doc   ui-improvement-instructions.md U-3 cast list filters
 * @related_to   app/[store]/cast/page.tsx: public cast filtering and pagination
 * @known_issues Newcomer filter is intentionally omitted because public profile data lacks a flag
 */
import { describe, expect, it } from 'vitest'
import type { PublicCastProfile } from '@/lib/store/public-casts'

import {
  filterPublicCasts,
  normalizeCastListFilter,
  paginatePublicCasts,
} from './public-cast-filters'

function cast(overrides: Partial<PublicCastProfile> & { id: string }): PublicCastProfile {
  return {
    id: overrides.id,
    name: overrides.name ?? overrides.id,
    age: null,
    height: null,
    bust: null,
    waist: null,
    hip: null,
    type: null,
    image: null,
    images: [],
    panelDesignationRank: overrides.panelDesignationRank ?? 0,
    regularDesignationRank: 0,
    netReservation: overrides.netReservation ?? false,
    workStatus: overrides.workStatus ?? null,
    sizeLabel: '',
    createdAt: '2026-07-04T00:00:00.000Z',
    availableServices: [],
    introMessage: null,
    personalityTags: [],
  }
}

describe('public cast filters', () => {
  it('normalizes unsupported filters to all', () => {
    expect(normalizeCastListFilter('net-reservation')).toBe('net-reservation')
    expect(normalizeCastListFilter('newcomer')).toBe('all')
    expect(normalizeCastListFilter(undefined)).toBe('all')
  })

  it('filters casts by available public data', () => {
    const casts = [
      cast({ id: 'a', workStatus: '出勤', netReservation: true, panelDesignationRank: 2 }),
      cast({ id: 'b', workStatus: '休日', netReservation: true, panelDesignationRank: 0 }),
      cast({ id: 'c', workStatus: '出勤', netReservation: false, panelDesignationRank: 1 }),
    ]

    expect(filterPublicCasts(casts, 'working-today').map((item) => item.id)).toEqual(['a', 'c'])
    expect(filterPublicCasts(casts, 'net-reservation').map((item) => item.id)).toEqual(['a', 'b'])
    expect(filterPublicCasts(casts, 'top-designated').map((item) => item.id)).toEqual(['c', 'a'])
  })

  it('clamps pagination and hides extra pages when items fit on one page', () => {
    const casts = [cast({ id: 'a' }), cast({ id: 'b' }), cast({ id: 'c' })]

    expect(paginatePublicCasts(casts, 5, 2)).toEqual({
      currentPage: 2,
      items: [casts[2]],
      totalPages: 2,
    })

    expect(paginatePublicCasts(casts, 1, 12).totalPages).toBe(1)
  })
})
