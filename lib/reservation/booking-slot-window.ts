/**
 * @design_doc   Admin timeline 30-minute booking circles and 5-minute intake window
 * @related_to   Timeline, QuickBookingDialog, TimeSlotPicker
 * @known_issues None
 */

export const TIMELINE_BOOKING_INTERVAL_MINUTES = 30
export const QUICK_BOOKING_START_OPTIONS = 6
export const QUICK_BOOKING_STEP_MINUTES = 5

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
