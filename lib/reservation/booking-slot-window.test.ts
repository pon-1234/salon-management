/**
 * @design_doc   Admin timeline 30-minute booking circles and 5-minute intake window
 * @related_to   booking-slot-window.ts
 * @known_issues None
 */
import { describe, expect, it } from 'vitest'
import {
  buildFiveMinuteWindowStarts,
  buildHalfHourBookingStarts,
  fiveMinuteWindowEndMinute,
  mergeNowBookingStart,
  resolveTimelineDisplayRange,
} from './booking-slot-window'

describe('booking slot window', () => {
  it('places booking circles on 30-minute marks inside an available slot', () => {
    expect(buildHalfHourBookingStarts(14 * 60, 15 * 60, 10)).toEqual([14 * 60, 14 * 60 + 30])
    expect(buildHalfHourBookingStarts(14 * 60 + 10, 16 * 60, 10)).toEqual([
      14 * 60 + 30,
      15 * 60,
      15 * 60 + 30,
    ])
  })

  it('offers six 5-minute starts from a :00 or :30 circle', () => {
    expect(buildFiveMinuteWindowStarts(10 * 60)).toEqual([
      10 * 60,
      10 * 60 + 5,
      10 * 60 + 10,
      10 * 60 + 15,
      10 * 60 + 20,
      10 * 60 + 25,
    ])
    expect(buildFiveMinuteWindowStarts(10 * 60 + 30)).toEqual([
      10 * 60 + 30,
      10 * 60 + 35,
      10 * 60 + 40,
      10 * 60 + 45,
      10 * 60 + 50,
      10 * 60 + 55,
    ])
  })

  it('keeps the intake window inside the same 30-minute block', () => {
    expect(fiveMinuteWindowEndMinute(10 * 60)).toBe(10 * 60 + 30)
    expect(fiveMinuteWindowEndMinute(10 * 60 + 30)).toBe(11 * 60)
  })

  it('extends the timeline to cover early appointments and after-hours now', () => {
    expect(
      resolveTimelineDisplayRange(
        { startMinutes: 9 * 60, endMinutes: 23 * 60 },
        [{ startMinutes: 8 * 60, endMinutes: 10 * 60 }],
        23 * 60 + 40
      )
    ).toEqual({
      startMinutes: 8 * 60,
      endMinutes: 25 * 60,
    })
  })

  it('extends the timeline to cover early clock-in and midnight clock-out', () => {
    expect(
      resolveTimelineDisplayRange(
        { startMinutes: 10 * 60, endMinutes: 23 * 60 },
        [
          { startMinutes: 8 * 60, endMinutes: 16 * 60 + 30 },
          { startMinutes: 19 * 60, endMinutes: 24 * 60 },
        ],
        null
      )
    ).toEqual({
      startMinutes: 8 * 60,
      endMinutes: 24 * 60,
    })
  })

  it('adds a current-time booking start between half-hour circles', () => {
    expect(
      mergeNowBookingStart([17 * 60, 17 * 60 + 30], 17 * 60 + 7, 17 * 60, 19 * 60, 10, 5)
    ).toEqual([17 * 60, 17 * 60 + 10, 17 * 60 + 30])
  })
})
