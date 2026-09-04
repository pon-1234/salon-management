/**
 * @design_doc   Notion task #281 legacy reservation option cleanup
 * @related_to   Option API, ReservationDialog, and QuickBookingDialog
 * @known_issues None
 */
import { describe, expect, it } from 'vitest'
import { isVisibleReservationOption } from './visibility'

describe('isVisibleReservationOption', () => {
  it('hides obsolete legacy free-option placeholders everywhere', () => {
    expect(isVisibleReservationOption({ name: '旧システム無料系オプション #1' })).toBe(false)
    expect(isVisibleReservationOption({ name: ' アロマ ' })).toBe(true)
  })
})
