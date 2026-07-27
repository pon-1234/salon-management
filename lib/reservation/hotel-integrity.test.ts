/**
 * @design_doc   Reservation hotel master and snapshot consistency contract
 * @related_to   hotel-integrity.ts; reservation POST/PUT; entry-info updates
 * @known_issues Free-text hotel names intentionally have no HotelSettings relation
 */
import { describe, expect, it, vi } from 'vitest'

import { ReservationHotelError, resolveReservationHotel } from './hotel-integrity'

function database(hotel: { id: string; hotelName: string } | null = null) {
  return {
    hotelSettings: {
      findFirst: vi.fn().mockResolvedValue(hotel),
    },
  }
}

describe('resolveReservationHotel', () => {
  it('resolves an active hotel in the reservation store and uses its canonical name', async () => {
    const db = database({ id: 'hotel-1', hotelName: '正規ホテル名' })

    await expect(
      resolveReservationHotel(db, {
        storeId: 'ikebukuro',
        hotelIdSpecified: true,
        hotelNameSpecified: true,
        requestedHotelId: ' hotel-1 ',
        requestedHotelName: '改ざんされた名前',
        currentHotelId: null,
        currentHotelName: null,
      })
    ).resolves.toEqual({ hotelId: 'hotel-1', hotelName: '正規ホテル名' })
    expect(db.hotelSettings.findFirst).toHaveBeenCalledWith({
      where: { id: 'hotel-1', storeId: 'ikebukuro', isActive: true },
      select: { id: true, hotelName: true },
    })
  })

  it('rejects an unknown, inactive, or cross-store hotel without guessing a name', async () => {
    const db = database(null)

    await expect(
      resolveReservationHotel(db, {
        storeId: 'ikebukuro',
        hotelIdSpecified: true,
        hotelNameSpecified: false,
        requestedHotelId: 'other-store-hotel',
        requestedHotelName: undefined,
        currentHotelId: null,
        currentHotelName: null,
      })
    ).rejects.toMatchObject({
      code: 'HOTEL_NOT_AVAILABLE',
    })
  })

  it('clears the relation when a free-text hotel name is entered', async () => {
    const db = database()

    await expect(
      resolveReservationHotel(db, {
        storeId: 'ikebukuro',
        hotelIdSpecified: false,
        hotelNameSpecified: true,
        requestedHotelId: undefined,
        requestedHotelName: '  当日手入力ホテル  ',
        currentHotelId: 'hotel-old',
        currentHotelName: '旧ホテル',
      })
    ).resolves.toEqual({ hotelId: null, hotelName: '当日手入力ホテル' })
    expect(db.hotelSettings.findFirst).not.toHaveBeenCalled()
  })

  it('preserves the relation when an existing form submits the unchanged canonical name', async () => {
    const db = database()

    await expect(
      resolveReservationHotel(db, {
        storeId: 'ikebukuro',
        hotelIdSpecified: false,
        hotelNameSpecified: true,
        requestedHotelId: undefined,
        requestedHotelName: '  旧ホテル  ',
        currentHotelId: 'hotel-old',
        currentHotelName: '旧ホテル',
      })
    ).resolves.toEqual({ hotelId: 'hotel-old', hotelName: '旧ホテル' })
  })

  it('clears both values when the relation is explicitly cleared without a free-text name', async () => {
    const db = database()

    await expect(
      resolveReservationHotel(db, {
        storeId: 'ikebukuro',
        hotelIdSpecified: true,
        hotelNameSpecified: false,
        requestedHotelId: null,
        requestedHotelName: undefined,
        currentHotelId: 'hotel-old',
        currentHotelName: '旧ホテル',
      })
    ).resolves.toEqual({ hotelId: null, hotelName: null })
  })

  it('preserves both values when neither hotel field is being updated', async () => {
    const db = database()

    await expect(
      resolveReservationHotel(db, {
        storeId: 'ikebukuro',
        hotelIdSpecified: false,
        hotelNameSpecified: false,
        requestedHotelId: undefined,
        requestedHotelName: undefined,
        currentHotelId: 'hotel-old',
        currentHotelName: '旧ホテル',
      })
    ).resolves.toEqual({ hotelId: 'hotel-old', hotelName: '旧ホテル' })
  })

  it('rejects malformed hotel IDs', async () => {
    const db = database()

    await expect(
      resolveReservationHotel(db, {
        storeId: 'ikebukuro',
        hotelIdSpecified: true,
        hotelNameSpecified: false,
        requestedHotelId: 123,
        requestedHotelName: undefined,
        currentHotelId: null,
        currentHotelName: null,
      })
    ).rejects.toMatchObject({ code: 'HOTEL_ID_INVALID' })
    expect(db.hotelSettings.findFirst).not.toHaveBeenCalled()
  })

  it('rejects malformed free-text hotel names', async () => {
    const db = database()

    await expect(
      resolveReservationHotel(db, {
        storeId: 'ikebukuro',
        hotelIdSpecified: false,
        hotelNameSpecified: true,
        requestedHotelId: undefined,
        requestedHotelName: 123,
        currentHotelId: null,
        currentHotelName: null,
      })
    ).rejects.toMatchObject({ code: 'HOTEL_NAME_INVALID' })
  })
})
