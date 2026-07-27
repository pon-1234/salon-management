/**
 * @design_doc   Reservation API records must retain every editable value in the admin dialog model
 * @related_to   mapReservationToReservationData, ReservationDialog, reservation-list page
 * @known_issues None
 */
import { describe, expect, it } from 'vitest'
import { mapReservationToReservationData } from './transformers'
import type { Reservation } from '@/lib/types/reservation'

describe('mapReservationToReservationData', () => {
  const createReservation = (
    overrides: Partial<Reservation> & Record<string, unknown> = {}
  ): Reservation =>
    ({
      id: 'reservation-1',
      customerId: 'customer-1',
      staffId: 'cast-1',
      castId: 'cast-1',
      serviceId: '',
      startTime: new Date('2026-07-21T10:00:00+09:00'),
      endTime: new Date('2026-07-21T11:30:00+09:00'),
      status: 'confirmed',
      price: 30_000,
      storeId: 'ikebukuro',
      createdAt: new Date('2026-07-20T00:00:00+09:00'),
      updatedAt: new Date('2026-07-20T00:00:00+09:00'),
      ...overrides,
    }) as Reservation

  it('preserves editable financial, hotel, memo, point, and dynamic designation values', () => {
    const reservation: Reservation & { storeMemo: string } = {
      id: 'reservation-1',
      customerId: 'customer-1',
      staffId: 'cast-1',
      castId: 'cast-1',
      serviceId: 'course-1',
      courseId: 'course-1',
      startTime: new Date('2026-07-21T10:00:00+09:00'),
      endTime: new Date('2026-07-21T11:30:00+09:00'),
      status: 'confirmed',
      price: 30_000,
      storeId: 'ikebukuro',
      designationType: 'プレミア指名',
      discountAmount: 1_500,
      welfareExpense: 1_200,
      hotelId: 'hotel-1',
      hotelName: '池袋グランドホテル',
      hotelExpense: 3_500,
      pointsUsed: 500,
      storeMemo: '電話受付済み',
      createdAt: new Date('2026-07-20T00:00:00+09:00'),
      updatedAt: new Date('2026-07-20T00:00:00+09:00'),
    }

    const result = mapReservationToReservationData(reservation, { customers: [] })

    expect(result).toMatchObject({
      designation: 'プレミア指名',
      discountAmount: 1_500,
      welfareExpense: 1_200,
      hotelId: 'hotel-1',
      hotelName: '池袋グランドホテル',
      hotelExpense: 3_500,
      pointsUsed: 500,
      storeMemo: '電話受付済み',
    })
  })

  it('maps nested database course, area, and station relations when flat fields are absent', () => {
    const reservation = createReservation({
      course: {
        id: 'course-db-1',
        name: '池袋ゴールド120分',
      },
      area: {
        id: 'area-db-1',
        name: '池袋エリア',
        prefecture: '東京都',
        city: '豊島区',
      },
      station: {
        id: 'station-db-1',
        name: '池袋駅',
        travelTime: 12,
      },
    })

    const result = mapReservationToReservationData(reservation, { customers: [] })

    expect(result).toMatchObject({
      serviceId: 'course-db-1',
      course: '池袋ゴールド120分',
      areaId: 'area-db-1',
      areaName: '池袋エリア',
      prefecture: '東京都',
      district: '豊島区',
      location: '池袋エリア',
      stationId: 'station-db-1',
      stationName: '池袋駅',
      stationTravelTime: 12,
    })
  })

  it('keeps supporting and prioritizing flat course, area, and station fields', () => {
    const reservation = createReservation({
      serviceId: 'course-flat-1',
      serviceName: 'フラット90分',
      areaId: 'area-flat-1',
      areaName: 'フラットエリア',
      areaPrefecture: '埼玉県',
      areaCity: 'さいたま市',
      stationId: 'station-flat-1',
      stationName: '大宮駅',
      stationTravelTime: 7,
      course: { id: 'course-db-1', name: 'ネストコース' },
      area: {
        id: 'area-db-1',
        name: 'ネストエリア',
        prefecture: '東京都',
        city: '豊島区',
      },
      station: { id: 'station-db-1', name: '池袋駅', travelTime: 12 },
    })

    const result = mapReservationToReservationData(reservation, { customers: [] })

    expect(result).toMatchObject({
      serviceId: 'course-flat-1',
      course: 'フラット90分',
      areaId: 'area-flat-1',
      areaName: 'フラットエリア',
      prefecture: '埼玉県',
      district: 'さいたま市',
      location: 'フラットエリア',
      stationId: 'station-flat-1',
      stationName: '大宮駅',
      stationTravelTime: 7,
    })
  })
})
