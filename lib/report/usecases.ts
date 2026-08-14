/**
 * @design_doc   Store-scoped JST business-day reporting contract
 * @related_to   Daily report API, CastSchedule, completed Reservation revenue
 * @known_issues Historical attendance outside CastSchedule requires a separately approved import
 */
import { DailyReport, StaffDailyReport } from './types'
import { db } from '@/lib/db'
import { differenceInMinutes } from 'date-fns'
import { zonedTimeToUtc } from 'date-fns-tz'
import { Reservation } from '@prisma/client'

const FALLBACK_STORE_ID = 'ikebukuro'
const BUSINESS_TIME_ZONE = 'Asia/Tokyo'
const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/u

function getDesignationCount(reservation: Reservation): number {
  if (!reservation.designationType) return 0
  return reservation.designationType === 'none' ? 0 : 1
}

function businessDayWindow(date: string): { start: Date; end: Date } {
  if (!DATE_KEY_PATTERN.test(date)) {
    throw new Error('date must be a valid yyyy-MM-dd')
  }

  const [year, month, day] = date.split('-').map(Number)
  const anchor = new Date(Date.UTC(year, month - 1, day))
  if (
    anchor.getUTCFullYear() !== year ||
    anchor.getUTCMonth() !== month - 1 ||
    anchor.getUTCDate() !== day
  ) {
    throw new Error('date must be a valid yyyy-MM-dd')
  }

  const nextDate = new Date(anchor.getTime() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  return {
    start: zonedTimeToUtc(`${date}T00:00:00`, BUSINESS_TIME_ZONE),
    end: zonedTimeToUtc(`${nextDate}T00:00:00`, BUSINESS_TIME_ZONE),
  }
}

export async function generateDailyReport(
  date: string,
  storeId: string = FALLBACK_STORE_ID
): Promise<DailyReport> {
  const { start, end } = businessDayWindow(date)

  const [reservations, schedules] = await Promise.all([
    db.reservation.findMany({
      where: {
        storeId,
        status: 'completed',
        startTime: {
          gte: start,
          lt: end,
        },
      },
      include: {
        cast: true,
        options: true,
      },
    }),
    db.castSchedule.findMany({
      where: {
        date: {
          gte: start,
          lt: end,
        },
        isAvailable: true,
        cast: { storeId },
      },
      include: { cast: true },
    }),
  ])

  const staffMap = new Map<
    string,
    {
      name: string
      totalMinutes: number
      salesAmount: number
      customerCount: number
      designationCount: number
      optionSales: number
    }
  >()

  for (const schedule of schedules) {
    const duration = Math.max(differenceInMinutes(schedule.endTime, schedule.startTime), 0)
    const entry = staffMap.get(schedule.castId) ?? {
      name: schedule.cast?.name ?? '未設定',
      totalMinutes: 0,
      salesAmount: 0,
      customerCount: 0,
      designationCount: 0,
      optionSales: 0,
    }
    entry.totalMinutes += duration
    staffMap.set(schedule.castId, entry)
  }

  for (const reservation of reservations) {
    const staffId = reservation.castId ?? 'unknown'
    const staffName = reservation.cast?.name ?? '未設定'
    const price = reservation.price ?? 0
    const optionSales =
      reservation.options?.reduce((sum, option) => sum + (option.optionPrice ?? 0), 0) ?? 0

    const entry = staffMap.get(staffId) ?? {
      name: staffName,
      totalMinutes: 0,
      salesAmount: 0,
      customerCount: 0,
      designationCount: 0,
      optionSales: 0,
    }

    entry.salesAmount += price
    entry.customerCount += 1
    entry.designationCount += getDesignationCount(reservation)
    entry.optionSales += optionSales

    staffMap.set(staffId, entry)
  }

  const staffReports: StaffDailyReport[] = Array.from(staffMap.entries()).map(
    ([staffId, data]) => ({
      staffId,
      staffName: data.name,
      workingHours: Math.round((data.totalMinutes / 60) * 100) / 100,
      salesAmount: data.salesAmount,
      customerCount: data.customerCount,
      designationCount: data.designationCount,
      optionSales: data.optionSales,
    })
  )

  const totalSales = staffReports.reduce((sum, staff) => sum + staff.salesAmount, 0)
  const totalCustomers = staffReports.reduce((sum, staff) => sum + staff.customerCount, 0)
  const totalWorkingHours = staffReports.reduce((sum, staff) => sum + staff.workingHours, 0)

  return {
    date,
    totalSales,
    totalCustomers,
    totalWorkingHours,
    staffReports,
  }
}
