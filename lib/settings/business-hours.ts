import { addDays, format, parse } from 'date-fns'

export interface BusinessHoursRange {
  startMinutes: number
  endMinutes: number
  startLabel: string
  endLabel: string
}

const MINUTES_IN_DAY = 24 * 60
const DEFAULT_START_TIME = '09:00'
const DEFAULT_END_TIME = '23:00'

const toMinutes = (time: string): number | null => {
  const match = time.trim().match(/^(\d{1,2}):(\d{2})$/)
  if (!match) return null
  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return null
  }
  if (hours === 24 && minutes === 0) {
    return MINUTES_IN_DAY
  }
  return hours * 60 + minutes
}

const formatLabel = (minutes: number) => {
  const normalized = ((minutes % MINUTES_IN_DAY) + MINUTES_IN_DAY) % MINUTES_IN_DAY
  const hours = Math.floor(normalized / 60)
  const mins = normalized % 60
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
}

export const formatMinutesAsLabel = (minutes: number) => formatLabel(minutes)

const DEFAULT_FALLBACK: BusinessHoursRange = {
  startMinutes: toMinutes(DEFAULT_START_TIME) ?? 9 * 60,
  endMinutes: toMinutes(DEFAULT_END_TIME) ?? 23 * 60,
  startLabel: DEFAULT_START_TIME,
  endLabel: DEFAULT_END_TIME,
}

export const DEFAULT_BUSINESS_HOURS: BusinessHoursRange = parseBusinessHoursString(
  `${DEFAULT_START_TIME} - ${DEFAULT_END_TIME}`,
  DEFAULT_FALLBACK
)

export function parseBusinessHoursString(
  raw: string | null | undefined,
  fallback?: BusinessHoursRange
): BusinessHoursRange {
  const effectiveFallback = fallback ?? DEFAULT_BUSINESS_HOURS

  if (!raw || typeof raw !== 'string') {
    return effectiveFallback
  }

  const matches = raw.match(/(\d{1,2}:\d{2})/g)
  if (!matches || matches.length < 2) {
    return effectiveFallback
  }

  const startMatch = matches[0]
  const endMatch = matches[matches.length - 1]

  let startMinutes = toMinutes(startMatch)
  let endMinutes = toMinutes(endMatch)

  if (startMinutes === null || endMinutes === null) {
    return effectiveFallback
  }

  if (endMinutes <= startMinutes) {
    endMinutes += MINUTES_IN_DAY
  }

  return {
    startMinutes,
    endMinutes,
    startLabel: formatLabel(startMinutes),
    endLabel: formatLabel(endMinutes),
  }
}

export function minutesToIsoInJst(dateString: string, minutes: number): string {
  const minutesInDay = MINUTES_IN_DAY
  const dayOffset = Math.floor(minutes / minutesInDay)
  const minutesOfDay = ((minutes % minutesInDay) + minutesInDay) % minutesInDay
  const hours = Math.floor(minutesOfDay / 60)
  const mins = minutesOfDay % 60

  const parsedDate = parse(dateString, 'yyyy-MM-dd', new Date())
  const targetDate = addDays(parsedDate, dayOffset)
  const datePart = format(targetDate, 'yyyy-MM-dd')
  const timePart = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:00`

  return `${datePart}T${timePart}`
}
