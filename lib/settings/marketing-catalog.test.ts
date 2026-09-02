/**
 * @design_doc   Notion task #281 acquisition method/channel settings
 * @related_to   store settings form and reservation acquisition selectors
 * @known_issues None
 */
import { describe, expect, it } from 'vitest'
import { mergeMarketingCatalog, splitMarketingCatalog } from './marketing-catalog'

describe('marketing catalog', () => {
  it('splits methods and site channels while preserving configured values', () => {
    expect(splitMarketingCatalog(['電話', '店リピート', 'Heaven', 'サイト関連：駅ちか'])).toEqual({
      methods: ['電話', '店リピート'],
      channels: ['Heaven', 'サイト関連：駅ちか'],
    })
  })

  it('merges newline inputs without blanks or duplicates', () => {
    expect(mergeMarketingCatalog('電話\n紹介\n電話', 'Heaven\n\n駅ちか')).toEqual([
      '電話',
      '紹介',
      'Heaven',
      '駅ちか',
    ])
  })
})
