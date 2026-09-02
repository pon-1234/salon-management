/**
 * @design_doc   Notion #281 course ordering synchronization
 * @related_to   CourseInfoPage and public/admin pricing readers
 * @known_issues None
 */
import { describe, expect, it } from 'vitest'
import { moveCatalogItem, nextCatalogDisplayOrder } from './display-order'

describe('moveCatalogItem', () => {
  it('moves an item and assigns contiguous display orders', () => {
    expect(
      moveCatalogItem(
        [
          { id: 'a', displayOrder: 0 },
          { id: 'b', displayOrder: 1 },
          { id: 'c', displayOrder: 2 },
        ],
        'c',
        'up'
      )
    ).toEqual([
      { id: 'a', displayOrder: 0 },
      { id: 'c', displayOrder: 1 },
      { id: 'b', displayOrder: 2 },
    ])
  })

  it('leaves boundary moves unchanged', () => {
    expect(moveCatalogItem([{ id: 'a', displayOrder: 0 }], 'a', 'up')).toEqual([
      { id: 'a', displayOrder: 0 },
    ])
  })
})

describe('nextCatalogDisplayOrder', () => {
  it('places a newly created course after the current final item', () => {
    expect(nextCatalogDisplayOrder([{ displayOrder: 2 }, { displayOrder: 7 }])).toBe(8)
    expect(nextCatalogDisplayOrder([])).toBe(0)
  })
})
