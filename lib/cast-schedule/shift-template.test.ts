/**
 * @design_doc   SCH-01/SCH-02 キャスト出勤時間テンプレートと休み登録
 * @related_to   applyShiftTemplate
 * @known_issues None
 */
import { describe, expect, it } from 'vitest'

import {
  applyShiftTemplate,
  createHolidayTemplate,
  mergeCastShiftTemplates,
} from './shift-template'

describe('applyShiftTemplate', () => {
  it('fills start and end times for a working template', () => {
    expect(
      applyShiftTemplate(
        {
          id: 'day',
          name: '昼勤',
          startTime: '12:00',
          endTime: '22:00',
          isHoliday: false,
        },
        '2026-08-22'
      )
    ).toEqual({
      date: '2026-08-22',
      status: '出勤予定',
      startTime: '12:00',
      endTime: '22:00',
    })
  })

  it('marks a holiday template as 休日 without times', () => {
    expect(applyShiftTemplate(createHolidayTemplate(), '2026-08-23')).toEqual({
      date: '2026-08-23',
      status: '休日',
      startTime: undefined,
      endTime: undefined,
    })
  })
})

describe('mergeCastShiftTemplates', () => {
  it('does not inject generic work templates when none are saved', () => {
    expect(mergeCastShiftTemplates(null).map((template) => template.id)).toEqual(['holiday'])
    expect(
      mergeCastShiftTemplates([
        { id: 'custom', name: 'A勤', startTime: '10:00', endTime: '18:00', isHoliday: false },
      ])
    ).toEqual([
      { id: 'custom', name: 'A勤', startTime: '10:00', endTime: '18:00', isHoliday: false },
    ])
  })
})
