/**
 * @design_doc   Notion #280 three-slot course selection
 * @related_to   QuickBookingDialog and reservation API course pricing
 * @known_issues None
 */
import { describe, expect, it } from 'vitest'
import { normalizeRequestedCourseIds, resolveCourseSelectionSummary } from './course-selection'

const catalog = [
  {
    id: 'course-190',
    name: '190分',
    duration: 190,
    price: 30_000,
    storeShare: 10_000,
    castShare: 20_000,
  },
  {
    id: 'extension-30',
    name: '30分延長',
    duration: 30,
    price: 5_000,
    storeShare: 2_000,
    castShare: 3_000,
  },
]

describe('course selection', () => {
  it('keeps up to three selections including duplicate extensions', () => {
    expect(
      normalizeRequestedCourseIds('course-190', ['course-190', 'extension-30', 'extension-30'])
    ).toEqual(['course-190', 'extension-30', 'extension-30'])
  })

  it('rejects a fourth course selection', () => {
    expect(() =>
      normalizeRequestedCourseIds('course-190', [
        'course-190',
        'extension-30',
        'extension-30',
        'extension-30',
      ])
    ).toThrow('コースは3件まで選択できます')
  })

  it('sums duration, price, and revenue shares while preserving snapshots', () => {
    expect(
      resolveCourseSelectionSummary(['course-190', 'extension-30', 'extension-30'], catalog)
    ).toEqual({
      duration: 250,
      price: 40_000,
      storeShare: 14_000,
      castShare: 26_000,
      items: [
        { ...catalog[0], sortOrder: 0 },
        { ...catalog[1], sortOrder: 1 },
        { ...catalog[1], sortOrder: 2 },
      ],
    })
  })
})
