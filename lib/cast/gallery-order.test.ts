/**
 * @design_doc   Notion task #282 cast gallery ordering
 * @related_to   CastForm gallery editor
 * @known_issues None
 */
import { describe, expect, it } from 'vitest'
import { moveGalleryImage } from './gallery-order'

describe('moveGalleryImage', () => {
  it('moves an image one position while preserving the rest', () => {
    expect(moveGalleryImage(['a.jpg', 'b.jpg', 'c.jpg'], 2, -1)).toEqual([
      'a.jpg',
      'c.jpg',
      'b.jpg',
    ])
  })

  it('does nothing outside gallery bounds', () => {
    expect(moveGalleryImage(['a.jpg', 'b.jpg'], 0, -1)).toEqual(['a.jpg', 'b.jpg'])
  })
})
