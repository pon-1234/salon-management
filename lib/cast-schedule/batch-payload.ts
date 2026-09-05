/**
 * @design_doc   Notion task #283 four-week schedule persistence
 * @related_to   WeeklySchedulePage sends only explicit edits to the batch schedule API
 * @known_issues None
 */
import type { ScheduleWorkStatus } from './old-types'

type EditableDay = {
  date?: string
  status: ScheduleWorkStatus
  startTime?: string
  endTime?: string
  isAvailable?: boolean
  note?: string
  mediaText?: string
}

export type ScheduleBatchItem =
  | { date: string; status: 'holiday' | 'unset'; note?: string; mediaText?: string }
  | {
      date: string
      status: 'working'
      workStatus: Exclude<ScheduleWorkStatus, '未入力' | '休日'>
      startTime: string
      endTime: string
      isAvailable?: boolean
      note?: string
      mediaText?: string
    }

export function buildScheduleBatchPayload(
  schedule: Record<string, EditableDay>,
  options: { includeUnset?: boolean } = {}
): ScheduleBatchItem[] {
  return Object.entries(schedule).flatMap<ScheduleBatchItem>(([date, day]) => {
    if (day.status === '未入力' && !options.includeUnset) return []
    if (day.status === '休日' || day.status === '未入力')
      return [
        {
          date,
          status: day.status === '休日' ? 'holiday' : 'unset',
          ...(day.note !== undefined ? { note: day.note } : {}),
          ...(day.mediaText !== undefined ? { mediaText: day.mediaText } : {}),
        },
      ]
    if (!day.startTime || !day.endTime) return []
    return [
      {
        date,
        status: 'working' as const,
        workStatus: day.status,
        startTime: day.startTime,
        endTime: day.endTime,
        isAvailable: day.isAvailable,
        note: day.note,
        mediaText: day.mediaText,
      },
    ]
  })
}
