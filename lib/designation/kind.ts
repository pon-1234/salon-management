/**
 * @design_doc   docs/LEGACY_GOLD_ADMIN_MIGRATION_INVENTORY.md designation catalog
 * @related_to   DesignationFee, reservation auto-select, cast performance and rank
 * @known_issues Existing reservations may still store 本指名 / フリー指名 names
 */
import type { DesignationFee } from './types'

export const DESIGNATION_FEE_KINDS = ['free', 'repeat', 'panel', 'recommend', 'other'] as const

export type DesignationFeeKind = (typeof DESIGNATION_FEE_KINDS)[number]

export type DesignationCategory = 'regular' | 'free' | 'none' | 'unclassified'

const REPEAT_NAMES = new Set(['regular', '本指名', 'リピート指名', 'repeat-designation'])
const FREE_NAMES = new Set([
  'panel',
  'special',
  'free',
  'フリー',
  'フリー指名',
  'パネル指名',
  '特別指名',
  'おすすめ指名',
  'panel-designation',
  'special-designation',
  'recommend-designation',
  'free-designation',
])
const NONE_NAMES = new Set(['none', '指名なし'])

export function isDesignationFeeKind(value: unknown): value is DesignationFeeKind {
  return typeof value === 'string' && (DESIGNATION_FEE_KINDS as readonly string[]).includes(value)
}

export function inferDesignationKindFromName(name: string | null | undefined): DesignationFeeKind {
  const normalized = name?.trim() ?? ''
  if (REPEAT_NAMES.has(normalized)) return 'repeat'
  if (normalized === 'フリー' || normalized === 'フリー指名' || normalized === 'free-designation') {
    return 'free'
  }
  if (normalized === 'パネル指名' || normalized === 'panel' || normalized === 'panel-designation') {
    return 'panel'
  }
  if (normalized === 'おすすめP指名') {
    return 'recommend'
  }
  return 'other'
}

export function resolveDesignationKind(
  fee: Pick<DesignationFee, 'name' | 'kind'> | { name: string; kind?: DesignationFeeKind | null }
): DesignationFeeKind {
  if (isDesignationFeeKind(fee.kind)) return fee.kind
  return inferDesignationKindFromName(fee.name)
}

export function pickAutoDesignationFee(
  fees: DesignationFee[],
  hadCompletedVisitWithCast: boolean
): DesignationFee | undefined {
  const targetKind: DesignationFeeKind = hadCompletedVisitWithCast ? 'repeat' : 'panel'
  return fees
    .filter((fee) => fee.isActive && resolveDesignationKind(fee) === targetKind)
    .sort(
      (left, right) => left.sortOrder - right.sortOrder || left.name.localeCompare(right.name)
    )[0]
}

export function classifyDesignationType(
  value: string | null | undefined,
  kind?: DesignationFeeKind | null
): DesignationCategory {
  if (kind === 'repeat') return 'regular'
  if (kind === 'free' || kind === 'panel' || kind === 'recommend' || kind === 'other') return 'free'

  const normalized = value?.trim()
  if (!normalized) return 'none'
  const lower = normalized.toLowerCase()
  if (NONE_NAMES.has(normalized) || NONE_NAMES.has(lower)) return 'none'
  if (REPEAT_NAMES.has(normalized) || REPEAT_NAMES.has(lower)) return 'regular'
  if (FREE_NAMES.has(normalized) || FREE_NAMES.has(lower)) return 'free'
  return 'unclassified'
}

export function isRegularDesignation(
  value: string | null | undefined,
  kind?: DesignationFeeKind | null
): boolean {
  return classifyDesignationType(value, kind) === 'regular'
}

export function isPanelDesignation(
  value: string | null | undefined,
  kind?: DesignationFeeKind | null
): boolean {
  if (kind === 'panel') return true
  const category = classifyDesignationType(value, kind)
  return category === 'free'
}

export function payloadHasCompletedVisit(payload: unknown): boolean {
  return Array.isArray(payload) && payload.length > 0
}
