/**
 * @design_doc   RSV-03 予約更新時に旧オプションIDや無効化済み選択を残す
 * @related_to   resolveSelectedOptionIds
 * @known_issues None
 */
import { describe, expect, it } from 'vitest'

import {
  mergeAttachedOptionRecords,
  resolveSelectedOptionIds,
  uniqueResolvedOptionIds,
} from './resolve-selected-options'

const catalog = [
  { id: 'active-1', isActive: true, archivedAt: null },
  { id: 'inactive-1', isActive: false, archivedAt: null },
  { id: 'archived-1', isActive: true, archivedAt: new Date('2026-01-01') },
]

describe('resolveSelectedOptionIds', () => {
  it('accepts an empty selection without treating it as missing', () => {
    expect(resolveSelectedOptionIds({ requestedIds: [], catalog })).toEqual({
      acceptedIds: [],
      missingIds: [],
    })
  })

  it('accepts active catalog options', () => {
    expect(resolveSelectedOptionIds({ requestedIds: ['active-1'], catalog })).toEqual({
      acceptedIds: ['active-1'],
      missingIds: [],
    })
  })

  it('keeps inactive or archived options that are already attached to the reservation', () => {
    expect(
      resolveSelectedOptionIds({
        requestedIds: ['inactive-1', 'archived-1', 'active-1'],
        catalog,
        attachedIds: ['inactive-1', 'archived-1'],
      })
    ).toEqual({
      acceptedIds: ['inactive-1', 'archived-1', 'active-1'],
      missingIds: [],
    })
  })

  it('keeps a deleted attached option even when it is no longer in the catalog', () => {
    expect(
      resolveSelectedOptionIds({
        requestedIds: ['legacy-gone'],
        catalog,
        attachedIds: ['legacy-gone'],
      })
    ).toEqual({
      acceptedIds: ['legacy-gone'],
      missingIds: [],
    })
  })

  it('keeps attached options in the record map when they are missing from the catalog', () => {
    const catalog = [
      { id: 'active-1', name: '延長', price: 3000, storeShare: 1000, castShare: 2000 },
    ]
    const map = mergeAttachedOptionRecords(catalog, [
      {
        optionId: 'legacy-1',
        optionName: '旧OP',
        optionPrice: 2000,
        storeShare: 500,
        castShare: 1500,
      },
    ])
    expect(map.get('legacy-1')).toEqual({
      id: 'legacy-1',
      name: '旧OP',
      price: 2000,
      storeShare: 500,
      castShare: 1500,
    })
    expect(uniqueResolvedOptionIds(['active-1', 'active-1'])).toEqual(['active-1'])
  })

  it('reports unknown options that are not already attached', () => {
    expect(
      resolveSelectedOptionIds({
        requestedIds: ['unknown'],
        catalog,
        attachedIds: ['active-1'],
      })
    ).toEqual({
      acceptedIds: [],
      missingIds: ['unknown'],
    })
  })
})
