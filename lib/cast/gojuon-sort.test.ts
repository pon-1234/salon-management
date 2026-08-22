/**
 * @design_doc   CAST-01 キャストリストをあいうえお順で安定表示する
 * @related_to   sortCastsByGojuon
 * @known_issues None
 */
import { describe, expect, it } from 'vitest'

import { sortCastsByGojuon } from './gojuon-sort'

describe('sortCastsByGojuon', () => {
  it('sorts by nameKana in gojuon order and ignores work status', () => {
    const sorted = sortCastsByGojuon([
      { id: '3', name: 'さくら', nameKana: 'さくら', workStatus: '出勤' },
      { id: '1', name: 'あおい', nameKana: 'あおい', workStatus: '休日' },
      { id: '2', name: 'かおり', nameKana: 'かおり', workStatus: '未出勤' },
    ])

    expect(sorted.map((cast) => cast.id)).toEqual(['1', '2', '3'])
  })

  it('places casts without nameKana after named casts, then sorts by name', () => {
    const sorted = sortCastsByGojuon([
      { id: 'missing-b', name: 'ベータ', nameKana: '   ', workStatus: '出勤' },
      { id: 'aoi', name: 'あおい', nameKana: 'あおい', workStatus: '未出勤' },
      { id: 'missing-a', name: 'アルファ', nameKana: null, workStatus: '休日' },
    ])

    expect(sorted.map((cast) => cast.id)).toEqual(['aoi', 'missing-a', 'missing-b'])
  })
})
