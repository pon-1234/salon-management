import { describe, it, expect } from 'vitest'
import { generateDailyReport } from './usecases'

describe('generateDailyReport', () => {
  it('should generate a daily report with valid structure', () => {
    const date = '2024-01-15'
    const report = generateDailyReport(date)

    // Check report structure
    expect(report).toHaveProperty('date', date)
    expect(report).toHaveProperty('totalSales')
    expect(report).toHaveProperty('totalCustomers')
    expect(report).toHaveProperty('totalWorkingHours')
    expect(report).toHaveProperty('staffReports')
    expect(Array.isArray(report.staffReports)).toBe(true)
  })

  it('should generate staff reports with valid data', () => {
    const date = '2024-01-15'
    const report = generateDailyReport(date)

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

      // Check data validity
      expect(typeof staffReport.staffId).toBe('string')
      expect(typeof staffReport.staffName).toBe('string')
      expect(staffReport.salesAmount).toBeGreaterThanOrEqual(50000)
      expect(staffReport.salesAmount).toBeLessThan(150000)
      expect(staffReport.customerCount).toBeGreaterThanOrEqual(5)
      expect(staffReport.customerCount).toBeLessThan(15)
      expect(staffReport.workingHours).toBeGreaterThanOrEqual(6)
      expect(staffReport.workingHours).toBeLessThan(14)
      expect(staffReport.designationCount).toBeGreaterThanOrEqual(0)
      expect(staffReport.designationCount).toBeLessThan(3)
      expect(staffReport.optionSales).toBeGreaterThanOrEqual(0)
      expect(staffReport.optionSales).toBeLessThan(10000)
    })
  })

  it('should calculate totals correctly', () => {
    const date = '2024-01-15'
    const report = generateDailyReport(date)

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

  it('should generate different reports for different calls', () => {
    const date = '2024-01-15'
    const report1 = generateDailyReport(date)
    const report2 = generateDailyReport(date)

    // Due to random data generation, the reports should be different
    // (although there's a very small chance they could be the same)
    const areReportsDifferent =
      report1.totalSales !== report2.totalSales ||
      report1.totalCustomers !== report2.totalCustomers ||
      report1.totalWorkingHours !== report2.totalWorkingHours

    expect(areReportsDifferent).toBe(true)
  })

  it('should handle different date formats', () => {
    const dates = ['2024-01-15', '2024/01/15', '15-01-2024']

    dates.forEach((date) => {
      const report = generateDailyReport(date)
      expect(report.date).toBe(date)
      expect(report.staffReports.length).toBeGreaterThan(0)
    })
  })
})
