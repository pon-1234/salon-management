/**
 * @design_doc   Reservation start-time boundary shared by booking UIs and the reservation API
 * @related_to   time-boundary.ts and all reservation slot generators
 * @known_issues None
 */
import { describe, expect, it } from 'vitest'
import {
  ceilReservationStartDate,
  ceilReservationStartMinutes,
  isReservationStartBoundary,
} from './time-boundary'

describe('reservation start-time boundary', () => {
  it('accepts only exact 00/30 minute instants', () => {
    expect(isReservationStartBoundary(new Date('2099-01-01T12:00:00.000Z'))).toBe(true)
    expect(isReservationStartBoundary(new Date('2099-01-01T12:30:00.000Z'))).toBe(true)
    expect(isReservationStartBoundary(new Date('2099-01-01T12:10:00.000Z'))).toBe(false)
    expect(isReservationStartBoundary(new Date('2099-01-01T12:30:01.000Z'))).toBe(false)
  })

  it('rounds minute counts up to the next boundary without moving aligned values', () => {
    expect(ceilReservationStartMinutes(9 * 60 + 10)).toBe(9 * 60 + 30)
    expect(ceilReservationStartMinutes(9 * 60 + 30)).toBe(9 * 60 + 30)
  })

  it('rounds an available range start up to the next boundary', () => {
    expect(ceilReservationStartDate(new Date('2099-01-01T12:10:00.000Z')).toISOString()).toBe(
      '2099-01-01T12:30:00.000Z'
    )
    expect(ceilReservationStartDate(new Date('2099-01-01T12:30:00.000Z')).toISOString()).toBe(
      '2099-01-01T12:30:00.000Z'
    )
  })
})
