/**
 * @design_doc   refactor-instructions.md Phase 4 pricing normalization coverage
 * @related_to   adapters.ts, public-pricing.ts - shared pricing serialization
 * @known_issues None currently
 */
import { describe, expect, it } from 'vitest'

import { ensureCourseSerializable, ensureOptionSerializable } from './adapters'

describe('pricing serialization adapters', () => {
  it('normalizes course records to the public pricing shape used today', () => {
    const createdAt = '2026-07-04T01:00:00.000Z'
    const updatedAt = new Date('2026-07-04T02:00:00.000Z')

    expect(
      ensureCourseSerializable({
        id: 'course-1',
        name: '90分コース',
        description: undefined,
        duration: 90,
        price: 20000,
        storeShare: undefined,
        castShare: 15000,
        isActive: true,
        enableWebBooking: undefined,
        archivedAt: undefined,
        createdAt,
        updatedAt,
      })
    ).toEqual({
      id: 'course-1',
      name: '90分コース',
      description: null,
      duration: 90,
      price: 20000,
      storeShare: null,
      castShare: 15000,
      isActive: true,
      enableWebBooking: true,
      archivedAt: null,
      createdAt: new Date(createdAt),
      updatedAt,
    })
  })

  it('normalizes option records and preserves note only when present', () => {
    const createdAt = '2026-07-04T01:00:00.000Z'
    const updatedAt = '2026-07-04T02:00:00.000Z'

    expect(
      ensureOptionSerializable({
        id: 'option-1',
        name: 'オプション',
        description: undefined,
        price: 3000,
        duration: undefined,
        category: undefined,
        displayOrder: undefined,
        isActive: true,
        visibility: undefined,
        isPopular: undefined,
        storeShare: undefined,
        castShare: 1000,
        archivedAt: undefined,
        createdAt,
        updatedAt,
        note: '補足',
      })
    ).toEqual({
      id: 'option-1',
      name: 'オプション',
      description: null,
      price: 3000,
      duration: null,
      category: 'special',
      displayOrder: 0,
      isActive: true,
      visibility: 'public',
      isPopular: false,
      storeShare: null,
      castShare: 1000,
      archivedAt: null,
      createdAt: new Date(createdAt),
      updatedAt: new Date(updatedAt),
      note: '補足',
    })

    expect(
      ensureOptionSerializable({
        id: 'option-2',
        name: 'ノートなし',
        price: 1000,
        isActive: true,
      })
    ).not.toHaveProperty('note')
  })
})
