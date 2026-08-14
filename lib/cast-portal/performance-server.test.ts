/**
 * @design_doc   Cast portal performance snapshot supplies a server-authorized detailed report
 * @related_to   getCastPerformanceSnapshot and getCastPerformanceReport
 * @known_issues Ranking queries remain separate from the detailed completed-reservation report
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { CastPerformanceReport } from '@/lib/types/cast-performance'

const mocks = vi.hoisted(() => ({
  castFindFirst: vi.fn(),
  castFindMany: vi.fn(),
  reservationGroupBy: vi.fn(),
  getCastPerformanceReport: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  db: {
    cast: { findFirst: mocks.castFindFirst, findMany: mocks.castFindMany },
    reservation: { groupBy: mocks.reservationGroupBy },
  },
}))

vi.mock('@/lib/analytics/server/cast-performance', () => ({
  getCastPerformanceReport: mocks.getCastPerformanceReport,
}))

import { getCastPerformanceSnapshot } from './server'

describe('getCastPerformanceSnapshot detailed report', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-14T03:00:00.000Z'))
    mocks.castFindFirst.mockResolvedValue({
      id: 'cast-1',
      name: '池袋キャスト',
      storeId: 'ikebukuro',
      store: { name: '池袋' },
    })
    mocks.castFindMany.mockResolvedValue([{ id: 'cast-1' }])
    mocks.reservationGroupBy.mockResolvedValue([])
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('loads the same cast/store report on the server and includes it in portal props', async () => {
    const performance = {
      cast: { id: 'cast-1', name: '池袋キャスト' },
      period: { year: 2026, month: 8, timeZone: 'Asia/Tokyo' },
    } as CastPerformanceReport
    mocks.getCastPerformanceReport.mockResolvedValueOnce(performance)

    const snapshot = await getCastPerformanceSnapshot('cast-1', 'ikebukuro')

    expect(mocks.getCastPerformanceReport).toHaveBeenCalledWith(2026, 8, 'cast-1', 'ikebukuro')
    expect(snapshot.performance).toBe(performance)
  })
})
