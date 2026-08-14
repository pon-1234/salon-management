/**
 * @design_doc   docs/LEGACY_GOLD_ADMIN_MIGRATION_INVENTORY.md admin dashboard mapping
 * @related_to   DashboardPage reservation pagination and JST period calculations
 * @known_issues None currently
 */
import { describe, expect, it, vi } from 'vitest'
import type { Reservation } from '@/lib/types/reservation'
import {
  fetchAllDashboardReservations,
  getJstPeriodBounds,
  sumActiveReservationRevenue,
} from './dashboard.utils'

function reservation(id: string, status: Reservation['status'], price: number): Reservation {
  return {
    id,
    customerId: `customer-${id}`,
    staffId: `cast-${id}`,
    serviceId: `course-${id}`,
    storeId: 'ikebukuro',
    startTime: new Date('2026-08-15T03:00:00.000Z'),
    endTime: new Date('2026-08-15T04:00:00.000Z'),
    status,
    price,
    createdAt: new Date('2026-08-01T00:00:00.000Z'),
    updatedAt: new Date('2026-08-01T00:00:00.000Z'),
  }
}

describe('dashboard JST data boundaries', () => {
  it('builds today from the Tokyo calendar even when UTC is on the previous date', () => {
    const now = new Date('2026-08-14T16:30:00.000Z')

    expect(getJstPeriodBounds('today', now)).toEqual({
      start: new Date('2026-08-14T15:00:00.000Z'),
      endExclusive: new Date('2026-08-15T15:00:00.000Z'),
    })
  })

  it('loads every page inside the requested store and date window', async () => {
    const firstPage = Array.from({ length: 100 }, (_, index) =>
      reservation(`reservation-${index}`, 'confirmed', 10_000)
    )
    const secondPage = [
      reservation('reservation-100', 'confirmed', 10_000),
      reservation('reservation-101', 'pending', 10_000),
    ]
    const fetchPage = vi.fn().mockResolvedValueOnce(firstPage).mockResolvedValueOnce(secondPage)

    const result = await fetchAllDashboardReservations({
      storeId: 'ikebukuro',
      start: new Date('2026-08-01T15:00:00.000Z'),
      endExclusive: new Date('2026-09-01T15:00:00.000Z'),
      fetchPage,
    })

    expect(result).toHaveLength(102)
    expect(fetchPage).toHaveBeenNthCalledWith(1, {
      storeId: 'ikebukuro',
      startDate: '2026-08-01T15:00:00.000Z',
      endDate: '2026-09-01T15:00:00.000Z',
      limit: 100,
      offset: 0,
    })
    expect(fetchPage).toHaveBeenNthCalledWith(2, {
      storeId: 'ikebukuro',
      startDate: '2026-08-01T15:00:00.000Z',
      endDate: '2026-09-01T15:00:00.000Z',
      limit: 100,
      offset: 100,
    })
  })

  it('never includes cancelled orders in dashboard revenue', () => {
    expect(
      sumActiveReservationRevenue([
        reservation('active', 'confirmed', 12_000),
        reservation('cancelled', 'cancelled', 99_000),
      ])
    ).toBe(12_000)
  })
})
