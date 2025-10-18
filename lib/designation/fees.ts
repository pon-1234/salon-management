export interface DesignationFeeConfig {
  id: string
  name: string
  price: number
  storeShare: number
  castShare: number
  description?: string
  sortOrder: number
  isActive: boolean
}

export const DEFAULT_DESIGNATION_FEES: DesignationFeeConfig[] = [
  {
    id: 'free-designation',
    name: 'フリー指名',
    price: 0,
    storeShare: 0,
    castShare: 0,
    description: '通常の受付からの指名。無料です。',
    sortOrder: 1,
    isActive: true,
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
  },
  {
    id: 'repeat-designation',
    name: '本指名',
    price: 2000,
    storeShare: 1200,
    castShare: 800,
    description: '過去に担当したキャストを再指名。',
    sortOrder: 3,
    isActive: true,
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
  },
]

export function normalizeDesignationShares(
  price: number,
  storeShare: number,
  castShare: number
) {
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

export function findDesignationFeeByName(name: string | null | undefined) {
  if (!name) return undefined
  return DEFAULT_DESIGNATION_FEES.find((fee) => fee.name === name)
}

export function findDesignationFeeByPrice(price: number | string | null | undefined) {
  if (price === null || price === undefined) return undefined
  const numeric =
    typeof price === 'number'
      ? price
      : Number(String(price).replace(/[^0-9.-]+/g, ''))

  if (!Number.isFinite(numeric)) return undefined
  return DEFAULT_DESIGNATION_FEES.find((fee) => fee.price === numeric)
}
