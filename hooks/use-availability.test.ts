/**
 * @design_doc   Availability hook must generate API-valid reservation start boundaries
 * @related_to   use-availability.ts and reservation availability route
 * @known_issues None
 */
import { renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { BusinessHoursRange } from '@/lib/settings/business-hours'
import { useAvailability } from './use-availability'

vi.mock('@/contexts/store-context', () => ({
  useStore: () => ({ currentStore: { id: 'store-1' } }),
}))

const range = (
  startMinutes: number,
  endMinutes: number,
  startLabel: string,
  endLabel: string
): BusinessHoursRange => ({ startMinutes, endMinutes, startLabel, endLabel })

describe('useAvailability generateTimeSlots', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('offers only complete minimum-course slots inside fractional business hours', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2099-01-19T00:00:00.000Z'))
    const { result } = renderHook(() => useAvailability())

    expect(
      result.current.generateTimeSlots(
        '2099-01-20',
        60,
        range(11 * 60 + 10, 12 * 60 + 40, '11:10', '12:40')
      )
    ).toEqual([
      {
        startTime: '2099-01-20T02:10:00.000Z',
        endTime: '2099-01-20T03:10:00.000Z',
      },
      {
        startTime: '2099-01-20T02:20:00.000Z',
        endTime: '2099-01-20T03:20:00.000Z',
      },
      {
        startTime: '2099-01-20T02:30:00.000Z',
        endTime: '2099-01-20T03:30:00.000Z',
      },
      {
        startTime: '2099-01-20T02:40:00.000Z',
        endTime: '2099-01-20T03:40:00.000Z',
      },
    ])
  })

  it('preserves complete aligned minimum-course slots across midnight', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2099-01-19T00:00:00.000Z'))
    const { result } = renderHook(() => useAvailability())

    expect(
      result.current.generateTimeSlots(
        '2099-01-20',
        60,
        range(23 * 60 + 10, 24 * 60 + 100, '23:10', '01:40')
      )
    ).toEqual([
      {
        startTime: '2099-01-20T14:10:00.000Z',
        endTime: '2099-01-20T15:10:00.000Z',
      },
      {
        startTime: '2099-01-20T14:20:00.000Z',
        endTime: '2099-01-20T15:20:00.000Z',
      },
      {
        startTime: '2099-01-20T14:30:00.000Z',
        endTime: '2099-01-20T15:30:00.000Z',
      },
      {
        startTime: '2099-01-20T14:40:00.000Z',
        endTime: '2099-01-20T15:40:00.000Z',
      },
      {
        startTime: '2099-01-20T14:50:00.000Z',
        endTime: '2099-01-20T15:50:00.000Z',
      },
      {
        startTime: '2099-01-20T15:00:00.000Z',
        endTime: '2099-01-20T16:00:00.000Z',
      },
      {
        startTime: '2099-01-20T15:10:00.000Z',
        endTime: '2099-01-20T16:10:00.000Z',
      },
      {
        startTime: '2099-01-20T15:20:00.000Z',
        endTime: '2099-01-20T16:20:00.000Z',
      },
      {
        startTime: '2099-01-20T15:30:00.000Z',
        endTime: '2099-01-20T16:30:00.000Z',
      },
      {
        startTime: '2099-01-20T15:40:00.000Z',
        endTime: '2099-01-20T16:40:00.000Z',
      },
    ])
  })
})
