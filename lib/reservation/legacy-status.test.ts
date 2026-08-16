/**
 * @design_doc   Official gold-esthe Order_lev mapping from gambit-front
 * @related_to   gold-esthe.com_inc_master/jukunen_service_utf8.inc Order_lev
 * @known_issues Deleted orders are not stored as a lev value
 */
import { describe, expect, it } from 'vitest'

import {
  LEGACY_ORDER_LEV_LABELS,
  mapLegacyOrderLevToStatus,
  resolveMarketingCategory,
} from './legacy-status'

describe('legacy reservation status', () => {
  it('maps the official Order_lev values used by gold-esthe', () => {
    expect(LEGACY_ORDER_LEV_LABELS).toEqual({
      [-2]: '仮予約',
      [-1]: 'ネット予約',
      [0]: '事前予約',
      [1]: '当日予約',
      [2]: '確定済',
      [3]: '終了',
    })
    expect(mapLegacyOrderLevToStatus(-2)).toBe('pending')
    expect(mapLegacyOrderLevToStatus(-1)).toBe('pending')
    expect(mapLegacyOrderLevToStatus(0)).toBe('pending')
    expect(mapLegacyOrderLevToStatus(1)).toBe('confirmed')
    expect(mapLegacyOrderLevToStatus(2)).toBe('confirmed')
    expect(mapLegacyOrderLevToStatus(3)).toBe('completed')
  })

  it('classifies Heaven and 姫 channels as princess reservations', () => {
    expect(resolveMarketingCategory('旧システム media:4')).toBe('unclassified')
    expect(resolveMarketingCategory('Heaven')).toBe('princess')
    expect(resolveMarketingCategory('姫予約')).toBe('princess')
    expect(resolveMarketingCategory('ヘブン')).toBe('princess')
  })
})
