/**
 * @design_doc   docs/SYSTEM_AUDIT_2026-07-26.md C-5 schedule editor consolidation
 * @related_to   Both administrative weekly schedule editor presentations
 * @known_issues Presentation-specific status choices remain owned by each editor
 */
interface ScheduleTimeEntry {
  status: string
  startTime?: string
  endTime?: string
}

export function findScheduleValidationError(
  schedule: Record<string, ScheduleTimeEntry>,
  workingStatuses: readonly string[],
  formatDate: (dateKey: string) => string
): string | null {
  for (const [dateKey, entry] of Object.entries(schedule)) {
    if (!workingStatuses.includes(entry.status)) {
      continue
    }
    if (!entry.startTime || !entry.endTime) {
      return `${formatDate(dateKey)} の時間を入力してください`
    }
    if (entry.startTime >= entry.endTime) {
      return `${formatDate(dateKey)} の終了時間は開始時間より後にしてください`
    }
  }
  return null
}
