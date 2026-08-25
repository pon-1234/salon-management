/**
 * @design_doc   Reservation intake defaults shared across admin booking screens
 * @related_to   constants.ts, QuickBookingDialog, store settings
 * @known_issues Store-specific configured channels are merged with these required defaults
 */
import { describe, it, expect } from 'vitest'
import * as constants from './constants'

describe('Constants', () => {
  it('should match the snapshot for all exported constants', () => {
    expect(constants).toMatchSnapshot()
  })

  it('includes every intake channel required by the new booking screen', () => {
    expect(constants.MARKETING_CHANNELS).toEqual(
      expect.arrayContaining([
        '電話',
        'WEB',
        'ショートメール',
        'LINE',
        'Heaven',
        'SNS',
        'サイト関連',
      ])
    )
  })
})
