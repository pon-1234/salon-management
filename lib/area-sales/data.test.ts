import { describe, it, expect, vi, beforeEach } from 'vitest'
import { generateAreaSalesData } from './data'

describe('Area Sales Data', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('generateAreaSalesData', () => {
    it('should generate area sales data', () => {
      const data = generateAreaSalesData(2024)

      expect(Array.isArray(data)).toBe(true)
      expect(data.length).toBeGreaterThan(0)
    })

    it('should have valid area data structure', () => {
      const data = generateAreaSalesData(2024)

      data.forEach((area) => {
        expect(area).toHaveProperty('area')
        expect(area).toHaveProperty('monthlySales')
        expect(area).toHaveProperty('total')

        expect(typeof area.area).toBe('string')
        expect(Array.isArray(area.monthlySales)).toBe(true)
        expect(area.monthlySales.length).toBe(12)
        expect(typeof area.total).toBe('number')
      })
    })

    it('should generate data for 4 prefectures', () => {
      const data = generateAreaSalesData(2024)
      const areas = data.map((d) => d.area)

      expect(areas).toContain('東京都')
      expect(areas).toContain('神奈川県')
      expect(areas).toContain('千葉県')
      expect(areas).toContain('埼玉県')
    })

    it('should calculate correct totals for each area', () => {
      const data = generateAreaSalesData(2024)

      data.forEach((area) => {
        if (!area.isSubtotal) {
          const expectedTotal = area.monthlySales.reduce((sum, sale) => sum + sale, 0)
          expect(area.total).toBe(expectedTotal)
        }
      })
    })

    it('should have Tokyo with highest sales', () => {
      const data = generateAreaSalesData(2024)
      const tokyo = data.find((d) => d.area === '東京都')
      const otherAreas = data.filter((d) => d.area !== '東京都' && !d.isSubtotal)

      if (tokyo && otherAreas.length > 0) {
        otherAreas.forEach((area) => {
          expect(tokyo.total).toBeGreaterThan(area.total)
        })
      }
    })

    it('should have all monthly sales as positive numbers', () => {
      const data = generateAreaSalesData(2024)

      data.forEach((area) => {
        area.monthlySales.forEach((sale) => {
          expect(sale).toBeGreaterThanOrEqual(0)
        })
      })
    })

    it('should generate different data for different calls', () => {
      const data1 = generateAreaSalesData(2024)
      const data2 = generateAreaSalesData(2024)

      // Since it uses Math.random(), the data should be different
      const isDifferent = JSON.stringify(data1) !== JSON.stringify(data2)
      expect(isDifferent).toBe(true)
    })

    it('should have consistent relative scaling between areas', () => {
      const data = generateAreaSalesData(2024)
      const tokyo = data.find((d) => d.area === '東京都')
      const kanagawa = data.find((d) => d.area === '神奈川県')
      const chiba = data.find((d) => d.area === '千葉県')
      const saitama = data.find((d) => d.area === '埼玉県')

      if (tokyo && kanagawa && chiba && saitama) {
        // Check relative scaling based on the implementation
        // Tokyo should be roughly 3x the base, Kanagawa 2x, Chiba 1.5x, Saitama 1x
        const tokyoAvg = tokyo.total / 12
        const kanagawaAvg = kanagawa.total / 12
        const chibaAvg = chiba.total / 12
        const saitamaAvg = saitama.total / 12

        // Allow for random variation but check general relationship
        expect(tokyoAvg).toBeGreaterThan(kanagawaAvg)
        expect(kanagawaAvg).toBeGreaterThan(chibaAvg)
        expect(chibaAvg).toBeGreaterThan(saitamaAvg)
      }
    })

    it('should ignore year parameter', () => {
      // The function doesn't actually use the year parameter
      const data2024 = generateAreaSalesData(2024)
      const data2025 = generateAreaSalesData(2025)

      // Both should have the same structure
      expect(data2024.length).toBe(data2025.length)
      expect(data2024.map((d) => d.area)).toEqual(data2025.map((d) => d.area))
    })
  })
})
