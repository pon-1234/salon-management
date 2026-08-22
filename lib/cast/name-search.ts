/**
 * @design_doc   Cast list search matches display name and kana, including hiragana queries
 * @related_to   CastListPage name search
 * @known_issues None
 */

function katakanaToHiragana(value: string): string {
  return value.replace(/[ァ-ヶ]/g, (character) =>
    String.fromCharCode(character.charCodeAt(0) - 0x60)
  )
}

export function normalizeCastSearchText(value: string): string {
  return katakanaToHiragana(value.normalize('NFKC').toLocaleLowerCase('ja-JP')).replace(/\s+/g, '')
}

export function matchesCastNameSearch(
  cast: { name: string; nameKana?: string | null },
  query: string
): boolean {
  const needle = normalizeCastSearchText(query)
  if (!needle) {
    return true
  }

  return (
    normalizeCastSearchText(cast.name).includes(needle) ||
    normalizeCastSearchText(cast.nameKana ?? '').includes(needle)
  )
}

export function readCastListPayload(payload: unknown): unknown[] {
  if (Array.isArray(payload)) {
    return payload
  }

  if (payload && typeof payload === 'object') {
    const record = payload as Record<string, unknown>
    if (Array.isArray(record.data)) {
      return record.data
    }
    if (Array.isArray(record.items)) {
      return record.items
    }
  }

  return []
}
