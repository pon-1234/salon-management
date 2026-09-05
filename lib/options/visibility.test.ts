/**
 * @design_doc   Notion task #281 legacy reservation option cleanup
 * @related_to   Option API, ReservationDialog, and QuickBookingDialog
 * @known_issues None
 */
import { describe, expect, it } from 'vitest'
import { isVisibleReservationOption, reservationOptionNote } from './visibility'

describe('isVisibleReservationOption', () => {
  it('hides obsolete legacy free-option placeholders everywhere', () => {
    expect(isVisibleReservationOption({ name: '旧システム無料系オプション #1' })).toBe(false)
    expect(isVisibleReservationOption({ name: ' アロマ ' })).toBe(true)
  })
})

it('hides migration provenance descriptions without hiding real selectable options', () => {
  expect(reservationOptionNote('旧システム無料系オプション #1')).toBe('')
  expect(reservationOptionNote('旧システム有料オプション #7')).toBe('')
  expect(reservationOptionNote('事前に確認してください')).toBe('事前に確認してください')
  expect(isVisibleReservationOption({ name: '癒しの膝枕耳かき' })).toBe(true)
})
