/**
 * @design_doc   Store-scoped designation rank from completed reservations
 * @related_to   Timeline rank badges, cast performance designation categories
 * @known_issues Legacy media-to-princess mapping remains unclassified
 */
import { describe, expect, it } from 'vitest'

import { computeStoreCastRanks } from './rank'

describe('computeStoreCastRanks', () => {
  it('ranks casts by regular and panel designation counts, then name', () => {
    const ranks = computeStoreCastRanks([
      { castId: 'cast-a', castName: 'さら', designationType: 'regular' },
      { castId: 'cast-a', castName: 'さら', designationType: 'regular' },
      { castId: 'cast-b', castName: 'れいな', designationType: '本指名' },
      { castId: 'cast-e', castName: 'ひな', designationType: 'リピート指名' },
      { castId: 'cast-c', castName: 'きょうか', designationType: 'panel' },
      { castId: 'cast-c', castName: 'きょうか', designationType: 'フリー指名' },
      { castId: 'cast-d', castName: 'みお', designationType: 'none' },
    ])

    expect(ranks.get('cast-a')).toEqual({ regularDesignationRank: 1, panelDesignationRank: 0 })
    expect(ranks.get('cast-e')).toEqual({ regularDesignationRank: 2, panelDesignationRank: 0 })
    expect(ranks.get('cast-b')).toEqual({ regularDesignationRank: 3, panelDesignationRank: 0 })
    expect(ranks.get('cast-c')).toEqual({ regularDesignationRank: 0, panelDesignationRank: 1 })
    expect(ranks.get('cast-d')).toEqual({ regularDesignationRank: 0, panelDesignationRank: 0 })
  })
})
