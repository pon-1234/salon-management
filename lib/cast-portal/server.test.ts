/**
 * @design_doc   Store-scoped JST settlement reporting contract
 * @related_to   server.ts - completed reservation settlement aggregation
 * @known_issues Uses mocked Prisma calls; migration deployment is verified separately
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { db } from '@/lib/db'

import { getCastSettlements } from './server'

describe('getCastSettlements', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-14T03:00:00.000Z'))
    vi.mocked(db.reservation.findMany).mockResolvedValue([])
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('loads only completed reservations in the half-open JST month for one cast and store', async () => {
    await getCastSettlements('cast-1', 'ikebukuro')

    expect(db.reservation.findMany).toHaveBeenCalledTimes(1)
    expect(db.reservation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          castId: 'cast-1',
          storeId: 'ikebukuro',
          status: 'completed',
          startTime: {
            gte: new Date('2026-07-31T15:00:00.000Z'),
            lt: new Date('2026-08-31T15:00:00.000Z'),
          },
        },
        orderBy: { startTime: 'desc' },
      })
    )
  })

  it('propagates database failures so the UI cannot mistake an error for no settlement data', async () => {
    vi.mocked(db.reservation.findMany).mockRejectedValue(new Error('database unavailable'))

    await expect(getCastSettlements('cast-1', 'ikebukuro')).rejects.toThrow('database unavailable')
  })
})
