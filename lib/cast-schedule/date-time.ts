/**
 * @design_doc   Batch cast schedule editing in the Asia/Tokyo business timezone
 * @related_to   app/api/cast-schedule/batch/route.ts and weekly schedule editor
 * @known_issues None
 */
import { zonedTimeToUtc } from 'date-fns-tz'

const JST_TIMEZONE = 'Asia/Tokyo'

/** Converts a strict business date and clock, including 24:00, to a UTC instant. */
export function parseScheduleDateTimeInJst(dateKey: string, time: string): Date {
  const parsedDate = new Date(`${dateKey}T00:00:00.000Z`)
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(dateKey) ||
    Number.isNaN(parsedDate.getTime()) ||
    parsedDate.toISOString().slice(0, 10) !== dateKey
  ) {
    throw new RangeError(`Invalid schedule date: ${dateKey}`)
  }

  const timeMatch = time.match(/^(?:(\d{2}):([0-5]\d))$/)
  if (!timeMatch) {
    throw new RangeError(`Invalid schedule time: ${time}`)
  }

  const hours = Number(timeMatch[1])
  const minutes = Number(timeMatch[2])
  if (hours > 24 || (hours === 24 && minutes !== 0)) {
    throw new RangeError(`Invalid schedule time: ${time}`)
  }

  let targetDateKey = dateKey
  let targetHours = hours
  if (hours === 24) {
    const nextDay = new Date(parsedDate)
    nextDay.setUTCDate(nextDay.getUTCDate() + 1)
    targetDateKey = nextDay.toISOString().slice(0, 10)
    targetHours = 0
  }

  const localDateTime = `${targetDateKey}T${targetHours
    .toString()
    .padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`
  return zonedTimeToUtc(localDateTime, JST_TIMEZONE)
}
