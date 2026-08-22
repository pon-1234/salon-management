/**
 * @design_doc   Cast list search matches display name and kana, including hiragana queries
 * @related_to   name-search.ts
 * @known_issues None
 */
import { describe, expect, it } from 'vitest'

import { matchesCastNameSearch, readCastListPayload } from './name-search'

describe('matchesCastNameSearch', () => {
  it('matches a display name without requiring the internal cast id', () => {
    const cast = { id: 'legacy-cast-member-9001', name: 'あやか', nameKana: 'アヤカ' }

    expect(matchesCastNameSearch(cast, 'あやか')).toBe(true)
    expect(matchesCastNameSearch(cast, 'アヤカ')).toBe(true)
    expect(matchesCastNameSearch(cast, 'ayak')).toBe(false)
    expect(matchesCastNameSearch(cast, 'legacy-cast-member-9001')).toBe(false)
    expect(matchesCastNameSearch({ name: 'さくら', nameKana: 'サクラ' }, 'さくら')).toBe(true)
  })

  it('matches a hiragana query against katakana nameKana', () => {
    expect(matchesCastNameSearch({ name: '彩花', nameKana: 'アヤカ' }, 'あやか')).toBe(true)
    expect(matchesCastNameSearch({ name: '彩花', nameKana: 'アヤカ' }, 'あや')).toBe(true)
  })

  it('treats an empty query as a match so the full list can be shown', () => {
    expect(matchesCastNameSearch({ name: 'さくら', nameKana: 'さくら' }, '  ')).toBe(true)
  })
})

describe('readCastListPayload', () => {
  it('reads either a bare array or a wrapped data/items payload', () => {
    expect(readCastListPayload([{ id: '1' }])).toEqual([{ id: '1' }])
    expect(readCastListPayload({ data: [{ id: '2' }] })).toEqual([{ id: '2' }])
    expect(readCastListPayload({ items: [{ id: '3' }] })).toEqual([{ id: '3' }])
    expect(readCastListPayload({ error: 'nope' })).toEqual([])
  })
})
