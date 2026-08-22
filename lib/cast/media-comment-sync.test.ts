/**
 * @design_doc   EXT-01 媒体コメント同期は手入力を消さない
 * @related_to   shouldApplyImportedMediaComment
 * @known_issues None
 */
import { describe, expect, it } from 'vitest'

import { planMediaCommentImport, shouldApplyImportedMediaComment } from './media-comment-sync'

describe('shouldApplyImportedMediaComment', () => {
  it('never overwrites an excluded cast', () => {
    expect(
      shouldApplyImportedMediaComment({
        excluded: true,
        overwriteEnabled: true,
        existingComment: '手入力',
        existingSource: 'manual',
        incomingComment: '公式',
      })
    ).toBe(false)
  })

  it('keeps a manual comment unless overwrite is enabled', () => {
    expect(
      shouldApplyImportedMediaComment({
        excluded: false,
        overwriteEnabled: false,
        existingComment: '手入力',
        existingSource: 'manual',
        incomingComment: 'ヘブン',
      })
    ).toBe(false)
  })

  it('applies an import when overwrite is enabled or the field is empty', () => {
    expect(
      shouldApplyImportedMediaComment({
        excluded: false,
        overwriteEnabled: true,
        existingComment: '手入力',
        existingSource: 'manual',
        incomingComment: 'ヘブン',
      })
    ).toBe(true)

    expect(
      shouldApplyImportedMediaComment({
        excluded: false,
        overwriteEnabled: false,
        existingComment: '',
        existingSource: 'manual',
        incomingComment: '便利',
      })
    ).toBe(true)
  })
})

describe('planMediaCommentImport', () => {
  it('skips excluded casts and unknown ids while updating empty comments', () => {
    expect(
      planMediaCommentImport({
        overwriteEnabled: false,
        source: 'heaven',
        casts: [
          {
            id: 'cast-manual',
            mediaComment: '手入力',
            mediaCommentSource: 'manual',
            mediaSyncExcluded: false,
          },
          {
            id: 'cast-empty',
            mediaComment: '',
            mediaCommentSource: 'manual',
            mediaSyncExcluded: false,
          },
          {
            id: 'cast-excluded',
            mediaComment: '',
            mediaCommentSource: 'manual',
            mediaSyncExcluded: true,
          },
        ],
        comments: [
          { castId: 'cast-manual', comment: 'ヘブン' },
          { castId: 'cast-empty', comment: ' ヘブン空欄 ' },
          { castId: 'cast-excluded', comment: '対象外' },
          { castId: 'missing', comment: '不明' },
        ],
      })
    ).toEqual([{ id: 'cast-empty', mediaComment: 'ヘブン空欄', mediaCommentSource: 'heaven' }])
  })
})
