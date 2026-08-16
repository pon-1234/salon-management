/**
 * @design_doc   docs/PREVIEW_UAT_CHECKLIST.md reservation timeline operational filters
 * @related_to   ReservationPageContent and FilterDialog
 * @known_issues None
 */
import type { Cast } from '@/lib/cast/types'

const OPENING_MINUTES = 30
const MILLISECONDS_PER_MINUTE = 60_000

export interface TimelineFilterOptions {
  availability: 'all' | 'open' | 'booked'
  optionId: string
  name: string
}

export const DEFAULT_TIMELINE_FILTERS: TimelineFilterOptions = {
  availability: 'all',
  optionId: '',
  name: '',
}

function hasOpening(cast: Cast): boolean {
  if (!cast.workStart || !cast.workEnd || cast.workEnd <= cast.workStart) {
    return false
  }

  const appointments = [...cast.appointments]
    .filter(
      (appointment) =>
        appointment.endTime > cast.workStart! && appointment.startTime < cast.workEnd!
    )
    .sort((left, right) => left.startTime.getTime() - right.startTime.getTime())

  let cursor = cast.workStart.getTime()
  const workEnd = cast.workEnd.getTime()

  for (const appointment of appointments) {
    const appointmentStart = Math.max(appointment.startTime.getTime(), cursor)
    if ((appointmentStart - cursor) / MILLISECONDS_PER_MINUTE >= OPENING_MINUTES) {
      return true
    }
    cursor = Math.max(cursor, appointment.endTime.getTime())
    if (cursor >= workEnd) {
      return false
    }
  }

  return (workEnd - cursor) / MILLISECONDS_PER_MINUTE >= OPENING_MINUTES
}

function attendanceStart(cast: Cast): number {
  return cast.workStart?.getTime() ?? Number.POSITIVE_INFINITY
}

/** Filters the scheduled timeline by operational criteria and applies the documented start-time order. */
export function filterAndSortTimelineCasts(
  casts: readonly Cast[],
  filters: TimelineFilterOptions
): Cast[] {
  const normalizedName = filters.name.trim().toLocaleLowerCase('ja-JP')

  return casts
    .filter((cast) => {
      if (filters.availability === 'open' && !hasOpening(cast)) {
        return false
      }
      if (filters.availability === 'booked' && cast.appointments.length === 0) {
        return false
      }
      if (filters.optionId && !cast.availableOptions.includes(filters.optionId)) {
        return false
      }
      if (normalizedName) {
        const name = cast.name.toLocaleLowerCase('ja-JP')
        const nameKana = cast.nameKana.toLocaleLowerCase('ja-JP')
        if (!name.includes(normalizedName) && !nameKana.includes(normalizedName)) {
          return false
        }
      }
      return true
    })
    .sort(
      (left, right) =>
        attendanceStart(left) - attendanceStart(right) || left.name.localeCompare(right.name, 'ja')
    )
}
