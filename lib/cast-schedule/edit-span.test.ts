/**
 * @design_doc   会議未確定: 1週間表示のまま1か月先まで入力できる
 * @related_to   ScheduleEditDialog, getDateRange
 * @known_issues None
 */
import { describe, expect, it } from 'vitest'
import { getDateRange } from './utils'
import { scheduleEditDayCount, type ScheduleEditSpan } from './edit-span'

describe('schedule month edit span', () => {
  it('uses 7 days for a week and 28 days for four weeks', () => {
    const spans: ScheduleEditSpan[] = ['week', 'fourWeeks']
    expect(spans.map(scheduleEditDayCount)).toEqual([7, 28])
  })

  it('returns consecutive dates from the visible start', () => {
    const dates = getDateRange(new Date('2026-08-24T00:00:00+09:00'), 28)
    expect(dates).toHaveLength(28)
    expect(dates[0]).toEqual(new Date('2026-08-24T00:00:00+09:00'))
    expect(dates[27]).toEqual(new Date('2026-09-20T00:00:00+09:00'))
  })
})
