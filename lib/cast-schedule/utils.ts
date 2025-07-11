import { format, addDays } from 'date-fns'
import { ja } from 'date-fns/locale'
import { InvalidTimeFormatError } from './errors'

export function getWeekDates(startDate: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => addDays(startDate, i))
}

export function formatScheduleDate(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

export function formatDisplayDate(date: Date): string {
  return format(date, 'MM/dd', { locale: ja })
}

export function formatDayOfWeek(date: Date): string {
  return format(date, '(E)', { locale: ja })
}

export function validateTimeFormat(time: string): boolean {
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/
  return timeRegex.test(time)
}

export function parseTime(time: string): { hours: number; minutes: number } {
  if (!validateTimeFormat(time)) {
    throw new InvalidTimeFormatError(time)
  }

  const [hours, minutes] = time.split(':').map(Number)
  return { hours, minutes }
}

export function timeToMinutes(time: string): number {
  const { hours, minutes } = parseTime(time)
  return hours * 60 + minutes
}

export function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
}

export function isTimeOverlapping(
  start1: string,
  end1: string,
  start2: string,
  end2: string
): boolean {
  const start1Min = timeToMinutes(start1)
  const end1Min = timeToMinutes(end1)
  const start2Min = timeToMinutes(start2)
  const end2Min = timeToMinutes(end2)

  // Determine if shifts are overnight
  const isOvernight1 = end1Min <= start1Min
  const isOvernight2 = end2Min <= start2Min

  if (!isOvernight1 && !isOvernight2) {
    // Both are regular shifts (no overnight)
    return start1Min < end2Min && end1Min > start2Min
  } else if (isOvernight1 && !isOvernight2) {
    // Shift 1 is overnight (e.g., 23:00 to 02:00)
    // Shift 2 is regular (e.g., 01:00 to 03:00)
    // They overlap if:
    // 1. Shift 2 starts during shift 1's night portion (>= start1)
    // 2. Shift 2 starts during shift 1's morning portion (< end1)
    return (
      start2Min >= start1Min || // Starts in the night portion
      start2Min < end1Min // Starts in the morning portion
    )
  } else if (!isOvernight1 && isOvernight2) {
    // Shift 1 is regular, shift 2 is overnight
    // They overlap if:
    // 1. Shift 1 starts during shift 2's night portion (>= start2)
    // 2. Shift 1 starts during shift 2's morning portion (< end2)
    return (
      start1Min >= start2Min || // Starts in the night portion
      start1Min < end2Min // Starts in the morning portion
    )
  } else {
    // Both are overnight shifts
    return true // Overnight shifts always overlap with other overnight shifts
  }
}
