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
})
