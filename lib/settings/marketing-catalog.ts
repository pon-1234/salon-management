/**
 * @design_doc   Notion task #281 acquisition method/channel settings
 * @related_to   Store settings persist one compatible catalog; reservation forms split the catalog
 * @known_issues Site-channel classification relies on the configured site naming convention
 */

const SITE_CHANNEL_HINTS = ['heaven', 'ヘブン', 'サイト関連'] as const

function uniqueLines(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter((item, index, items) => item.length > 0 && items.indexOf(item) === index)
}

export function splitMarketingCatalog(values: readonly string[]): {
  methods: string[]
  channels: string[]
} {
  const methods: string[] = []
  const channels: string[] = []

  for (const rawValue of values) {
    const value = rawValue.trim()
    if (!value) continue
    const normalized = value.toLowerCase()
    const destination = SITE_CHANNEL_HINTS.some((hint) => normalized.includes(hint))
      ? channels
      : methods
    if (!destination.includes(value)) destination.push(value)
  }

  return { methods, channels }
}

export function mergeMarketingCatalog(methodInput: string, channelInput: string): string[] {
  return [...new Set([...uniqueLines(methodInput), ...uniqueLines(channelInput)])]
}
