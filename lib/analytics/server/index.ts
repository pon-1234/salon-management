import {
  addDays,
  addMonths,
  addYears,
  eachDayOfInterval,
  eachMonthOfInterval,
  endOfMonth,
  endOfYear,
  getDaysInMonth,
  startOfMonth,
  startOfYear,
  startOfDay,
  endOfDay,
  format,
  differenceInMinutes,
} from 'date-fns'
import { db } from '@/lib/db'
import {
  DailyData,
  MarketingChannelData,
  MonthlyData,
  StaffPerformanceData,
  CourseSalesData,
  OptionSalesData,
  OptionCombinationData,
  MonthlyStaffSummary,
  MonthlyAreaSummary,
} from '@/lib/types/analytics'
import { AreaSalesData } from '@/lib/types/area-sales'
import { DistrictSalesReport } from '@/lib/types/district-sales'
import { HourlySalesReport, TimeSlotSummary } from '@/lib/types/hourly-sales'
import { DailyReport } from '@/lib/report/types'
import {
  ReservationWithRelations,
  buildCustomerFirstReservationMap,
  fetchReservationsBetween,
  normaliseStoreId,
} from './common'
import { getDailySalesReport } from './daily-sales'
import { generateDailyReport } from '@/lib/report/usecases'
const HOURS_RANGE = Array.from({ length: 21 }, (_, i) => i + 7) // 7 -> 27

function sumStaffRevenue(reservations: ReservationWithRelations[]): number {
  return reservations.reduce((sum, reservation) => sum + (reservation.staffRevenue ?? 0), 0)
}

function sumStoreRevenue(reservations: ReservationWithRelations[]): number {
  return reservations.reduce((sum, reservation) => {
    if (typeof reservation.storeRevenue === 'number') {
      return sum + reservation.storeRevenue
    }
    const staffRevenue = reservation.staffRevenue ?? 0
    return sum + Math.max((reservation.price ?? 0) - staffRevenue, 0)
  }, 0)
}

function getReservationDuration(reservation: ReservationWithRelations): number {
  const start = reservation.startTime
  const end = reservation.endTime ?? reservation.startTime
  if (!start || !end) {
    return 0
  }
  return Math.max(differenceInMinutes(end, start), 0)
}

function categorizePayment(method: string | null | undefined): 'cash' | 'card' | 'other' {
  if (!method) return 'other'
  const normalized = method.toLowerCase()
  if (normalized.includes('card') || normalized.includes('カード')) return 'card'
  if (normalized.includes('cash') || normalized.includes('現金')) return 'cash'
  return 'other'
}

function extractPrefecture(reservation: ReservationWithRelations): string {
  return reservation.area?.prefecture ?? reservation.area?.name ?? '未設定'
}

function extractDistrict(reservation: ReservationWithRelations): string {
  return reservation.area?.city ?? reservation.area?.name ?? '未分類'
}

function extractMarketingChannel(reservation: ReservationWithRelations): string {
  return reservation.marketingChannel ?? '不明'
}

function incrementPrefectureCounter(
  map: Map<string, number>,
  reservation: ReservationWithRelations
) {
  const prefecture = extractPrefecture(reservation)
  map.set(prefecture, (map.get(prefecture) ?? 0) + 1)
}

function buildTimeSlotSummary(hourlyTotals: number[]): TimeSlotSummary[] {
  const total = hourlyTotals.reduce((sum, value) => sum + value, 0)
  if (total === 0) {
    return HOURS_RANGE.map((hour) => ({
      range: `${hour}:00`,
      count: 0,
      percentage: 0,
    }))
  }

  return HOURS_RANGE.map((hour, index) => ({
    range: `${hour}:00`,
    count: hourlyTotals[index],
    percentage: Math.round((hourlyTotals[index] / total) * 100),
  }))
}

export async function getMonthlyAnalytics(
  year: number,
  storeId?: string
): Promise<MonthlyData[]> {
  const normalizedStoreId = normaliseStoreId(storeId)
  const start = startOfYear(new Date(year, 0, 1))
  const end = endOfYear(start)
  const previousStart = addYears(start, -1)
  const previousEnd = addYears(end, -1)

  const [reservations, previousReservations, firstReservationMap] = await Promise.all([
    fetchReservationsBetween(normalizedStoreId, start, end),
    fetchReservationsBetween(normalizedStoreId, previousStart, previousEnd),
    buildCustomerFirstReservationMap(normalizedStoreId),
  ])

  return eachMonthOfInterval({ start, end }).map((monthDate) => {
    const monthStart = startOfMonth(monthDate)
    const monthEnd = endOfMonth(monthDate)
    const daysInMonth = getDaysInMonth(monthDate)

    const monthReservations = reservations.filter(
      (reservation) =>
        reservation.startTime &&
        reservation.startTime >= monthStart &&
        reservation.startTime <= monthEnd
    )

    const previousMonthReservations = previousReservations.filter(
      (reservation) =>
        reservation.startTime &&
        reservation.startTime >= addYears(monthStart, -1) &&
        reservation.startTime <= addYears(monthEnd, -1)
    )

    const uniqueCastIds = new Set(monthReservations.map((reservation) => reservation.castId))
    uniqueCastIds.delete(null)

    const uniqueWorkDays = new Set(
      monthReservations
        .map((reservation) =>
          reservation.startTime ? format(reservation.startTime, 'yyyy-MM-dd') : null
        )
        .filter((value): value is string => Boolean(value))
    )

    const totalSales = monthReservations.reduce((sum, reservation) => sum + (reservation.price ?? 0), 0)
    const cashSales = monthReservations
      .filter((reservation) => categorizePayment(reservation.paymentMethod) === 'cash')
      .reduce((sum, reservation) => sum + (reservation.price ?? 0), 0)
    const cardReservations = monthReservations.filter(
      (reservation) => categorizePayment(reservation.paymentMethod) === 'card'
    )
    const cardSales = cardReservations.reduce((sum, reservation) => sum + (reservation.price ?? 0), 0)

    const totalTransactions = monthReservations.length
    const staffRevenue = sumStaffRevenue(monthReservations)
    const storeRevenue = sumStoreRevenue(monthReservations)

    let newCustomers = 0
    monthReservations.forEach((reservation) => {
      if (reservation.customerId) {
        const first = firstReservationMap.get(reservation.customerId)
        if (first && first >= monthStart && first <= monthEnd) {
          newCustomers += 1
        }
      }
    })

    const prefectureCounter = new Map<string, number>()
    monthReservations.forEach((reservation) => incrementPrefectureCounter(prefectureCounter, reservation))

    const tokyoCount = prefectureCounter.get('東京都') ?? 0
    const kanagawaCount = prefectureCounter.get('神奈川県') ?? 0

    const previousTotalSales = previousMonthReservations.reduce(
      (sum, reservation) => sum + (reservation.price ?? 0),
      0
    )
    const previousYearRatio =
      previousTotalSales > 0 ? Math.round((totalSales / previousTotalSales) * 100) / 100 : 1

    const totalMinutes = monthReservations.reduce(
      (sum, reservation) => sum + getReservationDuration(reservation),
      0
    )

    return {
      month: monthDate.getMonth() + 1,
      days: daysInMonth,
      staffCount: uniqueCastIds.size,
      workingDays: uniqueWorkDays.size,
      workingHours: Math.round((totalMinutes / 60) * 100) / 100,
      cashSales,
      cardCount: cardReservations.length,
      cardSales,
      turnoverRate:
        uniqueCastIds.size > 0
          ? Math.round((totalTransactions / uniqueCastIds.size) * 100) / 100
          : 0,
      tokyoCount,
      kanagawaCount,
      totalCount: totalTransactions,
      totalSales,
      salesPerCustomer:
        totalTransactions > 0 ? Math.round(totalSales / totalTransactions) : 0,
      discounts: 0,
      pointRewards: 0,
      totalRevenue: storeRevenue + staffRevenue,
      outsourcingCost: 0,
      welfareCost: 0,
      newCustomerCount: newCustomers,
      repeatCustomerCount: Math.max(totalTransactions - newCustomers, 0),
      storeSales: storeRevenue,
      previousYearRatio,
      storeSalesRatio: totalSales > 0 ? Math.round((storeRevenue / totalSales) * 100) / 100 : 0,
    }
  })
}

export async function getMonthlyStaffSummary(
  year: number,
  month: number,
  storeId?: string
): Promise<MonthlyStaffSummary[]> {
  const normalizedStoreId = normaliseStoreId(storeId)
  const targetMonth = new Date(year, month - 1, 1)
  const start = startOfMonth(targetMonth)
  const end = endOfMonth(targetMonth)

  const [reservations, firstReservationMap] = await Promise.all([
    fetchReservationsBetween(normalizedStoreId, start, end),
    buildCustomerFirstReservationMap(normalizedStoreId),
  ])

  const staffMap = new Map<
    string,
    {
      name: string
      days: Set<string>
      customerCount: number
      totalSales: number
      newCustomers: number
      repeaters: number
    }
  >()

  reservations.forEach((reservation) => {
    const castId = reservation.castId ?? 'unknown'
    const castName = reservation.cast?.name ?? '未設定'
    const price = reservation.price ?? 0
    const workDay = reservation.startTime ? format(reservation.startTime, 'yyyy-MM-dd') : null

    const entry =
      staffMap.get(castId) ??
      {
        name: castName,
        days: new Set<string>(),
        customerCount: 0,
        totalSales: 0,
        newCustomers: 0,
        repeaters: 0,
      }

    if (workDay) {
      entry.days.add(workDay)
    }

    entry.customerCount += 1
    entry.totalSales += price

    let isNewCustomer = false
    if (reservation.customerId) {
      const firstReservation = firstReservationMap.get(reservation.customerId)
      if (firstReservation && firstReservation >= start && firstReservation <= end) {
        isNewCustomer = true
      }
    }

    if (isNewCustomer) {
      entry.newCustomers += 1
    } else {
      entry.repeaters += 1
    }

    entry.name = castName
    staffMap.set(castId, entry)
  })

  return Array.from(staffMap.entries())
    .map(([castId, data]) => ({
      id: castId,
      name: data.name,
      workDays: data.days.size,
      customerCount: data.customerCount,
      totalSales: data.totalSales,
      averagePerCustomer:
        data.customerCount > 0 ? Math.round(data.totalSales / data.customerCount) : 0,
      newCustomers: data.newCustomers,
      repeaters: data.repeaters,
    }))
    .sort((a, b) => b.totalSales - a.totalSales)
}

export async function getMonthlyAreaSummary(
  year: number,
  month: number,
  storeId?: string
): Promise<MonthlyAreaSummary[]> {
  const normalizedStoreId = normaliseStoreId(storeId)
  const targetMonth = new Date(year, month - 1, 1)
  const start = startOfMonth(targetMonth)
  const end = endOfMonth(targetMonth)
  const previousStart = startOfMonth(addMonths(targetMonth, -1))
  const previousEnd = endOfMonth(previousStart)

  const [reservations, previousReservations, firstReservationMap] = await Promise.all([
    fetchReservationsBetween(normalizedStoreId, start, end),
    fetchReservationsBetween(normalizedStoreId, previousStart, previousEnd),
    buildCustomerFirstReservationMap(normalizedStoreId),
  ])

  const areaMap = new Map<
    string,
    {
      customerCount: number
      totalSales: number
      newCustomers: number
      repeaters: number
    }
  >()

  reservations.forEach((reservation) => {
    const areaName =
      reservation.area?.name ??
      reservation.area?.city ??
      reservation.area?.prefecture ??
      '未設定'
    const price = reservation.price ?? 0

    const entry =
      areaMap.get(areaName) ??
      {
        customerCount: 0,
        totalSales: 0,
        newCustomers: 0,
        repeaters: 0,
      }

    entry.customerCount += 1
    entry.totalSales += price

    let isNewCustomer = false
    if (reservation.customerId) {
      const firstReservation = firstReservationMap.get(reservation.customerId)
      if (firstReservation && firstReservation >= start && firstReservation <= end) {
        isNewCustomer = true
      }
    }

    if (isNewCustomer) {
      entry.newCustomers += 1
    } else {
      entry.repeaters += 1
    }

    areaMap.set(areaName, entry)
  })

  const previousSalesMap = new Map<string, number>()
  previousReservations.forEach((reservation) => {
    const areaName =
      reservation.area?.name ??
      reservation.area?.city ??
      reservation.area?.prefecture ??
      '未設定'
    const price = reservation.price ?? 0
    previousSalesMap.set(areaName, (previousSalesMap.get(areaName) ?? 0) + price)
  })

  return Array.from(areaMap.entries())
    .map(([area, data]) => {
      const previousSales = previousSalesMap.get(area) ?? 0
      const growthRate =
        previousSales > 0
          ? Math.round(((data.totalSales - previousSales) / previousSales) * 1000) / 10
          : data.totalSales > 0
            ? 100
            : 0

      return {
        area,
        customerCount: data.customerCount,
        newCustomers: data.newCustomers,
        repeaters: data.repeaters,
        totalSales: data.totalSales,
        averagePerCustomer:
          data.customerCount > 0 ? Math.round(data.totalSales / data.customerCount) : 0,
        growthRate,
      }
    })
    .sort((a, b) => b.totalSales - a.totalSales)
}

export async function getDailyAnalytics(
  year: number,
  month: number,
  storeId?: string
): Promise<DailyData[]> {
  const normalizedStoreId = normaliseStoreId(storeId)
  const targetMonth = new Date(year, month - 1, 1)
  const start = startOfMonth(targetMonth)
  const end = endOfMonth(targetMonth)

  const [reservations, firstReservationMap] = await Promise.all([
    fetchReservationsBetween(normalizedStoreId, start, end),
    buildCustomerFirstReservationMap(normalizedStoreId),
  ])

  return eachDayOfInterval({ start, end }).map((day) => {
    const dayReservations = reservations.filter(
      (reservation) =>
        reservation.startTime &&
        reservation.startTime >= startOfDay(day) &&
        reservation.startTime <= endOfDay(day)
    )

    const totalSales = dayReservations.reduce(
      (sum, reservation) => sum + (reservation.price ?? 0),
      0
    )
    const cashReservations = dayReservations.filter(
      (reservation) => categorizePayment(reservation.paymentMethod) === 'cash'
    )
    const cashSales = cashReservations.reduce(
      (sum, reservation) => sum + (reservation.price ?? 0),
      0
    )
    const cardReservations = dayReservations.filter(
      (reservation) => categorizePayment(reservation.paymentMethod) === 'card'
    )
    const cardSales = cardReservations.reduce(
      (sum, reservation) => sum + (reservation.price ?? 0),
      0
    )

    const uniqueCastIds = new Set(dayReservations.map((reservation) => reservation.castId))
    uniqueCastIds.delete(null)

    const totalMinutes = dayReservations.reduce(
      (sum, reservation) => sum + getReservationDuration(reservation),
      0
    )
    let newCustomers = 0
    dayReservations.forEach((reservation) => {
      if (reservation.customerId) {
        const first = firstReservationMap.get(reservation.customerId)
        if (first && format(first, 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd')) {
          newCustomers += 1
        }
      }
    })

    const staffRevenue = sumStaffRevenue(dayReservations)
    const storeRevenue = sumStoreRevenue(dayReservations)

    return {
      date: day.getDate(),
      dayOfWeek: ['日', '月', '火', '水', '木', '金', '土'][day.getDay()],
      staffCount: uniqueCastIds.size,
      workingHours: Math.round((totalMinutes / 60) * 100) / 100,
      directSales: cashSales,
      cardSales,
      pointRewards: 0,
      totalSales,
      staffSales: staffRevenue,
      storeSales: storeRevenue,
      cashSales,
      customerCount: dayReservations.length,
      turnoverRate:
        uniqueCastIds.size > 0
          ? Math.round((dayReservations.length / uniqueCastIds.size) * 100) / 100
          : 0,
      newCustomers,
      repeaters: Math.max(dayReservations.length - newCustomers, 0),
      discounts: 0,
      pointUsage: 0,
    }
  })
}

export async function getStaffPerformanceReport(
  storeId?: string,
  months: number = 2
): Promise<StaffPerformanceData[]> {
  const normalizedStoreId = normaliseStoreId(storeId)
  const end = endOfDay(new Date())
  const start = startOfDay(addMonths(end, -months))

  const reservations = await fetchReservationsBetween(normalizedStoreId, start, end)
  const firstReservationMap = await buildCustomerFirstReservationMap(normalizedStoreId)

  const castMap = new Map<
    string,
    {
      name: string
      age: number
      workDays: Set<string>
      cashCount: number
      cashAmount: number
      cardCount: number
      cardAmount: number
      totalTransactions: number
      newFree: number
      newPaid: number
      designationRegular: number
      designationTotal: number
      totalAmount: number
      staffFee: number
      staffRevenue: number
      storeRevenue: number
    }
  >()

  reservations.forEach((reservation) => {
    const castId = reservation.castId ?? 'unknown'
    const castName = reservation.cast?.name ?? '未設定'
    const castAge = reservation.cast?.age ?? 0
    const workDay = reservation.startTime ? format(reservation.startTime, 'yyyy-MM-dd') : null
    const payment = categorizePayment(reservation.paymentMethod)
    const price = reservation.price ?? 0
    const staffRevenue = reservation.staffRevenue ?? 0
    const storeRevenue =
      reservation.storeRevenue ?? Math.max(price - staffRevenue - (reservation.transportationFee ?? 0), 0)

    const entry =
      castMap.get(castId) ?? {
        name: castName,
        age: castAge,
        workDays: new Set<string>(),
        cashCount: 0,
        cashAmount: 0,
        cardCount: 0,
        cardAmount: 0,
        totalTransactions: 0,
        newFree: 0,
        newPaid: 0,
        designationRegular: 0,
        designationTotal: 0,
        totalAmount: 0,
        staffFee: 0,
        staffRevenue: 0,
        storeRevenue: 0,
      }

    if (workDay) {
      entry.workDays.add(workDay)
    }
    if (payment === 'cash') {
      entry.cashCount += 1
      entry.cashAmount += price
    } else if (payment === 'card') {
      entry.cardCount += 1
      entry.cardAmount += price
    }

    entry.totalTransactions += 1
    entry.totalAmount += price
    entry.staffRevenue += staffRevenue
    entry.storeRevenue += storeRevenue
    entry.staffFee += reservation.transportationFee ?? 0

    if (reservation.designationType && reservation.designationType !== 'none') {
      entry.designationTotal += 1
      if (reservation.designationType === 'regular') {
        entry.designationRegular += 1
      }
    }

    if (reservation.customerId) {
      const firstReservation = firstReservationMap.get(reservation.customerId)
      if (firstReservation && firstReservation >= start && firstReservation <= end) {
        if (reservation.designationType && reservation.designationType !== 'none') {
          entry.newPaid += 1
        } else {
          entry.newFree += 1
        }
      }
    }

    castMap.set(castId, entry)
  })

  const totalDays = Math.max(differenceInMinutes(end, start) / (60 * 24), 1)

  return Array.from(castMap.entries()).map(([castId, data]) => {
    const designationRate =
      data.designationTotal > 0
        ? Math.round((data.designationRegular / data.designationTotal) * 100)
        : 0

    return {
      id: castId,
      name: data.name,
      age: data.age,
      workDays: `${data.workDays.size}/${Math.round(totalDays)}`,
      cashTransactions: {
        count: data.cashCount,
        amount: data.cashAmount,
      },
      cardTransactions: {
        count: data.cardCount,
        amount: data.cardAmount,
      },
      totalTransactions: data.totalTransactions,
      newCustomers: {
        free: data.newFree,
        paid: data.newPaid,
      },
      designations: {
        regular: data.designationRegular,
        total: data.designationTotal,
        rate: designationRate,
      },
      discount: 0,
      totalAmount: data.totalAmount,
      staffFee: data.staffFee,
      staffRevenue: data.staffRevenue,
      storeRevenue: data.storeRevenue,
    }
  })
}

export async function getCourseSalesReport(
  year: number,
  month: number,
  storeId?: string
): Promise<CourseSalesData[]> {
  const normalizedStoreId = normaliseStoreId(storeId)
  const targetMonth = new Date(year, month - 1, 1)
  const start = startOfMonth(targetMonth)
  const end = endOfMonth(targetMonth)
  const reservations = await fetchReservationsBetween(normalizedStoreId, start, end)

  const courseMap = new Map<
    string,
    {
      name: string
      duration: number
      price: number
      dailySales: number[]
    }
  >()

  reservations.forEach((reservation) => {
    if (!reservation.courseId) return
    const course = reservation.course
    const daysInMonth = getDaysInMonth(targetMonth)

    const entry =
      courseMap.get(reservation.courseId) ??
      {
        name: course?.name ?? '未設定',
        duration: course?.duration ?? 0,
        price: course?.price ?? 0,
        dailySales: Array(daysInMonth).fill(0),
      }

    const day = reservation.startTime ? reservation.startTime.getDate() : null
    if (day) {
      entry.dailySales[day - 1] += 1
    }

    courseMap.set(reservation.courseId, entry)
  })

  return Array.from(courseMap.entries()).map(([courseId, data]) => ({
    id: courseId,
    name: data.name,
    duration: data.duration,
    price: data.price,
    sales: data.dailySales,
  }))
}

export async function getOptionSalesReport(
  year: number,
  storeId?: string
): Promise<OptionSalesData[]> {
  const normalizedStoreId = normaliseStoreId(storeId)
  const yearStart = startOfYear(new Date(year, 0, 1))
  const yearEnd = endOfYear(yearStart)

  const reservationOptions = await db.reservationOption.findMany({
    where: {
      reservation: {
        storeId: normalizedStoreId,
        status: { not: 'cancelled' },
        startTime: {
          gte: yearStart,
          lte: yearEnd,
        },
      },
    },
    include: {
      option: true,
      reservation: true,
    },
  })

  const optionMap = new Map<
    string,
    {
      name: string
      price: number
      monthlySales: number[]
    }
  >()

  reservationOptions.forEach((entry) => {
    const optionId = entry.optionId ?? entry.option?.id
    if (!optionId || !entry.reservation?.startTime) return

    const month = entry.reservation.startTime.getMonth()
    const optionName = entry.option?.name ?? entry.optionName ?? '未設定'
    const optionPrice = entry.option?.price ?? entry.optionPrice ?? 0

    const optionEntry =
      optionMap.get(optionId) ??
      {
        name: optionName,
        price: optionPrice,
        monthlySales: Array(12).fill(0),
      }

    optionEntry.monthlySales[month] += 1
    optionMap.set(optionId, optionEntry)
  })

  return Array.from(optionMap.entries()).map(([optionId, data]) => ({
    id: optionId,
    name: data.name,
    price: data.price,
    monthlySales: data.monthlySales,
  }))
}

export async function getOptionCombinationReport(
  year: number,
  storeId?: string
): Promise<OptionCombinationData[]> {
  const normalizedStoreId = normaliseStoreId(storeId)
  const yearStart = startOfYear(new Date(year, 0, 1))
  const yearEnd = endOfYear(yearStart)

  const reservations = await fetchReservationsBetween(normalizedStoreId, yearStart, yearEnd)

  const courseTotals = new Map<
    string,
    {
      name: string
      count: number
    }
  >()

  const combinationMap = new Map<
    string,
    {
      courseId: string
      courseName: string
      optionId: string
      optionName: string
      count: number
      optionRevenue: number
      reservationRevenue: number
    }
  >()

  reservations.forEach((reservation) => {
    const courseId = reservation.courseId
    if (!courseId) return

    const courseName = reservation.course?.name ?? '未設定'
    const courseEntry = courseTotals.get(courseId) ?? {
      name: courseName,
      count: 0,
    }
    courseEntry.count += 1
    courseTotals.set(courseId, courseEntry)

    const reservationTotal = reservation.price ?? 0

    reservation.options?.forEach((optionEntry) => {
      const optionId = optionEntry.optionId ?? optionEntry.option?.id
      if (!optionId) return

      const optionName = optionEntry.option?.name ?? optionEntry.optionName ?? '未設定'
      const key = `${courseId}:${optionId}`
      const combination =
        combinationMap.get(key) ??
        {
          courseId,
          courseName,
          optionId,
          optionName,
          count: 0,
          optionRevenue: 0,
          reservationRevenue: 0,
        }

      combination.count += 1
      combination.optionRevenue += optionEntry.optionPrice ?? optionEntry.option?.price ?? 0
      combination.reservationRevenue += reservationTotal

      combinationMap.set(key, combination)
    })
  })

  return Array.from(combinationMap.values())
    .map((entry) => {
      const courseStats = courseTotals.get(entry.courseId)
      const attachRate = courseStats && courseStats.count > 0
        ? Math.round((entry.count / courseStats.count) * 1000) / 10
        : 0
      const averageSpending = entry.count > 0
        ? Math.round(entry.reservationRevenue / entry.count)
        : 0

      return {
        courseId: entry.courseId,
        courseName: entry.courseName,
        optionId: entry.optionId,
        optionName: entry.optionName,
        count: entry.count,
        revenue: entry.optionRevenue,
        attachRate,
        averageSpending,
      }
    })
    .sort((a, b) => b.revenue - a.revenue)
}

export async function getMarketingChannelReport(
  year: number,
  storeId?: string
): Promise<MarketingChannelData[]> {
  const normalizedStoreId = normaliseStoreId(storeId)
  const yearStart = startOfYear(new Date(year, 0, 1))
  const yearEnd = endOfYear(yearStart)

  const reservations = await fetchReservationsBetween(normalizedStoreId, yearStart, yearEnd)

  const channelMap = new Map<
    string,
    {
      monthlySales: number[]
    }
  >()

  reservations.forEach((reservation) => {
    if (!reservation.startTime) return
    const month = reservation.startTime.getMonth()
    const channel = extractMarketingChannel(reservation)

    const entry = channelMap.get(channel) ?? {
      monthlySales: Array(12).fill(0),
    }

    entry.monthlySales[month] += 1
    channelMap.set(channel, entry)
  })

  return Array.from(channelMap.entries()).map(([channel, data]) => ({
    channel,
    monthlySales: data.monthlySales,
    total: data.monthlySales.reduce((sum, value) => sum + value, 0),
  }))
}

export async function getAreaSalesReport(
  year: number,
  storeId?: string
): Promise<AreaSalesData[]> {
  const normalizedStoreId = normaliseStoreId(storeId)
  const yearStart = startOfYear(new Date(year, 0, 1))
  const yearEnd = endOfYear(yearStart)

  const reservations = await fetchReservationsBetween(normalizedStoreId, yearStart, yearEnd)

  const areaMap = new Map<
    string,
    {
      monthlySales: number[]
      monthlyCustomers: number[]
    }
  >()

  reservations.forEach((reservation) => {
    const startTime = reservation.startTime
    if (!startTime) return

    const monthIndex = startTime.getMonth()
    const price = reservation.price ?? 0
    const areaName =
      reservation.area?.name ??
      reservation.area?.city ??
      reservation.area?.prefecture ??
      '未設定'

    const entry =
      areaMap.get(areaName) ?? {
        monthlySales: Array(12).fill(0),
        monthlyCustomers: Array(12).fill(0),
      }

    entry.monthlySales[monthIndex] += price
    entry.monthlyCustomers[monthIndex] += 1
    areaMap.set(areaName, entry)
  })

  return Array.from(areaMap.entries())
    .map(([area, values]) => {
      const total = values.monthlySales.reduce((sum, sale) => sum + sale, 0)
      const customerTotal = values.monthlyCustomers.reduce((sum, count) => sum + count, 0)

      return {
        area,
        monthlySales: values.monthlySales,
        total,
        monthlyCustomers: values.monthlyCustomers,
        customerTotal,
      }
    })
    .sort((a, b) => b.total - a.total)
}

export async function getAreaSalesReport(
  year: number,
  storeId?: string
): Promise<AreaSalesData[]> {
  const normalizedStoreId = normaliseStoreId(storeId)
  const yearStart = startOfYear(new Date(year, 0, 1))
  const yearEnd = endOfYear(yearStart)

  const reservations = await fetchReservationsBetween(normalizedStoreId, yearStart, yearEnd)

  const areaMap = new Map<
    string,
    {
      monthlySales: number[]
    }
  >()

  reservations.forEach((reservation) => {
    if (!reservation.startTime) return
    const prefecture = extractPrefecture(reservation)
    const month = reservation.startTime.getMonth()

    const entry = areaMap.get(prefecture) ?? {
      monthlySales: Array(12).fill(0),
    }

    entry.monthlySales[month] += reservation.price ?? 0
    areaMap.set(prefecture, entry)
  })

  return Array.from(areaMap.entries()).map(([area, data]) => ({
    area,
    monthlySales: data.monthlySales,
    total: data.monthlySales.reduce((sum, value) => sum + value, 0),
  }))
}

export async function getDistrictSalesReport(
  year: number,
  prefecture: string,
  storeId?: string
): Promise<DistrictSalesReport> {
  const normalizedStoreId = normaliseStoreId(storeId)
  const yearStart = startOfYear(new Date(year, 0, 1))
  const yearEnd = endOfYear(yearStart)

  const reservations = await fetchReservationsBetween(normalizedStoreId, yearStart, yearEnd)

  const districtMap = new Map<
    string,
    {
      monthlySales: number[]
    }
  >()

  reservations
    .filter((reservation) => extractPrefecture(reservation) === prefecture)
    .forEach((reservation) => {
      if (!reservation.startTime) return
      const district = extractDistrict(reservation)
      const month = reservation.startTime.getMonth()

      const entry = districtMap.get(district) ?? {
        monthlySales: Array(12).fill(0),
      }

      entry.monthlySales[month] += reservation.price ?? 0
      districtMap.set(district, entry)
    })

  const districts = Array.from(districtMap.entries()).map(([district, data]) => ({
    district,
    code: prefecture,
    monthlySales: data.monthlySales,
    total: data.monthlySales.reduce((sum, value) => sum + value, 0),
  }))

  const totalMonthlySales = Array(12).fill(0)
  districts.forEach((district) => {
    district.monthlySales.forEach((sale, index) => {
      totalMonthlySales[index] += sale
    })
  })

  return {
    year,
    area: prefecture,
    districts,
    total: {
      monthlySales: totalMonthlySales,
      total: totalMonthlySales.reduce((sum, value) => sum + value, 0),
    },
  }
}

export async function getHourlySalesReport(
  year: number,
  month: number,
  storeId?: string
): Promise<HourlySalesReport> {
  const normalizedStoreId = normaliseStoreId(storeId)
  const targetMonth = new Date(year, month - 1, 1)
  const start = startOfMonth(targetMonth)
  const end = endOfMonth(targetMonth)

  const reservations = await fetchReservationsBetween(normalizedStoreId, start, end)

  const daysInMonth = getDaysInMonth(targetMonth)
  const data = Array.from({ length: daysInMonth }, (_, index) => ({
    date: index + 1,
    dayOfWeek: ['日', '月', '火', '水', '木', '金', '土'][new Date(year, month - 1, index + 1).getDay()],
    hours: Array(HOURS_RANGE.length).fill(0),
    total: 0,
  }))

  const hourlyTotals = Array(HOURS_RANGE.length).fill(0)

  reservations.forEach((reservation) => {
    if (!reservation.startTime) return
    const day = reservation.startTime.getDate()
    const localHour = reservation.startTime.getHours()
    const index = localHour >= 7 ? localHour - 7 : localHour + 17
    if (index < 0 || index >= HOURS_RANGE.length) return

    data[day - 1].hours[index] += 1
    data[day - 1].total += 1
    hourlyTotals[index] += 1
  })

  const timeSlots = buildTimeSlotSummary(hourlyTotals)
  const grandTotal = hourlyTotals.reduce((sum, value) => sum + value, 0)

  return {
    year,
    month,
    data,
    hourlyTotals,
    grandTotal,
    timeSlots,
  }
}

export async function getDailyReport(
  date: string,
  storeId?: string
): Promise<DailyReport> {
  const normalizedStoreId = normaliseStoreId(storeId)
  return generateDailyReport(date, normalizedStoreId)
}

export interface StaffAttendanceSummary {
  id: string
  name: string
  attendance: (0 | 1)[]
  total: number
}

export async function getStaffAttendanceReport(
  year: number,
  month: number,
  storeId?: string
): Promise<StaffAttendanceSummary[]> {
  const normalizedStoreId = normaliseStoreId(storeId)
  const start = startOfMonth(new Date(year, month - 1, 1))
  const end = endOfMonth(start)
  const daysInMonth = getDaysInMonth(start)

  const schedules = await db.castSchedule.findMany({
    where: {
      cast: {
        storeId: normalizedStoreId,
      },
      date: {
        gte: start,
        lte: end,
      },
    },
    include: {
      cast: true,
    },
  })

  const attendanceMap = new Map<
    string,
    {
      name: string
      attendance: (0 | 1)[]
    }
  >()

  schedules.forEach((schedule) => {
    const castId = schedule.castId
    const castName = schedule.cast?.name ?? '未設定'
    const day = schedule.date.getDate()

    const entry =
      attendanceMap.get(castId) ??
      {
        name: castName,
        attendance: Array(daysInMonth).fill(0) as (0 | 1)[],
      }

    entry.attendance[day - 1] = 1
    attendanceMap.set(castId, entry)
  })

  return Array.from(attendanceMap.entries()).map(([castId, data]) => ({
    id: castId,
    name: data.name,
    attendance: data.attendance,
    total: data.attendance.reduce((sum, value) => sum + value, 0),
  }))
}
