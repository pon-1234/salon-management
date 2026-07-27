/**
 * @design_doc   docs/SYSTEM_AUDIT_2026-07-26.md C-5 schedule editor consolidation
 * @related_to   findScheduleValidationError shared by both schedule editors
 * @known_issues None
 */
import { describe, expect, it } from 'vitest'
import { findScheduleValidationError } from './validation'

describe('findScheduleValidationError', () => {
  const formatDate = (dateKey: string) => `[${dateKey}]`

  it('requires both times on a working day', () => {
    expect(
      findScheduleValidationError(
        { '2026-07-27': { status: '出勤予定', startTime: '10:00' } },
        ['出勤予定'],
        formatDate
      )
    ).toBe('[2026-07-27] の時間を入力してください')
  })

  it('requires the end time to follow the start time', () => {
    expect(
      findScheduleValidationError(
        {
          '2026-07-27': {
            status: '出勤予定',
            startTime: '18:00',
            endTime: '12:00',
          },
        },
        ['出勤予定'],
        formatDate
      )
    ).toBe('[2026-07-27] の終了時間は開始時間より後にしてください')
  })

  it('ignores non-working days and accepts valid working times', () => {
    expect(
      findScheduleValidationError(
        {
          '2026-07-27': { status: '休日' },
          '2026-07-28': {
            status: '出勤予定',
            startTime: '10:00',
            endTime: '18:00',
          },
        },
        ['出勤予定'],
        formatDate
      )
    ).toBeNull()
  })
})
