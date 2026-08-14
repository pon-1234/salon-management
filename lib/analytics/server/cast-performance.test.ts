/**
 * @design_doc   Accurate cast-scoped completed-reservation analytics contract
 * @related_to   getCastPerformanceReport and the cast performance API
 * @known_issues Uses mocked Prisma rows; database indexes are verified separately
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { db } from '@/lib/db'

import { getCastPerformanceReport, getJstMonthRange } from './cast-performance'

const reservation = (
  overrides: Partial<{
    id: string
    customerId: string
    startTime: Date
    price: number
    staffRevenue: number | null
    storeRevenue: number | null
    paymentMethod: string | null
    designationType: string | null
    marketingChannel: string | null
    courseId: string
    course: { id: string; name: string } | null
    options: Array<{ optionId: string; optionName: string; optionPrice: number }>
  }> = {}
) => ({
  id: 'reservation-1',
  customerId: 'customer-a',
  startTime: new Date('2026-08-05T03:00:00.000Z'),
  price: 10_000,
  staffRevenue: 6_000 as number | null,
  storeRevenue: 4_000 as number | null,
  paymentMethod: '現金' as string | null,
  designationType: 'regular' as string | null,
  marketingChannel: 'Hime予約' as string | null,
  courseId: 'course-1',
  course: { id: 'course-1', name: '120分' } as { id: string; name: string } | null,
  options: [] as Array<{ optionId: string; optionName: string; optionPrice: number }>,
  ...overrides,
})

describe('getCastPerformanceReport', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(db.reservation.findMany).mockReset()
    vi.mocked(db.cast.findFirst).mockResolvedValue({ id: 'cast-1', name: '池袋キャスト' } as never)
  })

  it('queries one store and cast with a half-open JST month and completed status only', async () => {
    vi.mocked(db.reservation.findMany).mockResolvedValueOnce([])

    await getCastPerformanceReport(2026, 8, 'cast-1', 'ikebukuro')

    expect(db.cast.findFirst).toHaveBeenCalledWith({
      where: { id: 'cast-1', storeId: 'ikebukuro' },
      select: { id: true, name: true },
    })
    expect(db.reservation.findMany).toHaveBeenNthCalledWith(
      1,
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
      })
    )
  })

  it('aggregates courses, options, lifecycle, designation, and marketing without guessing legacy media', async () => {
    const currentReservations = [
      reservation({
        id: 'reservation-a-first',
        options: [{ optionId: 'option-1', optionName: '衣装', optionPrice: 1_000 }],
      }),
      reservation({
        id: 'reservation-a-repeat',
        startTime: new Date('2026-08-10T03:00:00.000Z'),
        price: 20_000,
        staffRevenue: 12_000,
        storeRevenue: 8_000,
        paymentMethod: 'クレジットカード',
        designationType: 'panel',
        marketingChannel: '旧システム media:4',
        options: [{ optionId: 'option-1', optionName: '衣装', optionPrice: 2_000 }],
      }),
      reservation({
        id: 'reservation-b-first',
        customerId: 'customer-b',
        startTime: new Date('2026-08-15T14:30:00.000Z'),
        price: 30_000,
        staffRevenue: 18_000,
        storeRevenue: 12_000,
        designationType: '特別指名',
        marketingChannel: '姫予約',
        courseId: 'course-2',
        course: { id: 'course-2', name: '150分' },
        options: [{ optionId: 'option-2', optionName: '延長', optionPrice: 3_000 }],
      }),
      reservation({
        id: 'reservation-c-repeat-regular',
        customerId: 'customer-c',
        startTime: new Date('2026-08-20T02:00:00.000Z'),
        price: 40_000,
        staffRevenue: 24_000,
        storeRevenue: 16_000,
        designationType: '本指名',
        marketingChannel: 'WEB',
        courseId: 'course-2',
        course: { id: 'course-2', name: '150分' },
      }),
      reservation({
        id: 'reservation-d-first',
        customerId: 'customer-d',
        startTime: new Date('2026-08-25T02:00:00.000Z'),
        price: 50_000,
        staffRevenue: null,
        storeRevenue: 20_000,
        paymentMethod: '後日確認',
        designationType: '旧区分:7',
        marketingChannel: null,
        courseId: 'course-3',
        course: { id: 'course-3', name: '180分' },
      }),
    ]
    vi.mocked(db.reservation.findMany)
      .mockResolvedValueOnce(currentReservations as never)
      .mockResolvedValueOnce([
        {
          id: 'reservation-a-first',
          customerId: 'customer-a',
          startTime: currentReservations[0].startTime,
        },
        {
          id: 'reservation-a-repeat',
          customerId: 'customer-a',
          startTime: currentReservations[1].startTime,
        },
        {
          id: 'reservation-b-first',
          customerId: 'customer-b',
          startTime: currentReservations[2].startTime,
        },
        {
          id: 'older-c',
          customerId: 'customer-c',
          startTime: new Date('2026-07-01T00:00:00.000Z'),
        },
        {
          id: 'reservation-c-repeat-regular',
          customerId: 'customer-c',
          startTime: currentReservations[3].startTime,
        },
        {
          id: 'reservation-d-first',
          customerId: 'customer-d',
          startTime: currentReservations[4].startTime,
        },
      ] as never)

    const report = await getCastPerformanceReport(2026, 8, 'cast-1', 'ikebukuro')

    expect(report).toMatchObject({
      cast: { id: 'cast-1', name: '池袋キャスト' },
      period: { year: 2026, month: 8, timeZone: 'Asia/Tokyo' },
      completedReservations: 5,
      reservationDays: 5,
      totalSales: 150_000,
      staffRevenue: null,
      storeRevenue: 60_000,
      missingRevenue: { staff: 1, store: 0 },
      customers: { new: 3, storeRepeat: 1, returningRegular: 1 },
      designations: { regular: 2, free: 2, none: 0, unclassified: 1 },
      marketing: { princess: 2, other: 1, unclassified: 2 },
    })
    expect(report?.courses).toEqual([
      { id: 'course-2', name: '150分', count: 2, reservationSales: 70_000 },
      { id: 'course-1', name: '120分', count: 2, reservationSales: 30_000 },
      { id: 'course-3', name: '180分', count: 1, reservationSales: 50_000 },
    ])
    expect(report?.options).toEqual([
      { id: 'option-1', name: '衣装', count: 2, sales: 3_000, selectionRate: 40 },
      { id: 'option-2', name: '延長', count: 1, sales: 3_000, selectionRate: 20 },
    ])
    expect(report?.payments).toEqual({
      cash: { count: 3, amount: 80_000 },
      card: { count: 1, amount: 20_000 },
      unclassified: { count: 1, amount: 50_000 },
    })
    expect(db.reservation.findMany).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: {
          customerId: { in: ['customer-a', 'customer-b', 'customer-c', 'customer-d'] },
          status: 'completed',
        },
        orderBy: [{ startTime: 'asc' }, { id: 'asc' }],
      })
    )
  })

  it('returns null without reading reservations when the cast does not belong to the store', async () => {
    vi.mocked(db.cast.findFirst).mockResolvedValueOnce(null)

    await expect(getCastPerformanceReport(2026, 8, 'cast-other', 'ikebukuro')).resolves.toBeNull()
    expect(db.reservation.findMany).not.toHaveBeenCalled()
  })

  it('recognizes an explicit Hime label even when the text also contains a legacy media reference', async () => {
    const explicitHime = reservation({
      id: 'explicit-hime',
      marketingChannel: 'Hime予約 / 旧システム media:4',
    })
    vi.mocked(db.reservation.findMany)
      .mockResolvedValueOnce([explicitHime] as never)
      .mockResolvedValueOnce([
        {
          id: explicitHime.id,
          customerId: explicitHime.customerId,
          startTime: explicitHime.startTime,
        },
      ] as never)

    const report = await getCastPerformanceReport(2026, 8, 'cast-1', 'ikebukuro')

    expect(report?.marketing).toEqual({ princess: 1, other: 0, unclassified: 0 })
  })
})

describe('getJstMonthRange', () => {
  it('returns a half-open Asia/Tokyo range across a year boundary', () => {
    expect(getJstMonthRange(2026, 12)).toEqual({
      start: new Date('2026-11-30T15:00:00.000Z'),
      endExclusive: new Date('2026-12-31T15:00:00.000Z'),
    })
  })

  it.each([
    [2026.5, 8],
    [0, 8],
    [-1, 8],
    [2026, 0],
    [2026, 13],
  ])('rejects an invalid year/month pair (%s, %s)', (year, month) => {
    expect(() => getJstMonthRange(year, month)).toThrow('Invalid year or month')
  })
})
