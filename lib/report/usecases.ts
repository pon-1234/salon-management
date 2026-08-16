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

function isCardPayment(value: string | null | undefined): boolean {
  const normalized = value?.trim().toLowerCase() ?? ''
  return normalized.includes('card') || normalized.includes('カード')
}

function emptyStaffEntry(name: string) {
  return {
    name,
    totalMinutes: 0,
    salesAmount: 0,
    storeRevenue: 0,
    staffRevenue: 0,
    cashCount: 0,
    cashAmount: 0,
    cardCount: 0,
    cardAmount: 0,
    discountAmount: 0,
    hotelExpense: 0,
    welfareExpense: 0,
    customerCount: 0,
    designationCount: 0,
    optionSales: 0,
  }
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
    start: zonedTimeToUtc(`${date}T05:30:00`, BUSINESS_TIME_ZONE),
    end: zonedTimeToUtc(`${nextDate}T05:30:00`, BUSINESS_TIME_ZONE),
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

  const staffMap = new Map<string, ReturnType<typeof emptyStaffEntry>>()

  for (const schedule of schedules) {
    const duration = Math.max(differenceInMinutes(schedule.endTime, schedule.startTime), 0)
    const entry = staffMap.get(schedule.castId) ?? emptyStaffEntry(schedule.cast?.name ?? '未設定')
    entry.totalMinutes += duration
    staffMap.set(schedule.castId, entry)
  }

  for (const reservation of reservations) {
    const staffId = reservation.castId ?? 'unknown'
    const staffName = reservation.cast?.name ?? '未設定'
    const price = reservation.price ?? 0
    const optionSales =
      reservation.options?.reduce((sum, option) => sum + (option.optionPrice ?? 0), 0) ?? 0

    const entry = staffMap.get(staffId) ?? emptyStaffEntry(staffName)

    entry.salesAmount += price
    entry.storeRevenue += reservation.storeRevenue ?? 0
    entry.staffRevenue += reservation.staffRevenue ?? 0
    entry.discountAmount += reservation.discountAmount ?? 0
    entry.hotelExpense += reservation.hotelExpense ?? 0
    entry.welfareExpense += reservation.welfareExpense ?? 0
    if (isCardPayment(reservation.paymentMethod)) {
      entry.cardCount += 1
      entry.cardAmount += price
    } else {
      entry.cashCount += 1
      entry.cashAmount += price
    }
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
      storeRevenue: data.storeRevenue,
      staffRevenue: data.staffRevenue,
      cashCount: data.cashCount,
      cashAmount: data.cashAmount,
      cardCount: data.cardCount,
      cardAmount: data.cardAmount,
      discountAmount: data.discountAmount,
      hotelExpense: data.hotelExpense,
      welfareExpense: data.welfareExpense,
      customerCount: data.customerCount,
      designationCount: data.designationCount,
      optionSales: data.optionSales,
    })
  )

  const totalSales = staffReports.reduce((sum, staff) => sum + staff.salesAmount, 0)
  const totalStoreRevenue = staffReports.reduce((sum, staff) => sum + staff.storeRevenue, 0)
  const totalStaffRevenue = staffReports.reduce((sum, staff) => sum + staff.staffRevenue, 0)
  const totalCashAmount = staffReports.reduce((sum, staff) => sum + staff.cashAmount, 0)
  const totalCardAmount = staffReports.reduce((sum, staff) => sum + staff.cardAmount, 0)
  const totalCustomers = staffReports.reduce((sum, staff) => sum + staff.customerCount, 0)
  const totalWorkingHours = staffReports.reduce((sum, staff) => sum + staff.workingHours, 0)

  return {
    date,
    totalSales,
    totalStoreRevenue,
    totalStaffRevenue,
    totalCashAmount,
    totalCardAmount,
    totalCustomers,
    totalWorkingHours,
    staffReports,
  }
}
