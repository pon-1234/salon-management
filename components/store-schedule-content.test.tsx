/**
 * @design_doc   Public storefront schedule booking-slot boundary contract
 * @related_to   StoreScheduleContent and the reservation API start-time validation
 * @known_issues Slot duration is fixed at thirty minutes
 */
import { describe, expect, it } from 'vitest'
import type { PublicCastSchedule } from '@/lib/store/public-schedule'
import { buildTimelineSlots } from './store-schedule-content'

const legacyOffsetSchedule: PublicCastSchedule = {
  id: 'schedule-legacy-offset',
  castId: 'cast-legacy-offset',
  date: '2099-01-20T00:00:00+09:00',
  startTime: '2099-01-20T11:10:00+09:00',
  endTime: '2099-01-20T12:10:00+09:00',
  isAvailable: true,
  reservations: [],
  cast: {
    id: 'cast-legacy-offset',
    name: '端数開始キャスト',
    age: null,
    height: null,
    bust: null,
    waist: null,
    hip: null,
    type: null,
    image: null,
    images: [],
    panelDesignationRank: 0,
    workStatus: '出勤',
  },
}

describe('StoreScheduleContent booking slots', () => {
  it('starts public booking links at the next reservation start boundary', () => {
    const slots = buildTimelineSlots(legacyOffsetSchedule)

    expect(slots.map((slot) => slot.startIso)).toEqual([
      '2099-01-20T02:10:00.000Z',
      '2099-01-20T02:40:00.000Z',
    ])
  })
})
