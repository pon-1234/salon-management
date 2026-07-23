/**
 * @design_doc   Public schedule availability exposes only anonymous blocked time ranges
 * @related_to   public-schedule.ts and the public schedule API/booking timeline
 * @known_issues Exact blocked start/end times remain public because slot availability requires them
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  castScheduleFindMany: vi.fn(),
  reservationFindMany: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  db: {
    castSchedule: { findMany: mocks.castScheduleFindMany },
    reservation: { findMany: mocks.reservationFindMany },
  },
}))

import { getStoreScheduleDays } from './public-schedule'

describe('getStoreScheduleDays', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.castScheduleFindMany.mockResolvedValue([
      {
        id: 'schedule-1',
        castId: 'cast-1',
        date: new Date('2026-07-20T00:00:00.000Z'),
        startTime: new Date('2026-07-20T01:00:00.000Z'),
        endTime: new Date('2026-07-20T04:00:00.000Z'),
        isAvailable: true,
        cast: { id: 'cast-1', name: 'Alice', images: ['/alice.jpg'] },
      },
    ])
    mocks.reservationFindMany.mockResolvedValue([
      {
        id: 'reservation-secret',
        castId: 'cast-1',
        startTime: new Date('2026-07-20T02:00:00.000Z'),
        endTime: new Date('2026-07-20T03:00:00.000Z'),
        status: 'confirmed',
      },
    ])
  })

  it('returns anonymous blocked time ranges without reservation identifiers or statuses', async () => {
    const days = await getStoreScheduleDays('store-a', {
      startDate: '2026-07-20T00:00:00.000Z',
      days: 1,
    })

    expect(days[0]?.entries[0]?.reservations).toEqual([
      {
        startTime: '2026-07-20T02:00:00.000Z',
        endTime: '2026-07-20T03:00:00.000Z',
      },
    ])
    expect(JSON.stringify(days)).not.toContain('reservation-secret')
    expect(JSON.stringify(days)).not.toContain('confirmed')
    expect(mocks.reservationFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        select: {
          castId: true,
          startTime: true,
          endTime: true,
        },
      })
    )
  })

  it('propagates database failures so callers cannot present unknown availability as open', async () => {
    mocks.castScheduleFindMany.mockRejectedValue(new Error('database unavailable'))

    await expect(
      getStoreScheduleDays('store-a', {
        startDate: '2026-07-20T00:00:00.000Z',
        days: 1,
      })
    ).rejects.toThrow('database unavailable')
  })
})
