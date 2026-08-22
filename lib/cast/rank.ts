/**
 * @design_doc   Store-scoped designation rank from completed reservations
 * @related_to   Timeline rank badges, cast performance designation categories
 * @known_issues Legacy media-to-princess mapping remains unclassified
 */
import { isPanelDesignation, isRegularDesignation } from '@/lib/designation/kind'

export type CastRankSource = {
  castId: string | null
  castName?: string | null
  designationType?: string | null
}

export type CastRank = {
  regularDesignationRank: number
  panelDesignationRank: number
}

function rankByCount(
  counts: Array<{ castId: string; name: string; count: number }>
): Map<string, number> {
  const ranked = [...counts]
    .filter((entry) => entry.count > 0)
    .sort((left, right) => right.count - left.count || left.name.localeCompare(right.name, 'ja'))

  return new Map(ranked.map((entry, index) => [entry.castId, index + 1]))
}

export function computeStoreCastRanks(reservations: CastRankSource[]): Map<string, CastRank> {
  const totals = new Map<string, { name: string; regular: number; panel: number }>()

  for (const reservation of reservations) {
    if (!reservation.castId) continue
    const current = totals.get(reservation.castId) ?? {
      name: reservation.castName ?? reservation.castId,
      regular: 0,
      panel: 0,
    }
    if (isRegularDesignation(reservation.designationType)) current.regular += 1
    if (isPanelDesignation(reservation.designationType)) current.panel += 1
    totals.set(reservation.castId, current)
  }

  const regularRanks = rankByCount(
    [...totals.entries()].map(([castId, value]) => ({
      castId,
      name: value.name,
      count: value.regular,
    }))
  )
  const panelRanks = rankByCount(
    [...totals.entries()].map(([castId, value]) => ({
      castId,
      name: value.name,
      count: value.panel,
    }))
  )

  return new Map(
    [...totals.keys()].map((castId) => [
      castId,
      {
        regularDesignationRank: regularRanks.get(castId) ?? 0,
        panelDesignationRank: panelRanks.get(castId) ?? 0,
      },
    ])
  )
}
