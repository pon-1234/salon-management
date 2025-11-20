import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { db } from '@/lib/db'
import logger from '@/lib/logger'
import { ensureStoreId, resolveStoreId } from '@/lib/store/server'
import { differenceInCalendarDays, startOfDay, subDays } from 'date-fns'

const MAX_CANCELLATION_LIMIT = 3

function resolveReservationAmount(reservation: {
  price: number
  storeRevenue: number | null
  staffRevenue: number | null
}): number {
  const storeShare = reservation.storeRevenue ?? 0
  const staffShare = reservation.staffRevenue ?? 0
  if (storeShare > 0 || staffShare > 0) {
    return storeShare + staffShare
  }
  return reservation.price ?? 0
}

function extractBustCup(cast: { bust?: string | null; publicProfile?: any } | null) {
  if (!cast) return null
  const profileCup = cast.publicProfile?.bustCup
  if (typeof profileCup === 'string' && profileCup.trim().length > 0) {
    return normalizeCupValue(profileCup)
  }
  if (typeof cast.bust === 'string' && cast.bust.trim().length > 0) {
    return normalizeCupValue(cast.bust)
  }
  return null
}

function normalizeCupValue(raw: string) {
  const trimmed = raw.trim()
  const match = trimmed.match(/[A-Z]/i)
  if (match) {
    return match[0].toUpperCase()
  }
  return trimmed
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const customerId = request.nextUrl.searchParams.get('customerId')
    if (!customerId) {
      return NextResponse.json({ error: 'customerId is required' }, { status: 400 })
    }

    const storeId = await ensureStoreId(await resolveStoreId(request))
    const now = new Date()
    const todayStart = startOfDay(now)
    const yesterdayStart = subDays(todayStart, 1)

    const [reservations, chatCountToday, chatCountYesterday, chatCountTotal] = await Promise.all([
      db.reservation.findMany({
        where: { storeId, customerId },
        include: {
          cast: {
            select: {
              name: true,
              bust: true,
              publicProfile: true,
            },
          },
        },
        orderBy: {
          startTime: 'desc',
        },
      }),
      db.message.count({
        where: {
          customerId,
          timestamp: {
            gte: todayStart,
          },
        },
      }),
      db.message.count({
        where: {
          customerId,
          timestamp: {
            gte: yesterdayStart,
            lt: todayStart,
          },
        },
      }),
      db.message.count({
        where: {
          customerId,
        },
      }),
    ])

    const completedReservations = reservations.filter((reservation) => reservation.status !== 'cancelled')
    const lastCompletedReservation = completedReservations[0] ?? null
    const totalRevenue = completedReservations.reduce(
      (sum, reservation) => sum + resolveReservationAmount(reservation),
      0
    )
    const totalVisits = completedReservations.length
    const averageSpend = totalVisits > 0 ? Math.round(totalRevenue / totalVisits) : 0

    const sortedDates = completedReservations
      .map((reservation) => new Date(reservation.startTime))
      .sort((a, b) => a.getTime() - b.getTime())

    let averageIntervalDays: number | null = null
    if (sortedDates.length > 1) {
      const totalInterval = sortedDates.slice(1).reduce((sum, date, index) => {
        const previousDate = sortedDates[index]
        return sum + Math.max(1, differenceInCalendarDays(date, previousDate))
      }, 0)
      averageIntervalDays = Math.max(1, Math.round(totalInterval / (sortedDates.length - 1)))
    }

    const cupCounts = new Map<string, number>()
    completedReservations.forEach((reservation) => {
      const cup = extractBustCup(reservation.cast as any)
      if (!cup) return
      cupCounts.set(cup, (cupCounts.get(cup) ?? 0) + 1)
    })
    let preferredBustCup: string | null = null
    if (cupCounts.size > 0) {
      preferredBustCup = Array.from(cupCounts.entries()).sort((a, b) => {
        if (b[1] === a[1]) {
          return a[0].localeCompare(b[0])
        }
        return b[1] - a[1]
      })[0][0]
      if (preferredBustCup && !preferredBustCup.endsWith('カップ')) {
        preferredBustCup = `${preferredBustCup}カップ`
      }
    }

    const customerCancelCount = reservations.filter(
      (reservation) => reservation.status === 'cancelled' && reservation.cancellationSource === 'customer'
    ).length
    const storeCancelCount = reservations.filter(
      (reservation) => reservation.status === 'cancelled' && reservation.cancellationSource !== 'customer'
    ).length

    return NextResponse.json({
      data: {
        lastVisitDate: lastCompletedReservation ? lastCompletedReservation.startTime.toISOString() : null,
        lastCastName: lastCompletedReservation?.cast?.name ?? null,
        totalVisits,
        totalRevenue,
        averageSpend,
        averageIntervalDays,
        customerCancelCount,
        storeCancelCount,
        chatCountToday,
        chatCountYesterday,
        chatCountTotal,
        preferredBustCup,
        cancellationLimit: MAX_CANCELLATION_LIMIT,
      },
    })
  } catch (error) {
    logger.error({ err: error }, 'Failed to load customer insights')
    return NextResponse.json({ error: 'Failed to load insights' }, { status: 500 })
  }
}
