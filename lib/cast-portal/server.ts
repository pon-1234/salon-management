import { db } from '@/lib/db'
import {
  addMinutes,
  endOfDay,
  endOfMonth,
  format,
  isAfter,
  isBefore,
  isWithinInterval,
  startOfDay,
  startOfMonth,
} from 'date-fns'
import type {
  CastAttendanceRequestSummary,
  CastAttendanceState,
  CastDashboardData,
  CastDashboardStats,
  CastPortalReservation,
  CastReservationListResponse,
  CastReservationScope,
  CastSettlementRecord,
  CastSettlementsData,
} from './types'

type ReservationWithRelations = Awaited<ReturnType<typeof fetchReservationsForCast>>[number]

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

export async function getCastDashboardData(castId: string, storeId: string): Promise<CastDashboardData> {
  const now = new Date()
  const todayStart = startOfDay(now)
  const todayEnd = endOfDay(now)
  const monthStart = startOfMonth(now)
  const monthEnd = endOfMonth(now)

  const [cast, todayReservationsRaw, upcomingReservationsRaw, monthReservationsRaw, attendanceRequestsRaw] =
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
    },
    nextReservation: upcomingReservations[0] ?? null,
    todayReservations,
    stats,
    attendance,
    attendanceRequests,
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

  const recent: CastSettlementRecord[] = reservations.slice(0, 25).map((reservation) => ({
    id: reservation.id,
    startTime: reservation.startTime.toISOString(),
    status: reservation.status,
    courseName: reservation.course?.name ?? null,
    price: reservation.price ?? 0,
    staffRevenue: reservation.staffRevenue ?? 0,
    storeRevenue: reservation.storeRevenue ?? 0,
    welfareExpense: reservation.welfareExpense ?? 0,
  }))

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
    recent,
  }
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
