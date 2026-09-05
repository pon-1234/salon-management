/**
 * @design_doc   Notion task #281 acquisition method/channel settings
 * @related_to   StoreSettings.marketingMethods classifies the compatible marketingChannels catalog
 * @known_issues Legacy records without explicit methods use the default method vocabulary
 */

export const DEFAULT_MARKETING_METHODS = [
  '店リピート',
  '電話',
  '紹介',
  'SNS',
  'WEB',
  'SMS',
  'LINE',
] as const

function uniqueLines(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter((item, index, items) => item.length > 0 && items.indexOf(item) === index)
}

export function splitMarketingCatalog(
  values: readonly string[],
  configuredMethods: readonly string[] = DEFAULT_MARKETING_METHODS
): {
  methods: string[]
  channels: string[]
} {
  const methods: string[] = []
  const channels: string[] = []

  for (const rawValue of values) {
    const value = rawValue.trim()
    if (!value) continue
    const destination = configuredMethods.some(
      (method) => method.toLowerCase() === value.toLowerCase()
    )
      ? methods
      : channels
    if (!destination.includes(value)) destination.push(value)
  }

  return { methods, channels }
}

export function mergeMarketingCatalog(methodInput: string, channelInput: string): string[] {
  return [...new Set([...uniqueLines(methodInput), ...uniqueLines(channelInput)])]
}
