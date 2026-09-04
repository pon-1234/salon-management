/**
 * @design_doc   docs/LEGACY_GOLD_ADMIN_MIGRATION_INVENTORY.md designation catalog
 * @related_to   DesignationFee.kind, reservation auto-select, cast performance classification
 * @known_issues Existing reservations may still store 本指名 / フリー指名 names
 */
import { describe, expect, it } from 'vitest'

import type { DesignationFee } from './types'
import {
  DESIGNATION_FEE_KINDS,
  classifyDesignationType,
  inferDesignationKindFromName,
  pickAutoDesignationFee,
  payloadHasCompletedVisit,
} from './kind'

function fee(
  overrides: Partial<DesignationFee> & Pick<DesignationFee, 'id' | 'name'>
): DesignationFee {
  return {
    price: 0,
    storeShare: 0,
    castShare: 0,
    sortOrder: 1,
    isActive: true,
    ...overrides,
  }
}

describe('inferDesignationKindFromName', () => {
  it('maps legacy and current catalog names to kinds', () => {
    expect(inferDesignationKindFromName('フリー')).toBe('free')
    expect(inferDesignationKindFromName('フリー指名')).toBe('free')
    expect(inferDesignationKindFromName('リピート指名')).toBe('repeat')
    expect(inferDesignationKindFromName('本指名')).toBe('repeat')
    expect(inferDesignationKindFromName('パネル指名')).toBe('panel')
    expect(inferDesignationKindFromName('おすすめ指名')).toBe('other')
    expect(inferDesignationKindFromName('VIP指名')).toBe('other')
  })
})

describe('pickAutoDesignationFee', () => {
  const catalog = [
    fee({ id: 'fee-free', name: 'フリー', kind: 'free', sortOrder: 1 }),
    fee({ id: 'fee-repeat', name: 'リピート指名', kind: 'repeat', price: 2000, sortOrder: 2 }),
    fee({ id: 'fee-panel', name: 'パネル指名', kind: 'panel', price: 2000, sortOrder: 3 }),
  ]

  it('selects the active repeat fee when the customer already completed with that cast', () => {
    expect(pickAutoDesignationFee(catalog, true)?.id).toBe('fee-repeat')
  })

  it('selects the active panel fee for a first visit with that cast', () => {
    expect(pickAutoDesignationFee(catalog, false)?.id).toBe('fee-panel')
  })

  it('ignores inactive fees and falls back to the lowest sortOrder of the target kind', () => {
    const withInactive = [
      fee({ id: 'old-repeat', name: '本指名', kind: 'repeat', isActive: false, sortOrder: 0 }),
      ...catalog,
    ]
    expect(pickAutoDesignationFee(withInactive, true)?.id).toBe('fee-repeat')
  })

  it('infers kind from the name when kind is missing', () => {
    const unnamed = [
      fee({ id: 'legacy-free', name: 'フリー指名' }),
      fee({ id: 'legacy-repeat', name: '本指名', price: 2000, sortOrder: 2 }),
    ]
    expect(pickAutoDesignationFee(unnamed, false)?.id).toBeUndefined()
    expect(pickAutoDesignationFee(unnamed, true)?.id).toBe('legacy-repeat')
  })
})

describe('classifyDesignationType', () => {
  it('classifies by kind first, then by stored name aliases', () => {
    expect(classifyDesignationType('リピート指名')).toBe('regular')
    expect(classifyDesignationType('本指名')).toBe('regular')
    expect(classifyDesignationType('anything', 'repeat')).toBe('regular')
    expect(classifyDesignationType('フリー')).toBe('free')
    expect(classifyDesignationType('フリー指名')).toBe('free')
    expect(classifyDesignationType('パネル指名')).toBe('free')
    expect(classifyDesignationType('none')).toBe('none')
    expect(classifyDesignationType('指名なし')).toBe('none')
    expect(classifyDesignationType('旧区分:7')).toBe('unclassified')
  })

  it('exposes the supported kind list for settings and API validation', () => {
    expect(DESIGNATION_FEE_KINDS).toEqual(['free', 'repeat', 'panel', 'recommend', 'other'])
  })
})

describe('payloadHasCompletedVisit', () => {
  it('treats a non-empty reservation list as a completed visit', () => {
    expect(payloadHasCompletedVisit([{ id: 'reservation-1' }])).toBe(true)
    expect(payloadHasCompletedVisit([])).toBe(false)
    expect(payloadHasCompletedVisit({ data: [] })).toBe(false)
  })
})
