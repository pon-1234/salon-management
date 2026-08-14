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

const parseScheduleMinutes = (time: string): number | null => {
  const match = time.match(/^(\d{1,2}):([0-5]\d)$/)
  if (!match) return null
  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (hours > 24 || (hours === 24 && minutes !== 0)) return null
  return hours * 60 + minutes
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
    const startMinutes = parseScheduleMinutes(entry.startTime)
    const parsedEndMinutes = parseScheduleMinutes(entry.endTime)
    const endMinutes =
      parsedEndMinutes === 0 && startMinutes !== null && startMinutes > 0
        ? 24 * 60
        : parsedEndMinutes
    if (startMinutes === null || endMinutes === null || startMinutes >= endMinutes) {
      return `${formatDate(dateKey)} の終了時間は開始時間より後にしてください`
    }
  }
  return null
}
