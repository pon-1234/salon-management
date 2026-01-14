import { db } from '@/lib/db'
import {
  addDays,
  addMinutes,
  differenceInCalendarDays,
  endOfDay,
  endOfMonth,
  format,
  isAfter,
  isBefore,
  isWithinInterval,
  startOfDay,
  startOfMonth,
} from 'date-fns'
import { ja } from 'date-fns/locale'
import { utcToZonedTime, zonedTimeToUtc } from 'date-fns-tz'
import type {
  CastAttendanceRequestSummary,
  CastAttendanceState,
  CastDashboardData,
  CastDashboardStats,
  CastPerformanceSnapshot,
  CastPortalReservation,
  CastReservationListResponse,
  CastReservationScope,
  CastReservationDetail,
  CastScheduleEntry,
  CastScheduleUpdateInput,
  CastScheduleWindow,
  CastSettlementDaySummary,
  CastSettlementRecordDetail,
  CastSettlementsData,
  CastScheduleLockReason,
} from './types'

type ReservationWithRelations = Awaited<ReturnType<typeof fetchReservationsForCast>>[number]

const DEFAULT_SCHEDULE_START_TIME = '10:00'
const DEFAULT_SCHEDULE_END_TIME = '18:00'
const MAX_SCHEDULE_WINDOW_DAYS = 31
const DEFAULT_TIME_ZONE = 'Asia/Tokyo'
const SCHEDULE_EDIT_LOCK_DAYS = 7

export class CastScheduleValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CastScheduleValidationError'
  }
}

async function fetchReservationsForCast(params: {
  castId: string
  storeId: string
  start?: Date
  end?: Date
  comparator?: 'gte' | 'lt'
  limit?: number
  order: 'asc' | 'desc'
}) {
  const { castId, storeId, start, end, comparator = 'gte', limit, order } = params
  const where: any = { castId, storeId }

  if (start && end) {
    where.startTime = {
      gte: start,
      lte: end,
    }
  } else if (start) {
    where.startTime = {
      [comparator]: start,
    }
  }

  return db.reservation.findMany({
    where,
    include: {
      customer: {
        select: {
          name: true,
        },
      },
      course: {
        select: {
          name: true,
          duration: true,
        },
      },
      options: {
        include: {
          option: true,
        },
      },
      area: {
        select: {
          name: true,
        },
      },
    },
    orderBy: {
      startTime: order,
    },
    take: limit,
  })
}

function maskCustomerName(name?: string | null) {
  if (!name || name.trim().length === 0) {
    return 'お客様'
  }
  const firstChar = name.trim()[0]
  return `${firstChar}***`
}

function buildReservationOptions(reservation: ReservationWithRelations) {
  if (!Array.isArray(reservation.options)) {
    return []
  }

  return reservation.options.map((entry) => ({
    id: entry.optionId,
    name: entry.option?.name ?? entry.optionName,
    price: entry.option?.price ?? entry.optionPrice ?? 0,
  }))
}

export function serializeCastReservation(
  reservation: ReservationWithRelations,
  now: Date
): CastPortalReservation {
  const startTime = new Date(reservation.startTime)
  const endTime = new Date(reservation.endTime)
  const durationMinutes = Math.max(0, Math.round((endTime.getTime() - startTime.getTime()) / 60000))

  const canCheckIn =
    !reservation.castCheckedInAt && isAfter(now, addMinutes(startTime, -30)) && isBefore(now, addMinutes(endTime, 60))
  const canCheckOut =
    Boolean(reservation.castCheckedInAt) && !reservation.castCheckedOutAt && isAfter(now, startTime)

  return {
    id: reservation.id,
    status: reservation.status,
    startTime: reservation.startTime.toISOString(),
    endTime: reservation.endTime.toISOString(),
    durationMinutes,
    courseName: reservation.course?.name ?? null,
    courseDuration: reservation.course?.duration ?? null,
    customerAlias: maskCustomerName(reservation.customer?.name),
    location: reservation.locationMemo ?? null,
    areaName: reservation.area?.name ?? null,
    designationType: reservation.designationType ?? undefined,
    designationFee: reservation.designationFee ?? undefined,
    transportationFee: reservation.transportationFee ?? undefined,
    additionalFee: reservation.additionalFee ?? undefined,
    discountAmount: reservation.discountAmount ?? undefined,
    checkedInAt: reservation.castCheckedInAt ? reservation.castCheckedInAt.toISOString() : null,
    checkedOutAt: reservation.castCheckedOutAt ? reservation.castCheckedOutAt.toISOString() : null,
    canCheckIn,
    canCheckOut,
    options: buildReservationOptions(reservation),
  }
}

function aggregateDashboardStats(params: {
  todayReservations: ReservationWithRelations[]
  upcomingReservations: ReservationWithRelations[]
  monthReservations: Array<{
    price: number
    staffRevenue: number | null
    storeRevenue: number | null
    welfareExpense: number | null
    status: string
    castCheckedOutAt: Date | null
  }>
}): CastDashboardStats {
  const { todayReservations, upcomingReservations, monthReservations } = params
  const todayCount = todayReservations.length
  const completedToday = todayReservations.filter((reservation) => reservation.castCheckedOutAt).length
  const upcomingCount = upcomingReservations.length

  const todayRevenue = todayReservations.reduce((total, reservation) => {
    return total + (reservation.staffRevenue ?? 0)
  }, 0)

  const { monthRevenue, welfareThisMonth, pendingCount } = monthReservations.reduce(
    (acc, reservation) => {
      acc.monthRevenue += reservation.staffRevenue ?? 0
      acc.welfareThisMonth += reservation.welfareExpense ?? 0
      if (!reservation.castCheckedOutAt || reservation.status !== 'completed') {
        acc.pendingCount += 1
      }
      return acc
    },
    { monthRevenue: 0, welfareThisMonth: 0, pendingCount: 0 }
  )

  return {
    todayCount,
    completedToday,
    upcomingCount,
    todayRevenue,
    monthRevenue,
    welfareThisMonth,
    pendingRequests: 0, // will be overwritten by caller
  }
}

function deriveAttendanceState(
  todayReservations: ReservationWithRelations[],
  upcomingReservations: ReservationWithRelations[],
  now: Date
): CastAttendanceState {
  const ongoing = todayReservations.find((reservation) => {
    return isWithinInterval(now, {
      start: addMinutes(new Date(reservation.startTime), -10),
      end: addMinutes(new Date(reservation.endTime), 15),
    })
  })

  const nextReservation = upcomingReservations[0] ?? null
  const targetReservation = ongoing ?? nextReservation ?? null

  const lastCheckInAt = todayReservations
    .filter((reservation) => reservation.castCheckedInAt)
    .sort((a, b) => {
      const aTime = a.castCheckedInAt ? a.castCheckedInAt.getTime() : 0
      const bTime = b.castCheckedInAt ? b.castCheckedInAt.getTime() : 0
      return bTime - aTime
    })[0]?.castCheckedInAt

  const lastCheckOutAt = todayReservations
    .filter((reservation) => reservation.castCheckedOutAt)
    .sort((a, b) => {
      const aTime = a.castCheckedOutAt ? a.castCheckedOutAt.getTime() : 0
      const bTime = b.castCheckedOutAt ? b.castCheckedOutAt.getTime() : 0
      return bTime - aTime
    })[0]?.castCheckedOutAt

  if (!targetReservation) {
    return {
      currentReservationId: null,
      canCheckIn: false,
      canCheckOut: false,
      lastCheckInAt: lastCheckInAt ? lastCheckInAt.toISOString() : null,
      lastCheckOutAt: lastCheckOutAt ? lastCheckOutAt.toISOString() : null,
    }
  }

  const mapped = serializeCastReservation(targetReservation, now)

  return {
    currentReservationId: mapped.id,
    canCheckIn: mapped.canCheckIn,
    canCheckOut: mapped.canCheckOut,
    lastCheckInAt: lastCheckInAt ? lastCheckInAt.toISOString() : null,
    lastCheckOutAt: lastCheckOutAt ? lastCheckOutAt.toISOString() : null,
  }
}

export function serializeAttendanceRequests(
  requests: Awaited<ReturnType<typeof db.reservationAttendanceRequest.findMany>>
): CastAttendanceRequestSummary[] {
  return requests.map((request) => ({
    id: request.id,
    reservationId: request.reservationId,
    status: request.status,
    type: request.type,
    requestedTime: request.requestedTime.toISOString(),
    createdAt: request.createdAt.toISOString(),
    reason: request.reason ?? undefined,
  }))
}

function buildCountMap<T extends { castId: string; _count: { _all: number } }>(
  rows: T[]
): Map<string, number> {
  const map = new Map<string, number>()
  rows.forEach((row) => {
    map.set(row.castId, row._count._all)
  })
  return map
}

function computeRank(
  castIds: string[],
  counts: Map<string, number>,
  targetCastId: string
): { rank: number | null; count: number } {
  const entries = castIds.map((id) => ({ id, count: counts.get(id) ?? 0 }))
  entries.sort((a, b) => b.count - a.count)
  const index = entries.findIndex((entry) => entry.id === targetCastId)
  return {
    rank: index >= 0 ? index + 1 : null,
    count: counts.get(targetCastId) ?? 0,
  }
}

export async function getCastDashboardData(castId: string, storeId: string): Promise<CastDashboardData> {
  const now = new Date()
  const todayStart = startOfDayInTimeZone(now, DEFAULT_TIME_ZONE)
  const todayEnd = endOfDayInTimeZone(now, DEFAULT_TIME_ZONE)
  const monthStart = startOfMonthInTimeZone(now, DEFAULT_TIME_ZONE)
  const monthEnd = endOfMonthInTimeZone(now, DEFAULT_TIME_ZONE)

  const [cast, todayReservationsRaw, upcomingReservationsRaw, monthReservationsRaw, attendanceRequestsRaw, todaySchedule] =
    await Promise.all([
      db.cast.findFirst({
        where: { id: castId, storeId },
        include: {
          store: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
      fetchReservationsForCast({
        castId,
        storeId,
        start: todayStart,
        end: todayEnd,
        order: 'asc',
      }),
      fetchReservationsForCast({
        castId,
        storeId,
        start: now,
        comparator: 'gte',
        order: 'asc',
        limit: 10,
      }),
      db.reservation.findMany({
        where: {
          castId,
          storeId,
          startTime: {
            gte: monthStart,
            lte: monthEnd,
          },
        },
        select: {
          price: true,
          staffRevenue: true,
          storeRevenue: true,
          welfareExpense: true,
          status: true,
          castCheckedOutAt: true,
        },
      }),
      db.reservationAttendanceRequest.findMany({
        where: {
          castId,
          status: {
            in: ['pending', 'in_review'],
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 5,
      }),
      db.castSchedule.findFirst({
        where: {
          castId,
          date: {
            gte: todayStart,
            lt: addDays(todayStart, 1),
          },
          isAvailable: true,
          cast: {
            storeId,
          },
        },
      }),
    ])

  if (!cast) {
    throw new Error('Cast not found or access denied')
  }

  const todayReservations = todayReservationsRaw.map((reservation) =>
    serializeCastReservation(reservation, now)
  )
  const upcomingReservations = upcomingReservationsRaw.map((reservation) =>
    serializeCastReservation(reservation, now)
  )

  const stats = aggregateDashboardStats({
    todayReservations: todayReservationsRaw,
    upcomingReservations: upcomingReservationsRaw,
    monthReservations: monthReservationsRaw,
  })
  stats.pendingRequests = attendanceRequestsRaw.length

  const attendance = deriveAttendanceState(todayReservationsRaw, upcomingReservationsRaw, now)
  const attendanceRequests = serializeAttendanceRequests(attendanceRequestsRaw)

  return {
    cast: {
      id: cast.id,
      name: cast.name,
      image: Array.isArray(cast.images) && cast.images.length > 0 ? cast.images[0] : cast.image ?? null,
      workStatus: cast.workStatus,
      storeId: cast.storeId,
      storeName: cast.store?.name ?? null,
      requestAttendanceEnabled: Boolean(cast.requestAttendanceEnabled),
    },
    nextReservation: upcomingReservations[0] ?? null,
    todayReservations,
    stats,
    attendance,
    attendanceRequests,
    isScheduledToday: Boolean(todaySchedule),
  }
}

export async function getCastPerformanceSnapshot(
  castId: string,
  storeId: string
): Promise<CastPerformanceSnapshot> {
  const now = new Date()
  const monthStart = startOfMonthInTimeZone(now, DEFAULT_TIME_ZONE)
  const monthEnd = endOfMonthInTimeZone(now, DEFAULT_TIME_ZONE)
  const [cast, casts, totalRows, regularRows] = await Promise.all([
    db.cast.findFirst({
      where: { id: castId, storeId },
      include: {
        store: {
          select: {
            name: true,
          },
        },
      },
    }),
    db.cast.findMany({
      where: { storeId },
      select: { id: true },
    }),
    db.reservation.groupBy({
      by: ['castId'],
      where: {
        storeId,
        status: {
          not: 'cancelled',
        },
        startTime: {
          gte: monthStart,
          lte: monthEnd,
        },
      },
      _count: {
        _all: true,
      },
    }),
    db.reservation.groupBy({
      by: ['castId'],
      where: {
        storeId,
        status: {
          not: 'cancelled',
        },
        designationType: 'regular',
        startTime: {
          gte: monthStart,
          lte: monthEnd,
        },
      },
      _count: {
        _all: true,
      },
    }),
  ])

  if (!cast) {
    throw new Error('Cast not found or access denied')
  }

  const castIds = casts.map((entry) => entry.id)
  const totalCounts = buildCountMap(totalRows)
  const regularCounts = buildCountMap(regularRows)
  const totalMetric = computeRank(castIds, totalCounts, castId)
  const regularMetric = computeRank(castIds, regularCounts, castId)

  return {
    cast: {
      id: cast.id,
      name: cast.name,
      storeId: cast.storeId,
      storeName: cast.store?.name ?? null,
    },
    periodLabel: format(utcToZonedTime(now, DEFAULT_TIME_ZONE), 'yyyy年M月', { locale: ja }),
    totalCastCount: castIds.length,
    totalDesignation: {
      label: '総指名ランキング（フリー含む）',
      rank: totalMetric.rank,
      count: totalMetric.count,
    },
    regularDesignation: {
      label: '本指名ランキング',
      rank: regularMetric.rank,
      count: regularMetric.count,
    },
    access: {
      label: 'アクセス数ランキング',
      rank: null,
      count: null,
    },
  }
}

export async function getCastReservations(
  castId: string,
  storeId: string,
  options: { scope?: CastReservationScope; limit?: number } = {}
): Promise<CastReservationListResponse> {
  const { scope = 'upcoming', limit = 20 } = options
  const now = new Date()
  let reservations: ReservationWithRelations[]

  if (scope === 'today') {
    reservations = await fetchReservationsForCast({
      castId,
      storeId,
      start: startOfDay(now),
      end: endOfDay(now),
      order: 'asc',
    })
  } else if (scope === 'past') {
    reservations = await fetchReservationsForCast({
      castId,
      storeId,
      start: now,
      comparator: 'lt',
      order: 'desc',
      limit,
    })
  } else {
    reservations = await fetchReservationsForCast({
      castId,
      storeId,
      start: now,
      comparator: 'gte',
      order: 'asc',
      limit,
    })
  }

  const items = reservations.map((reservation) => serializeCastReservation(reservation, now))

  return {
    items,
    meta: {
      scope,
      count: items.length,
    },
  }
}

export async function getCastReservationDetail(
  castId: string,
  storeId: string,
  reservationId: string
): Promise<CastReservationDetail | null> {
  const reservation = await db.reservation.findFirst({
    where: {
      id: reservationId,
      castId,
      storeId,
    },
    include: {
      customer: {
        select: {
          name: true,
          phone: true,
          email: true,
        },
      },
      course: {
        select: {
          name: true,
          price: true,
          duration: true,
        },
      },
      options: {
        include: {
          option: true,
        },
      },
      area: true,
      station: true,
    },
  })

  if (!reservation) {
    return null
  }

  const mapped = serializeCastReservation(reservation as ReservationWithRelations, new Date())

  const memoSource = reservation.area?.description ?? reservation.locationMemo ?? null

  return {
    ...mapped,
    customerPhone: reservation.customer?.phone ?? undefined,
    marketingChannel: reservation.marketingChannel ?? null,
    paymentMethod: reservation.paymentMethod ?? null,
    designationFee: reservation.designationFee ?? undefined,
    transportationFee: reservation.transportationFee ?? undefined,
    additionalFee: reservation.additionalFee ?? undefined,
    discountAmount: reservation.discountAmount ?? undefined,
    notes: reservation.notes ?? null,
    areaMemo: memoSource ?? null,
    locationMemo: reservation.locationMemo ?? null,
    coursePrice: reservation.course?.price ?? null,
    storeRevenue: reservation.storeRevenue ?? null,
    staffRevenue: reservation.staffRevenue ?? null,
  }
}

export async function getCastSettlements(castId: string, storeId: string): Promise<CastSettlementsData> {
  const now = new Date()
  const monthStart = startOfMonth(now)
  const monthEnd = endOfMonth(now)

  const reservations = await db.reservation.findMany({
    where: {
      castId,
      storeId,
      startTime: {
        gte: monthStart,
        lte: monthEnd,
      },
    },
    select: {
      id: true,
      startTime: true,
      status: true,
      price: true,
      staffRevenue: true,
      storeRevenue: true,
      welfareExpense: true,
      course: {
        select: {
          name: true,
        },
      },
      castCheckedOutAt: true,
      options: {
        select: {
          optionId: true,
          optionName: true,
          optionPrice: true,
          storeShare: true,
          castShare: true,
        },
      },
    },
    orderBy: {
      startTime: 'desc',
    },
  })

  const summary = reservations.reduce(
    (acc, reservation) => {
      acc.totalRevenue += reservation.price ?? 0
      acc.staffRevenue += reservation.staffRevenue ?? 0
      acc.storeRevenue += reservation.storeRevenue ?? 0
      acc.welfareExpense += reservation.welfareExpense ?? 0
      if (reservation.castCheckedOutAt && reservation.status === 'completed') {
        acc.completedCount += 1
      } else {
        acc.pendingCount += 1
      }
      return acc
    },
    {
      totalRevenue: 0,
      staffRevenue: 0,
      storeRevenue: 0,
      welfareExpense: 0,
      completedCount: 0,
      pendingCount: 0,
    }
  )

  const dailyMap = new Map<string, CastSettlementDaySummary>()

  reservations.forEach((reservation) => {
    const dateKey = format(utcToZonedTime(reservation.startTime, DEFAULT_TIME_ZONE), 'yyyy-MM-dd')
    let day = dailyMap.get(dateKey)
    if (!day) {
      day = {
        date: dateKey,
        totalRevenue: 0,
        reservationCount: 0,
        records: [],
      }
      dailyMap.set(dateKey, day)
    }

    const record: CastSettlementRecordDetail = {
      id: reservation.id,
      startTime: reservation.startTime.toISOString(),
      status: reservation.status,
      courseName: reservation.course?.name ?? null,
      price: reservation.price ?? 0,
      staffRevenue: reservation.staffRevenue ?? 0,
      storeRevenue: reservation.storeRevenue ?? 0,
      welfareExpense: reservation.welfareExpense ?? 0,
      options:
        reservation.options?.map((option) => ({
          id: option.optionId,
          name: option.optionName,
          price: option.optionPrice,
          storeShare: option.storeShare ?? undefined,
          castShare: option.castShare ?? undefined,
        })) ?? [],
    }

    day.records.push(record)
    day.totalRevenue += reservation.price ?? 0
    day.reservationCount += 1
  })

  const days = Array.from(dailyMap.values()).sort((a, b) => b.date.localeCompare(a.date))
  days.forEach((day) => {
    day.records.sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
  })

  return {
    summary: {
      month: format(monthStart, 'yyyy-MM'),
      totalRevenue: summary.totalRevenue,
      staffRevenue: summary.staffRevenue,
      storeRevenue: summary.storeRevenue,
      welfareExpense: summary.welfareExpense,
      completedCount: summary.completedCount,
      pendingCount: summary.pendingCount,
    },
    days,
  }
}

function startOfDayInTimeZone(date: Date, timeZone: string): Date {
  const zoned = utcToZonedTime(date, timeZone)
  const start = startOfDay(zoned)
  return zonedTimeToUtc(start, timeZone)
}

function endOfDayInTimeZone(date: Date, timeZone: string): Date {
  const zoned = utcToZonedTime(date, timeZone)
  const end = endOfDay(zoned)
  return zonedTimeToUtc(end, timeZone)
}

function startOfMonthInTimeZone(date: Date, timeZone: string): Date {
  const zoned = utcToZonedTime(date, timeZone)
  const start = startOfMonth(zoned)
  return zonedTimeToUtc(start, timeZone)
}

function endOfMonthInTimeZone(date: Date, timeZone: string): Date {
  const zoned = utcToZonedTime(date, timeZone)
  const end = endOfMonth(zoned)
  return zonedTimeToUtc(end, timeZone)
}

function parseDateKey(dateKey: string): Date {
  const parsed = zonedTimeToUtc(`${dateKey}T00:00:00`, DEFAULT_TIME_ZONE)
  if (Number.isNaN(parsed.getTime())) {
    throw new CastScheduleValidationError('日付の形式が正しくありません。')
  }
  return parsed
}

function combineDateAndTime(dateKey: string, time: string): Date {
  const parsed = zonedTimeToUtc(`${dateKey}T${time}:00`, DEFAULT_TIME_ZONE)
  if (Number.isNaN(parsed.getTime())) {
    throw new CastScheduleValidationError('時刻の形式が正しくありません。')
  }
  return parsed
}

function toScheduleEntry(
  record: { id: string; date: Date; startTime: Date; endTime: Date; isAvailable: boolean } | undefined,
  dateKey: string,
  options?: { hasReservations?: boolean; lockReasons?: CastScheduleLockReason[] }
): CastScheduleEntry {
  const hasReservations = Boolean(options?.hasReservations)
  const lockReasons = options?.lockReasons ?? []
  const canEdit = lockReasons.length === 0

  if (!record) {
    return {
      id: null,
      date: dateKey,
      isAvailable: false,
      startTime: DEFAULT_SCHEDULE_START_TIME,
      endTime: DEFAULT_SCHEDULE_END_TIME,
      canEdit,
      hasReservations,
      lockReasons,
    }
  }

  const startLocal = utcToZonedTime(record.startTime, DEFAULT_TIME_ZONE)
  const endLocal = utcToZonedTime(record.endTime, DEFAULT_TIME_ZONE)

  return {
    id: record.id,
    date: dateKey,
    isAvailable: record.isAvailable,
    startTime: format(startLocal, 'HH:mm'),
    endTime: format(endLocal, 'HH:mm'),
    canEdit,
    hasReservations,
    lockReasons,
  }
}

export async function getCastScheduleWindow(
  castId: string,
  storeId: string,
  startDate: Date,
  endDate: Date
): Promise<CastScheduleWindow> {
  const normalizedStart = startOfDayInTimeZone(startDate, DEFAULT_TIME_ZONE)
  const normalizedEnd = startOfDayInTimeZone(endDate, DEFAULT_TIME_ZONE)

  const safeEnd =
    differenceInCalendarDays(normalizedEnd, normalizedStart) >= MAX_SCHEDULE_WINDOW_DAYS
      ? addDays(normalizedStart, MAX_SCHEDULE_WINDOW_DAYS - 1)
      : normalizedEnd

  const reservationWindowEnd = endOfDayInTimeZone(safeEnd, DEFAULT_TIME_ZONE)

  const rawSchedules = await db.castSchedule.findMany({
    where: {
      castId,
      date: {
        gte: normalizedStart,
        lte: safeEnd,
      },
      cast: {
        storeId,
      },
    },
    orderBy: [{ date: 'asc' }],
  })

  const reservations = await db.reservation.findMany({
    where: {
      castId,
      storeId,
      status: {
        not: 'cancelled',
      },
      startTime: {
        gte: normalizedStart,
        lte: reservationWindowEnd,
      },
    },
    select: {
      startTime: true,
    },
  })

  const scheduleMap = new Map<string, (typeof rawSchedules)[number]>()
  rawSchedules.forEach((record) => {
    const key = format(utcToZonedTime(record.date, DEFAULT_TIME_ZONE), 'yyyy-MM-dd')
    scheduleMap.set(key, record)
  })

  const reservationDateKeys = new Set<string>()
  reservations.forEach((reservation) => {
    const key = format(utcToZonedTime(reservation.startTime, DEFAULT_TIME_ZONE), 'yyyy-MM-dd')
    reservationDateKeys.add(key)
  })

  const daysDiff = Math.max(0, differenceInCalendarDays(safeEnd, normalizedStart))
  const items: CastScheduleEntry[] = []
  const today = startOfDayInTimeZone(new Date(), DEFAULT_TIME_ZONE)
  const editRestrictedUntil = addDays(today, SCHEDULE_EDIT_LOCK_DAYS)

  for (let index = 0; index <= daysDiff; index += 1) {
    const currentDate = addDays(normalizedStart, index)
    const localKey = format(utcToZonedTime(currentDate, DEFAULT_TIME_ZONE), 'yyyy-MM-dd')
    const record = scheduleMap.get(localKey)
    const hasReservations = reservationDateKeys.has(localKey)
    const lockReasons: CastScheduleLockReason[] = []
    if (currentDate < editRestrictedUntil) {
      lockReasons.push('near_term')
    }
    if (hasReservations) {
      lockReasons.push('has_reservations')
    }
    items.push(toScheduleEntry(record, localKey, { hasReservations, lockReasons }))
  }

  return {
    items,
    meta: {
      startDate: format(utcToZonedTime(normalizedStart, DEFAULT_TIME_ZONE), 'yyyy-MM-dd'),
      endDate: format(utcToZonedTime(safeEnd, DEFAULT_TIME_ZONE), 'yyyy-MM-dd'),
    },
  }
}

export async function updateCastScheduleWindow(
  castId: string,
  storeId: string,
  updates: CastScheduleUpdateInput[],
  range: { startDate: Date; endDate: Date }
): Promise<CastScheduleWindow> {
  if (!updates.length) {
    return getCastScheduleWindow(castId, storeId, range.startDate, range.endDate)
  }

  const today = startOfDayInTimeZone(new Date(), DEFAULT_TIME_ZONE)
  const editRestrictedUntil = addDays(today, SCHEDULE_EDIT_LOCK_DAYS)

  await db.$transaction(async (tx) => {
    for (const update of updates) {
      const scheduleDate = parseDateKey(update.date)

      if (scheduleDate < today) {
        throw new CastScheduleValidationError('過去の日付は編集できません。')
      }

      if (scheduleDate < editRestrictedUntil) {
        throw new CastScheduleValidationError('直近1週間の予定はキャストページから変更できません。店舗スタッフへ連絡してください。')
      }

      const reservationCount = await tx.reservation.count({
        where: {
          castId,
          storeId,
          status: {
            not: 'cancelled',
          },
          startTime: {
            gte: scheduleDate,
            lte: endOfDayInTimeZone(scheduleDate, DEFAULT_TIME_ZONE),
          },
        },
      })

      if (reservationCount > 0) {
        throw new CastScheduleValidationError('予約が入っている日の出勤予定は変更できません。')
      }

      if (update.status === 'off') {
        await tx.castSchedule.deleteMany({
          where: {
            castId,
            date: scheduleDate,
          },
        })
        continue
      }

      if (!update.startTime || !update.endTime) {
        throw new CastScheduleValidationError('出勤予定には開始時刻と終了時刻が必要です。')
      }

      const startTime = combineDateAndTime(update.date, update.startTime)
      const endTime = combineDateAndTime(update.date, update.endTime)

      if (endTime <= startTime) {
        throw new CastScheduleValidationError('終了時刻は開始時刻より後に設定してください。')
      }

      await tx.castSchedule.upsert({
        where: {
          castId_date: {
            castId,
            date: scheduleDate,
          },
        },
        create: {
          castId,
          date: scheduleDate,
          startTime,
          endTime,
          isAvailable: true,
        },
        update: {
          startTime,
          endTime,
          isAvailable: true,
        },
      })
    }
  })

  const normalizedStart = startOfDayInTimeZone(range.startDate, DEFAULT_TIME_ZONE)
  const normalizedEnd = startOfDayInTimeZone(range.endDate, DEFAULT_TIME_ZONE)

  return getCastScheduleWindow(castId, storeId, normalizedStart, normalizedEnd)
}

export async function resolveCastStoreId(castId: string, fallback?: string): Promise<string> {
  if (fallback) {
    return fallback
  }

  const cast = await db.cast.findUnique({
    where: { id: castId },
    select: { storeId: true },
  })

  if (!cast) {
    throw new Error('Cast not found')
  }

  return cast.storeId
}
