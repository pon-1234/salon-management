import { defaultOptions } from '@/lib/pricing/data'
import { convertOptionPriceToOption } from '@/lib/pricing/adapters'
import { options as cachedOptions } from '@/lib/course-option/data'
import type { Option } from '@/lib/types/course-option'
import { shouldUseMockFallbacks } from '@/lib/config/feature-flags'

// Map option IDs to actual option data
/** @no-test-required reason: Internal mapping used by getOptionById function which is tested */
const optionIdMap: Record<string, string> = {
  'healing-knee': '1', // 癒やしの膝枕耳かき
  'shampoo-spa': '2', // 密着洗髪スパ
  'oil-plus': '3', // オイル増し増し
  'french-kiss': '4', // キス（フレンチ）
  pantyhose: '5', // パンスト
  'kaishun-plus': '6', // 回春増し増し
  'zenritu-massage': '7', // 前立腺マッサージ
  'all-nude': '8', // オールヌード
  'skin-fella': '9', // スキンフェラ
  extension: '10', // 延長30分
}

const fallbackOptions: Option[] = defaultOptions.map(convertOptionPriceToOption)

export function resolveOptionId(id: string): string {
  return optionIdMap[id] ?? id
}

export function getOptionById(id: string): Option | undefined {
  const optionFromCache = cachedOptions.find((option) => option.id === id)
  if (optionFromCache) {
    return optionFromCache
  }

  const mappedId = optionIdMap[id]
  if (mappedId) {
    const mappedOption = cachedOptions.find((option) => option.id === mappedId)
    if (mappedOption) {
      return mappedOption
    }
  }

  const fallbackDirect = fallbackOptions.find((option) => option.id === id)
  if (fallbackDirect && shouldUseMockFallbacks()) {
    return fallbackDirect
  }

  if (mappedId) {
    const mappedFallback = fallbackOptions.find((option) => option.id === mappedId)
    if (mappedFallback && shouldUseMockFallbacks()) {
      return mappedFallback
    }
  }

  return undefined
}

/** @no-test-required reason: Unused internal helper kept for potential future use */
function getAllOptions(): Option[] {
  if (cachedOptions.length > 0) {
    return cachedOptions
  }
  return shouldUseMockFallbacks() ? fallbackOptions : []
}
