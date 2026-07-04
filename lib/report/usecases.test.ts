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
    options: [{ optionPrice: 1000 }, { optionPrice: 2000 }],
  },
  {
    castId: 'cast-1',
    cast: { name: 'スタッフA' },
    startTime: new Date('2024-01-15T12:00:00'),
    endTime: new Date('2024-01-15T13:00:00'),
    price: 8000,
    designationType: 'none',
    options: [],
  },
  {
    castId: 'cast-2',
    cast: { name: 'スタッフB' },
    startTime: new Date('2024-01-15T15:00:00'),
    endTime: new Date('2024-01-15T16:00:00'),
    price: 10000,
    designationType: 'special',
    options: [{ optionPrice: 500 }],
  },
]

describe('generateDailyReport', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(db.reservation.findMany).mockResolvedValue(mockReservations as any)
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
  })

  it('should reflect reservation data changes', async () => {
    const date = '2024-01-15'
    const report1 = await generateDailyReport(date)
    vi.mocked(db.reservation.findMany).mockResolvedValueOnce(mockReservations.slice(0, 1) as any)
    const report2 = await generateDailyReport(date)

    expect(report1.totalSales).toBe(30000)
    expect(report2.totalSales).toBe(12000)
  })

  it('should handle different date formats', async () => {
    const dates = ['2024-01-15', '2024/01/15', '15-01-2024']

    for (const date of dates) {
      const report = await generateDailyReport(date)
      expect(report.date).toBe(date)
      expect(report.staffReports.length).toBeGreaterThan(0)
    }
  })
})
