/**
 * @design_doc   Official gold-esthe Order_lev mapping from gambit-front
 * @related_to   gold-esthe.com_inc_master/jukunen_service_utf8.inc Order_lev
 * @known_issues Deleted orders are not stored as a lev value
 */
import type { ReservationStatus } from '@/lib/constants'

export const LEGACY_ORDER_LEV_LABELS = {
  [-2]: '仮予約',
  [-1]: 'ネット予約',
  [0]: '事前予約',
  [1]: '当日予約',
  [2]: '確定済',
  [3]: '終了',
} as const

export function mapLegacyOrderLevToStatus(lev: number): ReservationStatus {
  if (lev === 3) return 'completed'
  if (lev === 1 || lev === 2) return 'confirmed'
  if (lev >= -2 && lev <= 0) return 'pending'
  throw new Error(`Unsupported legacy order lev: ${lev}`)
}

export function resolveMarketingCategory(
  value: string | null
): 'princess' | 'other' | 'unclassified' {
  const normalized = value?.trim() ?? ''
  if (!normalized) return 'unclassified'
  if (/姫|hime|heaven|ヘブン/i.test(normalized)) return 'princess'
  if (/media\s*:\s*\d+/i.test(normalized)) return 'unclassified'
  return 'other'
}
