/**
 * @design_doc   Reservation area/station integrity contract
 * @related_to   location-integrity.ts, reservation API create/update flows
 * @known_issues None currently
 */
import { describe, expect, it, vi } from 'vitest'
import { ReservationLocationError, resolveReservationLocation } from './location-integrity'

function lookup(options?: {
  areas?: Record<string, { id: string }>
  stations?: Record<string, { id: string; areaId: string | null }>
}) {
  const areas = options?.areas ?? {}
  const stations = options?.stations ?? {}

  return {
    areaInfo: {
      findFirst: vi.fn(async ({ where }: { where: { id: string } }) => areas[where.id] ?? null),
    },
    stationInfo: {
      findFirst: vi.fn(async ({ where }: { where: { id: string } }) => stations[where.id] ?? null),
    },
  }
}

describe('resolveReservationLocation', () => {
  it('derives the area from a selected station when area is omitted', async () => {
    const source = lookup({
      areas: { 'area-1': { id: 'area-1' } },
      stations: { 'station-1': { id: 'station-1', areaId: 'area-1' } },
    })

    await expect(
      resolveReservationLocation(source, {
        storeId: 'store-1',
        areaSpecified: false,
        stationSpecified: true,
        requestedStationId: 'station-1',
        currentAreaId: null,
        currentStationId: null,
      })
    ).resolves.toEqual({ areaId: 'area-1', stationId: 'station-1' })
    expect(source.stationInfo.findFirst).toHaveBeenCalledWith({
      where: { id: 'station-1', storeId: 'store-1', isActive: true },
      select: { id: true, areaId: true },
    })
    expect(source.areaInfo.findFirst).toHaveBeenCalledWith({
      where: { id: 'area-1', storeId: 'store-1', isActive: true },
      select: { id: true },
    })
  })

  it('rejects an area that does not match the selected station', async () => {
    const source = lookup({
      areas: {
        'area-1': { id: 'area-1' },
        'area-2': { id: 'area-2' },
      },
      stations: { 'station-1': { id: 'station-1', areaId: 'area-1' } },
    })

    await expect(
      resolveReservationLocation(source, {
        storeId: 'store-1',
        areaSpecified: true,
        stationSpecified: true,
        requestedAreaId: 'area-2',
        requestedStationId: 'station-1',
        currentAreaId: null,
        currentStationId: null,
      })
    ).rejects.toMatchObject({
      name: ReservationLocationError.name,
      code: 'AREA_STATION_MISMATCH',
    })
  })

  it('rejects a station that is unavailable in the reservation store', async () => {
    const source = lookup()

    await expect(
      resolveReservationLocation(source, {
        storeId: 'store-1',
        areaSpecified: false,
        stationSpecified: true,
        requestedStationId: 'station-from-other-store',
        currentAreaId: null,
        currentStationId: null,
      })
    ).rejects.toMatchObject({
      name: ReservationLocationError.name,
      code: 'STATION_NOT_AVAILABLE',
    })
  })

  it('validates an area change against the reservation existing station', async () => {
    const source = lookup({
      areas: {
        'area-1': { id: 'area-1' },
        'area-2': { id: 'area-2' },
      },
      stations: { 'station-1': { id: 'station-1', areaId: 'area-1' } },
    })

    await expect(
      resolveReservationLocation(source, {
        storeId: 'store-1',
        areaSpecified: true,
        stationSpecified: false,
        requestedAreaId: 'area-2',
        currentAreaId: 'area-1',
        currentStationId: 'station-1',
      })
    ).rejects.toMatchObject({ code: 'AREA_STATION_MISMATCH' })
  })
})
