/**
 * @design_doc   Store-scoped JST business-day reporting contract
 * @related_to   usecases.ts - completed sales and scheduled working-hour aggregation
 * @known_issues Historical attendance outside CastSchedule requires a separately approved import
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { generateDailyReport } from './usecases'
import { db } from '@/lib/db'

const mockReservations = [
  {
    castId: 'cast-1',
    cast: { name: 'スタッフA' },
    startTime: new Date('2024-01-15T10:00:00'),
    endTime: new Date('2024-01-15T11:30:00'),
    price: 12000,
    designationType: 'regular',
    paymentMethod: '現金',
    storeRevenue: 4000,
    staffRevenue: 8000,
    options: [{ optionPrice: 1000 }, { optionPrice: 2000 }],
  },
  {
    castId: 'cast-1',
    cast: { name: 'スタッフA' },
    startTime: new Date('2024-01-15T12:00:00'),
    endTime: new Date('2024-01-15T13:00:00'),
    price: 8000,
    designationType: 'none',
    paymentMethod: 'カード',
    storeRevenue: 3000,
    staffRevenue: 5000,
    options: [],
  },
  {
    castId: 'cast-2',
    cast: { name: 'スタッフB' },
    startTime: new Date('2024-01-15T15:00:00'),
    endTime: new Date('2024-01-15T16:00:00'),
    price: 10000,
    designationType: 'special',
    paymentMethod: '現金',
    options: [{ optionPrice: 500 }],
  },
]

const mockSchedules = [
  {
    castId: 'cast-1',
    cast: { name: 'スタッフA' },
    startTime: new Date('2024-01-15T01:00:00.000Z'),
    endTime: new Date('2024-01-15T09:00:00.000Z'),
  },
  {
    castId: 'cast-2',
    cast: { name: 'スタッフB' },
    startTime: new Date('2024-01-15T06:00:00.000Z'),
    endTime: new Date('2024-01-15T11:00:00.000Z'),
  },
]

describe('generateDailyReport', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(db.reservation.findMany).mockResolvedValue(mockReservations as any)
    vi.mocked(db.castSchedule.findMany).mockResolvedValue(mockSchedules as any)
  })

  it('queries only completed reservations inside the half-open JST 05:30 business day', async () => {
    await generateDailyReport('2024-01-15', 'ikebukuro')

    expect(db.reservation.findMany).toHaveBeenCalledWith({
      where: {
        storeId: 'ikebukuro',
        status: 'completed',
        startTime: {
          gte: new Date('2024-01-14T20:30:00.000Z'),
          lt: new Date('2024-01-15T20:30:00.000Z'),
        },
      },
      include: {
        cast: true,
        options: true,
      },
    })
    expect(db.castSchedule.findMany).toHaveBeenCalledWith({
      where: {
        date: {
          gte: new Date('2024-01-14T20:30:00.000Z'),
          lt: new Date('2024-01-15T20:30:00.000Z'),
        },
        isAvailable: true,
        cast: { storeId: 'ikebukuro' },
      },
      include: { cast: true },
    })
  })

  it('assigns a 04:00 JST reservation to the previous business day', async () => {
    await generateDailyReport('2024-01-15', 'ikebukuro')

    const query = vi.mocked(db.reservation.findMany).mock.calls[0]?.[0] as {
      where: { startTime: { gte: Date; lt: Date } }
    }
    const fourAmNextCalendarDay = new Date('2024-01-15T19:00:00.000Z')
    expect(fourAmNextCalendarDay.getTime()).toBeGreaterThanOrEqual(
      query.where.startTime.gte.getTime()
    )
    expect(fourAmNextCalendarDay.getTime()).toBeLessThan(query.where.startTime.lt.getTime())
  })

  it('should generate a daily report with valid structure', async () => {
    const date = '2024-01-15'
    const report = await generateDailyReport(date)

    // Check report structure
    expect(report).toHaveProperty('date', date)
    expect(report).toHaveProperty('totalSales')
    expect(report).toHaveProperty('totalCustomers')
    expect(report).toHaveProperty('totalWorkingHours')
    expect(report).toHaveProperty('staffReports')
    expect(Array.isArray(report.staffReports)).toBe(true)
  })

  it('should generate staff reports with valid data', async () => {
    const date = '2024-01-15'
    const report = await generateDailyReport(date)

    expect(report.staffReports.length).toBeGreaterThan(0)

    report.staffReports.forEach((staffReport) => {
      // Check staff report structure
      expect(staffReport).toHaveProperty('staffId')
      expect(staffReport).toHaveProperty('staffName')
      expect(staffReport).toHaveProperty('salesAmount')
      expect(staffReport).toHaveProperty('customerCount')
      expect(staffReport).toHaveProperty('workingHours')
      expect(staffReport).toHaveProperty('designationCount')
      expect(staffReport).toHaveProperty('optionSales')

      expect(typeof staffReport.staffId).toBe('string')
      expect(typeof staffReport.staffName).toBe('string')
      expect(staffReport.salesAmount).toBeGreaterThan(0)
      expect(staffReport.customerCount).toBeGreaterThan(0)
      expect(staffReport.workingHours).toBeGreaterThan(0)
      expect(staffReport.designationCount).toBeGreaterThanOrEqual(0)
      expect(staffReport.optionSales).toBeGreaterThanOrEqual(0)
    })
  })

  it('should calculate totals correctly', async () => {
    const date = '2024-01-15'
    const report = await generateDailyReport(date)

    // Calculate expected totals
    const expectedTotalSales = report.staffReports.reduce(
      (sum, report) => sum + report.salesAmount,
      0
    )
    const expectedTotalCustomers = report.staffReports.reduce(
      (sum, report) => sum + report.customerCount,
      0
    )
    const expectedTotalWorkingHours = report.staffReports.reduce(
      (sum, report) => sum + report.workingHours,
      0
    )

    expect(report.totalSales).toBe(expectedTotalSales)
    expect(report.totalCustomers).toBe(expectedTotalCustomers)
    expect(report.totalWorkingHours).toBe(expectedTotalWorkingHours)
    expect(report.totalWorkingHours).toBe(13)
  })

  it('should reflect reservation data changes', async () => {
    const date = '2024-01-15'
    const report1 = await generateDailyReport(date)
    vi.mocked(db.reservation.findMany).mockResolvedValueOnce(mockReservations.slice(0, 1) as any)
    const report2 = await generateDailyReport(date)

    expect(report1.totalSales).toBe(30000)
    expect(report2.totalSales).toBe(12000)
  })

  it.each(['2024/01/15', '15-01-2024', '2024-02-30'])(
    'rejects an invalid business date before querying the database: %s',
    async (date) => {
      await expect(generateDailyReport(date)).rejects.toThrow('date must be a valid yyyy-MM-dd')
      expect(db.reservation.findMany).not.toHaveBeenCalled()
      expect(db.castSchedule.findMany).not.toHaveBeenCalled()
    }
  )

  it('splits cash and card amounts the same way as the gold-esthe daily report', async () => {
    const report = await generateDailyReport('2024-01-15')

    expect(report.totalCashAmount).toBe(22000)
    expect(report.totalCardAmount).toBe(8000)
    expect(report.staffReports).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ staffId: 'cast-1', cashCount: 1, cardCount: 1 }),
      ])
    )
  })

  it('uses scheduled hours instead of treating reservation duration as labor hours', async () => {
    const report = await generateDailyReport('2024-01-15')

    expect(report.staffReports).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ staffId: 'cast-1', workingHours: 8 }),
        expect.objectContaining({ staffId: 'cast-2', workingHours: 5 }),
      ])
    )
  })
})
