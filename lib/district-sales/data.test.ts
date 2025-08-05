import { describe, it, expect, vi, beforeEach } from 'vitest'
import { generateDistrictSalesData } from './data'

describe('District Sales Data', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('generateDistrictSalesData', () => {
    it('should generate district sales report', () => {
      const report = generateDistrictSalesData(2024, '池袋')

      expect(report).toHaveProperty('year')
      expect(report).toHaveProperty('area')
      expect(report).toHaveProperty('districts')
      expect(report).toHaveProperty('total')

      expect(report.year).toBe(2024)
      expect(report.area).toBe('池袋')
      expect(Array.isArray(report.districts)).toBe(true)
      expect(report.districts.length).toBeGreaterThan(0)
    })

    it('should have valid district structure', () => {
      const report = generateDistrictSalesData(2024, 'test')

      report.districts.forEach((district) => {
        expect(district).toHaveProperty('district')
        expect(district).toHaveProperty('code')
        expect(district).toHaveProperty('monthlySales')
        expect(district).toHaveProperty('total')

        expect(Array.isArray(district.monthlySales)).toBe(true)
        expect(district.monthlySales.length).toBe(12)
        expect(typeof district.total).toBe('number')
      })
    })

    it('should calculate correct district totals', () => {
      const report = generateDistrictSalesData(2024, 'test')

      report.districts.forEach((district) => {
        const expectedTotal = district.monthlySales.reduce((sum, sale) => sum + sale, 0)
        expect(district.total).toBe(expectedTotal)
      })
    })

    it('should calculate correct monthly totals', () => {
      const report = generateDistrictSalesData(2024, 'test')

      expect(report.total.monthlySales.length).toBe(12)

      for (let month = 0; month < 12; month++) {
        const expectedMonthTotal = report.districts.reduce(
          (sum, district) => sum + district.monthlySales[month],
          0
        )
        expect(report.total.monthlySales[month]).toBe(expectedMonthTotal)
      }
    })

    it('should calculate correct grand total', () => {
      const report = generateDistrictSalesData(2024, 'test')

      const expectedGrandTotal = report.districts.reduce((sum, district) => sum + district.total, 0)
      expect(report.total.total).toBe(expectedGrandTotal)

      const expectedFromMonthly = report.total.monthlySales.reduce(
        (sum, monthTotal) => sum + monthTotal,
        0
      )
      expect(report.total.total).toBe(expectedFromMonthly)
    })

    it('should have consistent data for same parameters', () => {
      const report1 = generateDistrictSalesData(2024, '池袋')
      const report2 = generateDistrictSalesData(2024, '池袋')

      expect(report1).toEqual(report2)
    })

    it('should have all monthly sales as positive numbers', () => {
      const report = generateDistrictSalesData(2024, 'test')

      report.districts.forEach((district) => {
        district.monthlySales.forEach((sale) => {
          expect(sale).toBeGreaterThanOrEqual(0)
        })
      })
    })

    it('should have district codes', () => {
      const report = generateDistrictSalesData(2024, 'test')

      report.districts.forEach((district) => {
        expect(district.code).toBeDefined()
        expect(typeof district.code).toBe('string')
        // Note: All districts in the current implementation have the same code 'G7'
        expect(district.code).toBe('G7')
      })
    })
  })
})
