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

    const slots = buildTimeSlotChoices(
      [
        {
          startTime: '2099-01-20T11:10:00+09:00',
          endTime: '2099-01-20T12:40:00+09:00',
        },
      ],
      60
    )

    expect(slots).toHaveLength(7)
    expect(slots[0]).toEqual({
      start: '2099-01-20T02:10:00.000Z',
      end: '2099-01-20T03:10:00.000Z',
      label: '11:10 - 12:10',
      dayLabel: '1月20日(火)',
    })
    expect(slots.at(-1)).toEqual({
      start: '2099-01-20T02:40:00.000Z',
      end: '2099-01-20T03:40:00.000Z',
      label: '11:40 - 12:40',
      dayLabel: '1月20日(火)',
    })
  })

  it('keeps aligned complete minimum-course slots across midnight', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2099-01-19T00:00:00.000Z'))

    const slots = buildTimeSlotChoices(
      [
        {
          startTime: '2099-01-20T23:10:00+09:00',
          endTime: '2099-01-21T01:40:00+09:00',
        },
      ],
      60
    ).map(({ start, end }) => ({ start, end }))

    expect(slots).toHaveLength(19)
    expect(slots[0]).toEqual({
      start: '2099-01-20T14:10:00.000Z',
      end: '2099-01-20T15:10:00.000Z',
    })
    expect(slots.at(-1)).toEqual({
      start: '2099-01-20T15:40:00.000Z',
      end: '2099-01-20T16:40:00.000Z',
    })
    expect(
      slots.slice(1).every((slot, index) => {
        const previous = slots[index]
        return new Date(slot.start).getTime() - new Date(previous.start).getTime() === 300_000
      })
    ).toBe(true)
  })
})
