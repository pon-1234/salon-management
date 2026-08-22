/**
 * @design_doc   docs/LEGACY_GOLD_ADMIN_MIGRATION_INVENTORY.md cast settlement management
 * @related_to   settlementPaidAtParts used when opening the settlement dialog
 * @known_issues None
 */
import { describe, expect, it } from 'vitest'

import { settlementPaidAtIso, settlementPaidAtParts } from './clock'

describe('settlementPaidAtParts', () => {
  it('uses the current Japan time instead of a fixed 10:00 slot', () => {
    expect(settlementPaidAtParts(new Date('2026-08-22T10:41:00+09:00'))).toEqual({
      date: '2026-08-22',
      time: '10:41',
    })
    expect(settlementPaidAtParts(new Date('2026-08-22T01:05:00+09:00'))).toEqual({
      date: '2026-08-22',
      time: '01:05',
    })
  })
})

describe('settlementPaidAtIso', () => {
  it('stores the chosen JST clock as UTC', () => {
    expect(settlementPaidAtIso('2026-08-22', '10:41')).toBe('2026-08-22T01:41:00.000Z')
  })
})
