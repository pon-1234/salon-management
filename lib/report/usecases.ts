import { DailyReport, StaffDailyReport } from './types'
import { db } from '@/lib/db'
import { addMinutes, differenceInMinutes, endOfDay, startOfDay } from 'date-fns'
import { Reservation } from '@prisma/client'

const FALLBACK_STORE_ID = 'ikebukuro'

function getDesignationCount(reservation: Reservation): number {
  if (!reservation.designationType) return 0
  return reservation.designationType === 'none' ? 0 : 1
}

export async function generateDailyReport(
  date: string,
  storeId: string = FALLBACK_STORE_ID
): Promise<DailyReport> {
  const targetDate = new Date(`${date}T00:00:00`)
  const start = startOfDay(targetDate)
  const end = endOfDay(targetDate)

  const reservations = await db.reservation.findMany({
    where: {
      storeId,
      status: { not: 'cancelled' },
      startTime: {
        gte: start,
        lte: end,
      },
    },
    include: {
      cast: true,
      options: true,
    },
  })

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

  for (const reservation of reservations) {
    const staffId = reservation.castId ?? 'unknown'
    const staffName = reservation.cast?.name ?? '未設定'
    const startTime = reservation.startTime ?? start
    const endTime = reservation.endTime ?? addMinutes(startTime, 60)
    const duration = Math.max(differenceInMinutes(endTime, startTime), 0)
    const price = reservation.price ?? 0
    const optionSales = reservation.options?.reduce((sum, option) => sum + (option.optionPrice ?? 0), 0) ?? 0

    const entry =
      staffMap.get(staffId) ?? {
        name: staffName,
        totalMinutes: 0,
        salesAmount: 0,
        customerCount: 0,
        designationCount: 0,
        optionSales: 0,
      }

    entry.totalMinutes += duration
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
