/**
 * @design_doc   docs/LEGACY_GOLD_ADMIN_MIGRATION_INVENTORY.md admin dashboard mapping
 * @related_to   DashboardPage reservation pagination, JST periods, and revenue summaries
 * @known_issues Dashboard queries intentionally cover only the operational comparison window
 */
import {
  addDays,
  addMonths,
  format,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
  subWeeks,
} from 'date-fns'
import { utcToZonedTime, zonedTimeToUtc } from 'date-fns-tz'
import type { Reservation } from '@/lib/types/reservation'

export type DashboardPeriod = 'today' | 'week' | 'month'

export interface DashboardPeriodBounds {
  start: Date
  endExclusive: Date
}

interface DashboardReservationQuery {
  storeId: string
  startDate: string
  endDate: string
  limit: number
  offset: number
}

type DashboardReservationFetcher = (query: DashboardReservationQuery) => Promise<Reservation[]>

const JST_TIMEZONE = 'Asia/Tokyo'
const DASHBOARD_PAGE_SIZE = 100

function jstStartOfDate(localDate: Date): Date {
  const dateKey = format(localDate, 'yyyy-MM-dd')
  return zonedTimeToUtc(`${dateKey}T00:00:00`, JST_TIMEZONE)
}

export function getJstPeriodBounds(
  period: DashboardPeriod,
  now: Date = new Date(),
  previous = false
): DashboardPeriodBounds {
  const zonedNow = utcToZonedTime(now, JST_TIMEZONE)

  if (period === 'week') {
    const target = previous ? subWeeks(zonedNow, 1) : zonedNow
    const localStart = startOfWeek(target, { weekStartsOn: 1 })
    const start = jstStartOfDate(localStart)
    return { start, endExclusive: addDays(start, 7) }
  }

  if (period === 'month') {
    const target = previous ? subMonths(zonedNow, 1) : zonedNow
    const localStart = startOfMonth(target)
    const nextLocalStart = addMonths(localStart, 1)
    return {
      start: jstStartOfDate(localStart),
      endExclusive: jstStartOfDate(nextLocalStart),
    }
  }

  const target = previous ? subDays(zonedNow, 1) : zonedNow
  const start = jstStartOfDate(target)
  return { start, endExclusive: addDays(start, 1) }
}

export function getDashboardQueryWindow(
  period: DashboardPeriod,
  now: Date = new Date()
): DashboardPeriodBounds {
  const current = getJstPeriodBounds(period, now)
  const previous = getJstPeriodBounds(period, now, true)
  const sevenDaysAgo = getJstPeriodBounds('today', subDays(now, 6)).start
  const upcomingEnd = new Date(now.getTime() + 48 * 60 * 60 * 1000)

  return {
    start: new Date(Math.min(previous.start.getTime(), sevenDaysAgo.getTime())),
    endExclusive: new Date(Math.max(current.endExclusive.getTime(), upcomingEnd.getTime())),
  }
}

export function isWithinPeriod(date: Date, bounds: DashboardPeriodBounds): boolean {
  const timestamp = date.getTime()
  return timestamp >= bounds.start.getTime() && timestamp < bounds.endExclusive.getTime()
}

export function sumActiveReservationRevenue(reservations: Reservation[]): number {
  return reservations.reduce(
    (total, reservation) =>
      reservation.status === 'cancelled' ? total : total + reservation.price,
    0
  )
}

export async function fetchAllDashboardReservations({
  storeId,
  start,
  endExclusive,
  fetchPage,
}: {
  storeId: string
  start: Date
  endExclusive: Date
  fetchPage: DashboardReservationFetcher
}): Promise<Reservation[]> {
  const normalizedStoreId = storeId.trim()
  if (!normalizedStoreId) {
    throw new Error('Store ID is required')
  }

  const reservationsById = new Map<string, Reservation>()

  for (let offset = 0; ; offset += DASHBOARD_PAGE_SIZE) {
    const page = await fetchPage({
      storeId: normalizedStoreId,
      startDate: start.toISOString(),
      endDate: endExclusive.toISOString(),
      limit: DASHBOARD_PAGE_SIZE,
      offset,
    })

    page.forEach((reservation) => reservationsById.set(reservation.id, reservation))

    if (page.length < DASHBOARD_PAGE_SIZE) {
      return Array.from(reservationsById.values())
    }
  }
}
