import { OptionPrice } from '@/lib/pricing/types'
import { defaultOptions } from '@/lib/pricing/data'

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

export function getOptionById(id: string): OptionPrice | undefined {
  // First try to find by direct ID
  let option = defaultOptions.find((opt) => opt.id === id)

  // If not found, try to map from old ID format
  if (!option && optionIdMap[id]) {
    option = defaultOptions.find((opt) => opt.id === optionIdMap[id])
  }

  return option
}

/** @no-test-required reason: Unused internal function - not exported or referenced */
function getAllOptions(): OptionPrice[] {
  return defaultOptions
}
