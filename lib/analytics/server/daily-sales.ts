import { addDays, endOfDay, format, startOfDay } from 'date-fns'
import { differenceInMinutes } from 'date-fns'
import { db } from '@/lib/db'
import { DailySalesData, DailyStaffSales } from '@/lib/types/daily-sales'

const FALLBACK_STORE_ID = 'ikebukuro'

type CategorizedPayment = 'cash' | 'card' | 'other'

function categorizePayment(method: string | null | undefined): CategorizedPayment {
  if (!method) return 'other'
  const normalized = method.toLowerCase()
  if (normalized.includes('card') || normalized.includes('カード')) {
    return 'card'
  }
  if (
    normalized.includes('cash') ||
    normalized.includes('現金') ||
    normalized.includes('手渡し')
  ) {
    return 'cash'
  }
  return 'other'
}

function formatWorkingHours(totalMinutes: number): string {
  if (totalMinutes <= 0) {
    return '0時間'
  }
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (minutes === 0) {
    return `${hours}時間`
  }
  if (hours === 0) {
    return `${minutes}分`
  }
  return `${hours}時間${minutes}分`
}

interface StaffAggregation {
  staffId: string
  staffName: string
  earliestStart: Date | null
  latestEnd: Date | null
  totalMinutes: number
  cashCount: number
  cashAmount: number
  cardCount: number
  cardAmount: number
  totalTransactions: number
  discountRegular: number
  discountHotel: number
  totalAmount: number
  staffFee: number
  staffSales: number
  salesCash: number
  salesCard: number
  salesTotal: number
  currentBalance: number
}

export async function getDailySalesReport(
  date: Date,
  storeId: string = FALLBACK_STORE_ID
): Promise<DailySalesData> {
  const start = startOfDay(date)
  const end = endOfDay(date)
  const weekStart = addDays(start, -6)

  const weeklyReservations = await db.reservation.findMany({
    where: {
      storeId,
      status: { not: 'cancelled' },
      startTime: {
        gte: weekStart,
        lte: end,
      },
    },
    include: {
      cast: true,
    },
  })

  const reservations = weeklyReservations.filter(
    (reservation) =>
      reservation.startTime &&
      reservation.startTime >= start &&
      reservation.startTime <= end
  )

  const staffMap = new Map<string, StaffAggregation>()

  for (const reservation of reservations) {
    const staffId = reservation.castId ?? 'unknown'
    const staffName = reservation.cast?.name ?? '未設定'
    const startTime = reservation.startTime ?? start
    const endTime = reservation.endTime ?? reservation.startTime ?? end
    const durationMinutes = Math.max(differenceInMinutes(endTime, startTime), 0)
    const paymentCategory = categorizePayment(reservation.paymentMethod)
    const price = reservation.price ?? 0
    const staffRevenue = reservation.staffRevenue ?? 0

    const aggregation = staffMap.get(staffId) ?? {
      staffId,
      staffName,
      earliestStart: null,
      latestEnd: null,
      totalMinutes: 0,
      cashCount: 0,
      cashAmount: 0,
      cardCount: 0,
      cardAmount: 0,
      totalTransactions: 0,
      discountRegular: 0,
      discountHotel: 0,
      totalAmount: 0,
      staffFee: 0,
      staffSales: 0,
      salesCash: 0,
      salesCard: 0,
      salesTotal: 0,
      currentBalance: 0,
    }

    aggregation.totalMinutes += durationMinutes
    aggregation.totalTransactions += 1
    aggregation.totalAmount += price
    aggregation.staffFee += staffRevenue
    aggregation.staffSales += staffRevenue
    aggregation.salesTotal += price

    if (paymentCategory === 'cash') {
      aggregation.cashCount += 1
      aggregation.cashAmount += price
      aggregation.salesCash += price
      aggregation.currentBalance += price
    } else if (paymentCategory === 'card') {
      aggregation.cardCount += 1
      aggregation.cardAmount += price
      aggregation.salesCard += price
    }

    if (!aggregation.earliestStart || startTime < aggregation.earliestStart) {
      aggregation.earliestStart = startTime
    }
    if (!aggregation.latestEnd || endTime > aggregation.latestEnd) {
      aggregation.latestEnd = endTime
    }

    staffMap.set(staffId, aggregation)
  }

  const aggregations = Array.from(staffMap.values())

  const staffSales: DailyStaffSales[] = aggregations.map((item) => {
    const startLabel = item.earliestStart ? format(item.earliestStart, 'HH:mm') : '--:--'
    const endLabel = item.latestEnd ? format(item.latestEnd, 'HH:mm') : '--:--'

    return {
      staffId: item.staffId,
      staffName: item.staffName,
      workingHours: {
        start: startLabel,
        end: endLabel,
        total: formatWorkingHours(item.totalMinutes),
      },
      cashTransactions: {
        count: item.cashCount,
        amount: item.cashAmount,
      },
      cardTransactions: {
        count: item.cardCount,
        amount: item.cardAmount,
      },
      totalTransactions: item.totalTransactions,
      discounts: {
        regular: item.discountRegular,
        hotel: item.discountHotel,
      },
      totalAmount: item.totalAmount,
      staffFee: item.staffFee,
      staffSales: item.staffSales,
      sales: {
        cash: item.salesCash,
        card: item.salesCard,
        total: item.salesTotal,
      },
      currentBalance: item.currentBalance,
    }
  })

  const totals = aggregations.reduce(
    (acc, staff) => {
      acc.cashTransactions.count += staff.cashCount
      acc.cashTransactions.amount += staff.cashAmount
      acc.cardTransactions.count += staff.cardCount
      acc.cardTransactions.amount += staff.cardAmount
      acc.totalTransactions += staff.totalTransactions
      acc.discounts.regular += staff.discountRegular
      acc.discounts.hotel += staff.discountHotel
      acc.totalAmount += staff.totalAmount
      acc.staffFee += staff.staffFee
      acc.staffSales += staff.staffSales
      acc.sales.cash += staff.salesCash
      acc.sales.card += staff.salesCard
      acc.sales.total += staff.salesTotal
      acc.currentBalance += staff.currentBalance
      return acc
    },
    {
      cashTransactions: { count: 0, amount: 0 },
      cardTransactions: { count: 0, amount: 0 },
      totalTransactions: 0,
      discounts: { regular: 0, hotel: 0 },
      totalAmount: 0,
      staffFee: 0,
      staffSales: 0,
      sales: { cash: 0, card: 0, total: 0 },
      currentBalance: 0,
    }
  )

  const totalWorkingMinutes = aggregations.reduce((sum, staff) => sum + staff.totalMinutes, 0)

  const hourlyMap = new Map<
    number,
    {
      sales: number
      customers: number
    }
  >()

  reservations.forEach((reservation) => {
    if (!reservation.startTime) return
    const hour = reservation.startTime.getHours()
    const entry = hourlyMap.get(hour) ?? { sales: 0, customers: 0 }
    entry.sales += reservation.price ?? 0
    entry.customers += 1
    hourlyMap.set(hour, entry)
  })

  const hourlyBreakdown = Array.from({ length: 24 }, (_, hour) => {
    const entry = hourlyMap.get(hour) ?? { sales: 0, customers: 0 }
    return {
      hour: `${hour.toString().padStart(2, '0')}:00`,
      sales: entry.sales,
      customers: entry.customers,
    }
  })

  const weeklyMap = new Map<string, number>()
  weeklyReservations.forEach((reservation) => {
    if (!reservation.startTime) return
    const key = format(reservation.startTime, 'yyyy-MM-dd')
    weeklyMap.set(key, (weeklyMap.get(key) ?? 0) + (reservation.price ?? 0))
  })

  const weeklyTrend = Array.from({ length: 7 }, (_, index) => {
    const day = addDays(start, index - 6)
    const key = format(day, 'yyyy-MM-dd')
    return {
      date: format(day, 'MM/dd'),
      sales: weeklyMap.get(key) ?? 0,
    }
  })

  return {
    date: format(start, 'yyyy-MM-dd'),
    totalStaff: staffSales.length,
    totalWorkingHours: Math.round((totalWorkingMinutes / 60) * 100) / 100,
    staffSales,
    totals,
    hourlyBreakdown,
    weeklyTrend,
  }
}
