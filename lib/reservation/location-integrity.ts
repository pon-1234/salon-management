/**
 * @design_doc   Reservation area/station referential-integrity policy
 * @related_to   Reservation API create/update flows, AreaInfo, StationInfo
 * @known_issues None currently
 */

export type ReservationLocationErrorCode =
  | 'AREA_NOT_AVAILABLE'
  | 'STATION_NOT_AVAILABLE'
  | 'AREA_STATION_MISMATCH'

export class ReservationLocationError extends Error {
  constructor(
    message: string,
    readonly code: ReservationLocationErrorCode
  ) {
    super(message)
    this.name = 'ReservationLocationError'
  }
}

interface ReservationLocationLookup {
  areaInfo: {
    findFirst(args: {
      where: { id: string; storeId: string; isActive: true }
      select: { id: true }
    }): Promise<{ id: string } | null>
  }
  stationInfo: {
    findFirst(args: {
      where: { id: string; storeId: string; isActive: true }
      select: { id: true; areaId: true }
    }): Promise<{ id: string; areaId: string | null } | null>
  }
}

interface ReservationLocationRequest {
  storeId: string
  areaSpecified: boolean
  stationSpecified: boolean
  requestedAreaId?: unknown
  requestedStationId?: unknown
  currentAreaId: string | null
  currentStationId: string | null
}

export interface ResolvedReservationLocation {
  areaId: string | null
  stationId: string | null
}

function normalizeReferenceId(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null
}

export async function resolveReservationLocation(
  source: ReservationLocationLookup,
  request: ReservationLocationRequest
): Promise<ResolvedReservationLocation> {
  const requestedAreaId = request.areaSpecified
    ? normalizeReferenceId(request.requestedAreaId)
    : normalizeReferenceId(request.currentAreaId)
  const stationId = request.stationSpecified
    ? normalizeReferenceId(request.requestedStationId)
    : normalizeReferenceId(request.currentStationId)

  let stationAreaId: string | null = null
  if (stationId) {
    const station = await source.stationInfo.findFirst({
      where: { id: stationId, storeId: request.storeId, isActive: true },
      select: { id: true, areaId: true },
    })
    if (!station) {
      throw new ReservationLocationError(
        '指定された駅が存在しないか、現在利用できません。',
        'STATION_NOT_AVAILABLE'
      )
    }
    stationAreaId = normalizeReferenceId(station.areaId)
  }

  let areaId = requestedAreaId
  if (stationId && request.stationSpecified && !request.areaSpecified) {
    areaId = stationAreaId
  } else if (stationId && areaId !== stationAreaId) {
    throw new ReservationLocationError(
      '指定された駅は選択されたエリアに属していません。',
      'AREA_STATION_MISMATCH'
    )
  }

  if (areaId) {
    const area = await source.areaInfo.findFirst({
      where: { id: areaId, storeId: request.storeId, isActive: true },
      select: { id: true },
    })
    if (!area) {
      throw new ReservationLocationError(
        '指定されたエリアが存在しないか、現在利用できません。',
        'AREA_NOT_AVAILABLE'
      )
    }
  }

  return { areaId, stationId }
}
