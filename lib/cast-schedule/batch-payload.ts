/**
 * @design_doc   Notion task #283 four-week schedule persistence
 * @related_to   WeeklySchedulePage sends only explicit edits to the batch schedule API
 * @known_issues None
 */
type EditableDay = {
  date?: string
  status: '休日' | '出勤予定' | '未入力'
  startTime?: string
  endTime?: string
  isAvailable?: boolean
  note?: string
}

export type ScheduleBatchItem =
  | { date: string; status: 'holiday' }
  | {
      date: string
      status: 'working'
      startTime: string
      endTime: string
      isAvailable?: boolean
      note?: string
    }

export function buildScheduleBatchPayload(
  schedule: Record<string, EditableDay>
): ScheduleBatchItem[] {
  return Object.entries(schedule).flatMap<ScheduleBatchItem>(([date, day]) => {
    if (day.status === '未入力') return []
    if (day.status === '休日') return [{ date, status: 'holiday' as const }]
    if (!day.startTime || !day.endTime) return []
    return [
      {
        date,
        status: 'working' as const,
        startTime: day.startTime,
        endTime: day.endTime,
        isAvailable: day.isAvailable,
        note: day.note,
      },
    ]
  })
}
