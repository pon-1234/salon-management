/**
 * @design_doc   Reservation hotel master and snapshot consistency contract
 * @related_to   Reservation API create/update flows, HotelSettings
 * @known_issues Free-text hotel names intentionally have no HotelSettings relation
 */

export type ReservationHotelErrorCode =
  | 'HOTEL_ID_INVALID'
  | 'HOTEL_NAME_INVALID'
  | 'HOTEL_NOT_AVAILABLE'

export class ReservationHotelError extends Error {
  constructor(
    message: string,
    readonly code: ReservationHotelErrorCode
  ) {
    super(message)
    this.name = 'ReservationHotelError'
  }
}

interface ReservationHotelLookup {
  hotelSettings: {
    findFirst(args: {
      where: { id: string; storeId: string; isActive: true }
      select: { id: true; hotelName: true }
    }): Promise<{ id: string; hotelName: string } | null>
  }
}

interface ReservationHotelRequest {
  storeId: string
  hotelIdSpecified: boolean
  hotelNameSpecified: boolean
  requestedHotelId?: unknown
  requestedHotelName?: unknown
  currentHotelId: string | null
  currentHotelName: string | null
}

export interface ResolvedReservationHotel {
  hotelId: string | null
  hotelName: string | null
}

function normalizeHotelId(value: unknown): string | null {
  if (value === null || value === undefined) return null
  if (typeof value !== 'string') {
    throw new ReservationHotelError('ホテルIDの形式が正しくありません。', 'HOTEL_ID_INVALID')
  }
  return value.trim() || null
}

function normalizeHotelName(value: unknown): string | null {
  if (value === null || value === undefined) return null
  if (typeof value !== 'string') {
    throw new ReservationHotelError('ホテル名の形式が正しくありません。', 'HOTEL_NAME_INVALID')
  }
  return value.trim() || null
}

export async function resolveReservationHotel(
  source: ReservationHotelLookup,
  request: ReservationHotelRequest
): Promise<ResolvedReservationHotel> {
  if (!request.hotelIdSpecified && !request.hotelNameSpecified) {
    return {
      hotelId: request.currentHotelId,
      hotelName: request.currentHotelName,
    }
  }

  if (request.hotelIdSpecified) {
    const hotelId = normalizeHotelId(request.requestedHotelId)
    if (hotelId) {
      const hotel = await source.hotelSettings.findFirst({
        where: { id: hotelId, storeId: request.storeId, isActive: true },
        select: { id: true, hotelName: true },
      })
      if (!hotel) {
        throw new ReservationHotelError(
          '指定されたホテルが存在しないか、現在利用できません。',
          'HOTEL_NOT_AVAILABLE'
        )
      }
      return { hotelId: hotel.id, hotelName: hotel.hotelName }
    }

    return {
      hotelId: null,
      hotelName: request.hotelNameSpecified ? normalizeHotelName(request.requestedHotelName) : null,
    }
  }

  const hotelName = normalizeHotelName(request.requestedHotelName)
  const currentHotelName = normalizeHotelName(request.currentHotelName)
  return {
    hotelId: hotelName === currentHotelName ? request.currentHotelId : null,
    hotelName,
  }
}
