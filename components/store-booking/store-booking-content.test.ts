/**
 * @design_doc   Public booking choices must honor the reservation start-time boundary
 * @related_to   StoreBookingContent and the public reservation availability response
 * @known_issues None
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildTimeSlotChoices } from './store-booking-content'

describe('StoreBookingContent time-slot choices', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('offers only complete minimum-course slots inside fractional range boundaries', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2099-01-19T00:00:00.000Z'))

    expect(
      buildTimeSlotChoices(
        [
          {
            startTime: '2099-01-20T11:10:00+09:00',
            endTime: '2099-01-20T12:40:00+09:00',
          },
        ],
        60
      )
    ).toEqual([
      {
        start: '2099-01-20T02:30:00.000Z',
        end: '2099-01-20T03:30:00.000Z',
        label: '11:30 - 12:30',
        dayLabel: '1月20日(火)',
      },
    ])
  })

  it('keeps aligned complete minimum-course slots across midnight', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2099-01-19T00:00:00.000Z'))

    expect(
      buildTimeSlotChoices(
        [
          {
            startTime: '2099-01-20T23:10:00+09:00',
            endTime: '2099-01-21T01:40:00+09:00',
          },
        ],
        60
      ).map(({ start, end }) => ({ start, end }))
    ).toEqual([
      {
        start: '2099-01-20T14:30:00.000Z',
        end: '2099-01-20T15:30:00.000Z',
      },
      {
        start: '2099-01-20T15:00:00.000Z',
        end: '2099-01-20T16:00:00.000Z',
      },
      {
        start: '2099-01-20T15:30:00.000Z',
        end: '2099-01-20T16:30:00.000Z',
      },
    ])
  })
})
