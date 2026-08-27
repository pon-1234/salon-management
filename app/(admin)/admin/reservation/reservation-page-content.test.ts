/**
 * @design_doc   Admin reservation timeline data completeness and JST day-boundary contract
 * @related_to   ReservationPageContent and the paginated reservation/cast-schedule APIs
 * @known_issues None
 */
import { describe, expect, it, vi } from 'vitest'
import type { Reservation } from '@/lib/types/reservation'
import {
  applyReservationUpdate,
  applyReservationUpdateToCasts,
  buildCastListEndpoint,
  buildJstDayQueryRange,
  getActiveReservationData,
  indexSchedulesForJstDay,
  acceptStoreScopedResponse,
  loadReservationsForJstDay,
  refreshReservationTimeline,
} from './reservation-page-content'
import type { ReservationData } from '@/lib/types/reservation'
import type { Cast } from '@/lib/cast/types'

const reservation = (id: string): Reservation =>
  ({
    id,
    customerId: `customer-${id}`,
    staffId: 'cast-1',
    serviceId: 'course-1',
    storeId: 'uat-ikebukuro',
    startTime: new Date('2026-08-14T10:00:00+09:00'),
    endTime: new Date('2026-08-14T11:00:00+09:00'),
    status: 'confirmed',
    price: 10_000,
    createdAt: new Date('2026-08-01T00:00:00+09:00'),
    updatedAt: new Date('2026-08-01T00:00:00+09:00'),
  }) as Reservation

describe('reservation timeline data loading', () => {
  it('accepts an empty result for the active store so the previous customer list is cleared', () => {
    const activeRequest = { storeId: 'ikebukuro', generation: 2 }

    expect(acceptStoreScopedResponse(activeRequest, activeRequest, [])).toEqual([])
  })

  it('rejects delayed cast and reservation results from an older store request generation', () => {
    const staleRequest = { storeId: 'ikebukuro', generation: 3 }

    expect(
      acceptStoreScopedResponse(staleRequest, { storeId: 'shinjuku', generation: 4 }, [
        { id: 'ikebukuro-cast' },
      ])
    ).toBeUndefined()
    expect(
      acceptStoreScopedResponse(staleRequest, { storeId: 'ikebukuro', generation: 4 }, [
        { id: 'older-reservation' },
      ])
    ).toBeUndefined()
  })

  it('keeps a confirmed update visible while removing a cancelled update immediately', () => {
    const confirmed = {
      id: 'reservation-1',
      status: 'pending',
      customerName: '予約顧客',
    } as ReservationData
    const another = {
      id: 'reservation-2',
      status: 'confirmed',
      customerName: '別の顧客',
    } as ReservationData

    const afterConfirmation = applyReservationUpdate([confirmed, another], {
      ...confirmed,
      status: 'confirmed',
    })
    expect(afterConfirmation).toEqual([
      expect.objectContaining({ id: 'reservation-1', status: 'confirmed' }),
      another,
    ])

    const afterCancellation = applyReservationUpdate(afterConfirmation, {
      ...confirmed,
      status: 'cancelled',
      cancellationReason: 'お客様都合',
    })
    expect(afterCancellation).toEqual([another])
  })

  it('updates the timeline block on confirmation and removes it on cancellation', () => {
    const pending = {
      id: 'reservation-1',
      staffId: 'cast-1',
      status: 'pending',
      customerId: 'customer-1',
      customerName: '予約顧客',
      course: '通常コース',
      startTime: new Date('2026-08-14T10:00:00+09:00'),
      endTime: new Date('2026-08-14T11:00:00+09:00'),
      totalPayment: 20_000,
    } as ReservationData
    const casts = [
      {
        id: 'cast-1',
        appointments: [
          {
            id: pending.id,
            staffId: 'cast-1',
            status: 'provisional',
            startTime: pending.startTime,
            endTime: pending.endTime,
          },
        ],
      },
    ] as Cast[]

    const confirmedCasts = applyReservationUpdateToCasts(casts, {
      ...pending,
      status: 'confirmed',
    })
    expect(confirmedCasts[0]?.appointments).toEqual([
      expect.objectContaining({ id: pending.id, status: 'confirmed' }),
    ])

    const cancelledCasts = applyReservationUpdateToCasts(confirmedCasts, {
      ...pending,
      status: 'cancelled',
      cancellationReason: 'お客様都合',
    })
    expect(cancelledCasts[0]?.appointments).toEqual([])
  })

  it('never exposes cancelled reservations in the normal timeline list', () => {
    const active = { id: 'active', status: 'confirmed' } as ReservationData
    const cancelled = { id: 'cancelled', status: 'cancelled' } as ReservationData

    expect(getActiveReservationData([active, cancelled])).toEqual([active])
  })

  it('requests the complete cast page allowed by the cast API', () => {
    expect(buildCastListEndpoint('uat-ikebukuro')).toBe('/api/cast?storeId=uat-ikebukuro&limit=100')
  })

  it('reloads cast master data as well as reservations when the timeline is refreshed', async () => {
    const reloadCasts = vi.fn().mockResolvedValue(undefined)
    const reloadReservations = vi.fn().mockResolvedValue([])

    await refreshReservationTimeline({ reloadCasts, reloadReservations })

    expect(reloadCasts).toHaveBeenCalledOnce()
    expect(reloadReservations).toHaveBeenCalledOnce()
  })

  it('builds an inclusive API range for exactly one JST calendar day', () => {
    expect(buildJstDayQueryRange('2026-08-14')).toEqual({
      startDate: '2026-08-13T15:00:00.000Z',
      endDate: '2026-08-14T14:59:59.999Z',
    })
  })

  it('loads every 100-row reservation page for the selected JST day', async () => {
    const firstPage = Array.from({ length: 100 }, (_, index) => reservation(String(index)))
    const secondPage = [reservation('100'), reservation('101')]
    const fetchPage = vi.fn().mockResolvedValueOnce(firstPage).mockResolvedValueOnce(secondPage)

    const result = await loadReservationsForJstDay({
      storeId: 'uat-ikebukuro',
      dateKey: '2026-08-14',
      fetchPage,
    })

    expect(result).toHaveLength(102)
    expect(fetchPage).toHaveBeenNthCalledWith(1, {
      storeId: 'uat-ikebukuro',
      startDate: '2026-08-13T15:00:00.000Z',
      endDate: '2026-08-14T14:59:59.999Z',
      limit: 100,
      offset: 0,
    })
    expect(fetchPage).toHaveBeenNthCalledWith(2, {
      storeId: 'uat-ikebukuro',
      startDate: '2026-08-13T15:00:00.000Z',
      endDate: '2026-08-14T14:59:59.999Z',
      limit: 100,
      offset: 100,
    })
  })

  it('indexes only schedules belonging to the selected JST day', () => {
    const selectedDay = {
      castId: 'cast-1',
      date: '2026-08-13T15:00:00.000Z',
      startTime: '2026-08-14T05:00:00.000Z',
      endTime: '2026-08-14T15:00:00.000Z',
      isAvailable: true,
    }
    const nextDay = {
      castId: 'cast-1',
      date: '2026-08-14T15:00:00.000Z',
      startTime: '2026-08-15T03:00:00.000Z',
      endTime: '2026-08-15T12:00:00.000Z',
      isAvailable: true,
    }

    const indexed = indexSchedulesForJstDay([selectedDay, nextDay], '2026-08-14')

    expect(indexed.size).toBe(1)
    expect(indexed.get('cast-1')).toBe(selectedDay)
  })
})
