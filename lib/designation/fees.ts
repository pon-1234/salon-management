/**
 * @design_doc   docs/LEGACY_GOLD_ADMIN_MIGRATION_INVENTORY.md designation catalog
 * @related_to   DesignationFee settings, reservation designation select, share normalization
 * @known_issues Existing reservations may still store 本指名 / フリー指名 names
 */
import { DesignationFee } from './types'

export const DEFAULT_DESIGNATION_FEES: DesignationFee[] = [
  {
    id: 'free-designation',
    name: 'フリー',
    price: 0,
    storeShare: 0,
    castShare: 0,
    description: '通常の受付からの指名。無料です。',
    sortOrder: 1,
    isActive: true,
    kind: 'free',
  },
  {
    id: 'panel-designation',
    name: 'パネル指名',
    price: 2000,
    storeShare: 1200,
    castShare: 800,
    description: 'パネルを見ての指名。',
    sortOrder: 2,
    isActive: true,
    kind: 'panel',
  },
  {
    id: 'repeat-designation',
    name: 'リピート指名',
    price: 2000,
    storeShare: 1200,
    castShare: 800,
    description: '過去に担当したキャストを再指名。',
    sortOrder: 3,
    isActive: true,
    kind: 'repeat',
  },
  {
    id: 'recommend-designation',
    name: 'おすすめ指名',
    price: 2000,
    storeShare: 1200,
    castShare: 800,
    description: 'スタッフ推奨キャストの指名。',
    sortOrder: 4,
    isActive: true,
    kind: 'other',
  },
]

export function normalizeDesignationShares(price: number, storeShare: number, castShare: number) {
  const normalizedPrice = Math.max(0, Math.round(price))
  const normalizedStore = Math.max(0, Math.round(storeShare))
  const normalizedCast = Math.max(0, Math.round(castShare))

  if (normalizedStore + normalizedCast <= normalizedPrice) {
    return {
      price: normalizedPrice,
      storeShare: normalizedStore,
      castShare: normalizedCast,
    }
  }

  const adjustedCast = Math.max(0, normalizedPrice - normalizedStore)

  return {
    price: normalizedPrice,
    storeShare: normalizedStore,
    castShare: adjustedCast,
  }
}

export function findDesignationFeeByName(
  name: string | null | undefined,
  fees: DesignationFee[] = DEFAULT_DESIGNATION_FEES
) {
  if (!name) return undefined
  return fees.find((fee) => fee.name === name)
}

export function findDesignationFeeByPrice(
  price: number | string | null | undefined,
  fees: DesignationFee[] = DEFAULT_DESIGNATION_FEES
) {
  if (price === null || price === undefined) return undefined
  const numeric =
    typeof price === 'number' ? price : Number(String(price).replace(/[^0-9.-]+/g, ''))

  if (!Number.isFinite(numeric)) return undefined
  return fees.find((fee) => fee.price === numeric)
}
