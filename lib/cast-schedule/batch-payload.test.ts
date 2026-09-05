/**
 * @design_doc   Notion task #283 four-week schedule persistence
 * @related_to   WeeklySchedulePage and batch schedule API
 * @known_issues None
 */
import { describe, expect, it } from 'vitest'
import { buildScheduleBatchPayload } from './batch-payload'

describe('buildScheduleBatchPayload', () => {
  it('does not erase untouched dates in a four-week editor', () => {
    const payload = buildScheduleBatchPayload({
      '2026-09-01': { date: '2026-09-01', status: '未入力' },
      '2026-09-02': { date: '2026-09-02', status: '休日' },
      '2026-09-03': {
        date: '2026-09-03',
        status: '出勤予定',
        startTime: '12:00',
        endTime: '20:00',
        isAvailable: false,
        note: '媒体用',
        mediaText: '媒体にはこちらを掲載',
      },
    })

    expect(payload).toEqual([
      { date: '2026-09-02', status: 'holiday' },
      {
        date: '2026-09-03',
        status: 'working',
        workStatus: '出勤予定',
        startTime: '12:00',
        endTime: '20:00',
        isAvailable: false,
        note: '媒体用',
        mediaText: '媒体にはこちらを掲載',
      },
    ])
  })

  it('preserves all six shared work states in the batch transport', () => {
    expect(
      buildScheduleBatchPayload({
        '2026-09-04': {
          date: '2026-09-04',
          status: '遅刻',
          startTime: '13:00',
          endTime: '20:00',
        },
      })
    ).toEqual([
      {
        date: '2026-09-04',
        status: 'working',
        workStatus: '遅刻',
        startTime: '13:00',
        endTime: '20:00',
        isAvailable: undefined,
        note: undefined,
        mediaText: undefined,
      },
    ])
  })
})

it('preserves notes on holidays and explicit resets to unset', () => {
  expect(
    buildScheduleBatchPayload(
      {
        '2026-09-07': { status: '休日', note: '内部の備考', mediaText: '媒体用の一文' },
        '2026-09-08': { status: '未入力', note: '時間は確認中' },
      },
      { includeUnset: true }
    )
  ).toEqual([
    { date: '2026-09-07', status: 'holiday', note: '内部の備考', mediaText: '媒体用の一文' },
    { date: '2026-09-08', status: 'unset', note: '時間は確認中', mediaText: undefined },
  ])
})
