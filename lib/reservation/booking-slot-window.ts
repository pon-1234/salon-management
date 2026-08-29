/**
 * @design_doc   Admin timeline 30-minute booking circles and 5-minute intake window
 * @related_to   Timeline, QuickBookingDialog, TimeSlotPicker
 * @known_issues None
 */

export const TIMELINE_BOOKING_INTERVAL_MINUTES = 30
export const QUICK_BOOKING_START_OPTIONS = 6
export const QUICK_BOOKING_STEP_MINUTES = 5
/** Pixel width of one hour at 100% zoom so a 60-minute card can show name / IN-OUT / course / hotel / status. */
export const TIMELINE_HOUR_WIDTH_PX = 200

export function ceilToInterval(minutes: number, interval: number): number {
  return Math.ceil(minutes / interval) * interval
}

export function floorToInterval(minutes: number, interval: number): number {
  return Math.floor(minutes / interval) * interval
}

/** 30-minute booking-circle starts that still leave room for the minimum course. */
export function buildHalfHourBookingStarts(
  slotStartMinute: number,
  slotEndMinute: number,
  minDurationMinutes: number
): number[] {
  const first = ceilToInterval(slotStartMinute, TIMELINE_BOOKING_INTERVAL_MINUTES)
  const alignedStart = first === slotStartMinute ? slotStartMinute : first
  const starts: number[] = []

  for (
    let minute = alignedStart;
    minute + minDurationMinutes <= slotEndMinute;
    minute += TIMELINE_BOOKING_INTERVAL_MINUTES
  ) {
    starts.push(minute)
  }

  return starts
}

/** Six 5-minute starts inside a :00 or :30 circle (00-25 or 30-55). */
export function buildFiveMinuteWindowStarts(halfHourStartMinute: number): number[] {
  const windowStart = floorToInterval(halfHourStartMinute, TIMELINE_BOOKING_INTERVAL_MINUTES)
  return Array.from(
    { length: QUICK_BOOKING_START_OPTIONS },
    (_, index) => windowStart + index * QUICK_BOOKING_STEP_MINUTES
  )
}

export function fiveMinuteWindowEndMinute(halfHourStartMinute: number): number {
  return (
    floorToInterval(halfHourStartMinute, TIMELINE_BOOKING_INTERVAL_MINUTES) +
    TIMELINE_BOOKING_INTERVAL_MINUTES
  )
}

export function resolveTimelineDisplayRange(
  businessHours: { startMinutes: number; endMinutes: number },
  appointmentRanges: Array<{ startMinutes: number; endMinutes: number }>,
  nowMinutes: number | null
): { startMinutes: number; endMinutes: number } {
  const starts = [
    businessHours.startMinutes,
    ...appointmentRanges.map((range) => range.startMinutes),
    ...(nowMinutes !== null ? [nowMinutes] : []),
  ]
  const ends = [
    businessHours.endMinutes,
    ...appointmentRanges.map((range) => range.endMinutes),
    ...(nowMinutes !== null ? [nowMinutes + 60] : []),
  ]

  return {
    startMinutes: Math.max(
      0,
      floorToInterval(Math.min(...starts), TIMELINE_BOOKING_INTERVAL_MINUTES)
    ),
    endMinutes: ceilToInterval(Math.max(...ends), TIMELINE_BOOKING_INTERVAL_MINUTES),
  }
}

export function mergeNowBookingStart(
  halfHourStarts: number[],
  nowMinutes: number | null,
  slotStartMinute: number,
  slotEndMinute: number,
  minDurationMinutes: number,
  stepMinutes: number
): number[] {
  if (nowMinutes === null) {
    return halfHourStarts
  }

  const snapped = ceilToInterval(nowMinutes, stepMinutes)
  if (snapped < slotStartMinute || snapped + minDurationMinutes > slotEndMinute) {
    return halfHourStarts
  }

  if (halfHourStarts.includes(snapped)) {
    return halfHourStarts
  }

  return [...halfHourStarts, snapped].sort((left, right) => left - right)
}
