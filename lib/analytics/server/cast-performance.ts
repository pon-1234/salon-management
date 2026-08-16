/**
 * @design_doc   Accurate cast-scoped analytics over completed reservations in a JST month
 * @related_to   CastPerformanceReport and the cast-performance analytics route
 * @known_issues Customer lifecycle relies on persisted completed reservation history across all stores
 */
import { formatInTimeZone, zonedTimeToUtc } from 'date-fns-tz'

import { db } from '@/lib/db'
import { resolveMarketingCategory } from '@/lib/reservation/legacy-status'
import type {
  CastPerformanceCountAmount,
  CastPerformanceCourse,
  CastPerformanceOption,
  CastPerformanceReport,
} from '@/lib/types/cast-performance'

const JST_TIME_ZONE = 'Asia/Tokyo' as const

const REGULAR_DESIGNATIONS = new Set(['regular', '本指名', 'repeat-designation'])
const FREE_DESIGNATIONS = new Set([
  'panel',
  'special',
  'free',
  'パネル指名',
  '特別指名',
  'おすすめ指名',
  'フリー指名',
  'panel-designation',
  'special-designation',
  'recommend-designation',
  'free-designation',
])
const NO_DESIGNATIONS = new Set(['none', '指名なし', 'フリー'])

type DesignationCategory = 'regular' | 'free' | 'none' | 'unclassified'
type MarketingCategory = 'princess' | 'other' | 'unclassified'
type PaymentCategory = 'cash' | 'card' | 'unclassified'

export function getJstMonthRange(year: number, month: number): { start: Date; endExclusive: Date } {
  if (
    !Number.isInteger(year) ||
    year < 1 ||
    year > 9999 ||
    !Number.isInteger(month) ||
    month < 1 ||
    month > 12
  ) {
    throw new Error('Invalid year or month')
  }

  const startKey = `${year}-${String(month).padStart(2, '0')}-01T00:00:00`
  const nextYear = month === 12 ? year + 1 : year
  const nextMonth = month === 12 ? 1 : month + 1
  const endKey = `${nextYear}-${String(nextMonth).padStart(2, '0')}-01T00:00:00`

  return {
    start: zonedTimeToUtc(startKey, JST_TIME_ZONE),
    endExclusive: zonedTimeToUtc(endKey, JST_TIME_ZONE),
  }
}

function designationCategory(value: string | null): DesignationCategory {
  const normalized = value?.trim().toLowerCase()
  if (!normalized || NO_DESIGNATIONS.has(normalized)) return 'none'
  if (REGULAR_DESIGNATIONS.has(normalized)) return 'regular'
  if (FREE_DESIGNATIONS.has(normalized)) return 'free'
  return 'unclassified'
}

function marketingCategory(value: string | null): MarketingCategory {
  return resolveMarketingCategory(value)
}

function paymentCategory(value: string | null): PaymentCategory {
  const normalized = value?.trim().toLowerCase()
  if (!normalized) return 'unclassified'
  if (normalized.includes('card') || normalized.includes('カード')) return 'card'
  if (normalized.includes('cash') || normalized.includes('現金') || normalized.includes('手渡し')) {
    return 'cash'
  }
  return 'unclassified'
}

const emptyCountAmount = (): CastPerformanceCountAmount => ({ count: 0, amount: 0 })

export async function getCastPerformanceReport(
  year: number,
  month: number,
  castId: string,
  storeId: string
): Promise<CastPerformanceReport | null> {
  const range = getJstMonthRange(year, month)
  const cast = await db.cast.findFirst({
    where: { id: castId, storeId },
    select: { id: true, name: true },
  })

  if (!cast) return null

  const reservations = await db.reservation.findMany({
    where: {
      castId,
      storeId,
      status: 'completed',
      startTime: {
        gte: range.start,
        lt: range.endExclusive,
      },
    },
    orderBy: [{ startTime: 'asc' }, { id: 'asc' }],
    select: {
      id: true,
      customerId: true,
      startTime: true,
      price: true,
      staffRevenue: true,
      storeRevenue: true,
      paymentMethod: true,
      designationType: true,
      marketingChannel: true,
      courseId: true,
      course: {
        select: {
          id: true,
          name: true,
        },
      },
      options: {
        select: {
          optionId: true,
          optionName: true,
          optionPrice: true,
        },
      },
    },
  })

  const customerIds = Array.from(new Set(reservations.map((reservation) => reservation.customerId)))
  const completedCustomerHistory =
    customerIds.length === 0
      ? []
      : await db.reservation.findMany({
          where: {
            customerId: { in: customerIds },
            status: 'completed',
          },
          orderBy: [{ startTime: 'asc' }, { id: 'asc' }],
          select: {
            id: true,
            customerId: true,
            startTime: true,
          },
        })

  const firstCompletedReservationByCustomer = new Map<string, string>()
  completedCustomerHistory.forEach((reservation) => {
    if (!firstCompletedReservationByCustomer.has(reservation.customerId)) {
      firstCompletedReservationByCustomer.set(reservation.customerId, reservation.id)
    }
  })

  const payments: CastPerformanceReport['payments'] = {
    cash: emptyCountAmount(),
    card: emptyCountAmount(),
    unclassified: emptyCountAmount(),
  }
  const customers: CastPerformanceReport['customers'] = {
    new: 0,
    storeRepeat: 0,
    returningRegular: 0,
    unclassified: 0,
  }
  const designations: CastPerformanceReport['designations'] = {
    regular: 0,
    free: 0,
    none: 0,
    unclassified: 0,
  }
  const marketing: CastPerformanceReport['marketing'] = {
    princess: 0,
    other: 0,
    unclassified: 0,
  }
  const courses = new Map<string, CastPerformanceCourse>()
  const options = new Map<string, Omit<CastPerformanceOption, 'selectionRate'>>()
  const reservationDays = new Set<string>()
  let totalSales = 0
  let knownStaffRevenue = 0
  let knownStoreRevenue = 0
  let missingStaffRevenue = 0
  let missingStoreRevenue = 0

  reservations.forEach((reservation) => {
    const price = reservation.price
    totalSales += price
    reservationDays.add(formatInTimeZone(reservation.startTime, JST_TIME_ZONE, 'yyyy-MM-dd'))

    if (reservation.staffRevenue === null) missingStaffRevenue += 1
    else knownStaffRevenue += reservation.staffRevenue
    if (reservation.storeRevenue === null) missingStoreRevenue += 1
    else knownStoreRevenue += reservation.storeRevenue

    const payment = payments[paymentCategory(reservation.paymentMethod)]
    payment.count += 1
    payment.amount += price

    const designation = designationCategory(reservation.designationType)
    designations[designation] += 1
    marketing[marketingCategory(reservation.marketingChannel)] += 1

    const firstCompletedId = firstCompletedReservationByCustomer.get(reservation.customerId)
    if (!firstCompletedId) {
      customers.unclassified += 1
    } else if (firstCompletedId === reservation.id) {
      customers.new += 1
    } else if (designation === 'regular') {
      customers.returningRegular += 1
    } else {
      customers.storeRepeat += 1
    }

    const courseId = reservation.courseId
    const course = courses.get(courseId) ?? {
      id: courseId,
      name: reservation.course?.name?.trim() || '未分類',
      count: 0,
      reservationSales: 0,
    }
    course.count += 1
    course.reservationSales += price
    courses.set(courseId, course)

    reservation.options.forEach((selectedOption) => {
      const option = options.get(selectedOption.optionId) ?? {
        id: selectedOption.optionId,
        name: selectedOption.optionName.trim() || '未分類',
        count: 0,
        sales: 0,
      }
      option.count += 1
      option.sales += selectedOption.optionPrice
      options.set(selectedOption.optionId, option)
    })
  })

  const completedReservations = reservations.length
  const courseRows = Array.from(courses.values()).sort(
    (left, right) =>
      right.count - left.count ||
      right.reservationSales - left.reservationSales ||
      left.name.localeCompare(right.name, 'ja')
  )
  const optionRows = Array.from(options.values())
    .map((option) => ({
      ...option,
      selectionRate:
        completedReservations === 0
          ? 0
          : Math.round((option.count / completedReservations) * 1_000) / 10,
    }))
    .sort(
      (left, right) =>
        right.count - left.count ||
        right.sales - left.sales ||
        left.name.localeCompare(right.name, 'ja')
    )

  return {
    cast,
    period: { year, month, timeZone: JST_TIME_ZONE },
    completedReservations,
    reservationDays: reservationDays.size,
    totalSales,
    staffRevenue: missingStaffRevenue === 0 ? knownStaffRevenue : null,
    storeRevenue: missingStoreRevenue === 0 ? knownStoreRevenue : null,
    missingRevenue: { staff: missingStaffRevenue, store: missingStoreRevenue },
    payments,
    customers,
    designations,
    marketing,
    courses: courseRows,
    options: optionRows,
  }
}
