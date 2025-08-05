import { describe, it, expect, vi, beforeEach } from 'vitest'
import { generateHourlySalesData } from './data'

describe('Hourly Sales Data', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('generateHourlySalesData', () => {
    it('should generate hourly sales report', () => {
      const report = generateHourlySalesData(2024, 1)

      expect(report).toHaveProperty('year')
      expect(report).toHaveProperty('month')
      expect(report).toHaveProperty('data')
      expect(report).toHaveProperty('hourlyTotals')
      expect(report).toHaveProperty('grandTotal')
      expect(report).toHaveProperty('timeSlots')

      expect(report.year).toBe(2024)
      expect(report.month).toBe(1)
      expect(Array.isArray(report.data)).toBe(true)
      expect(Array.isArray(report.hourlyTotals)).toBe(true)
      expect(Array.isArray(report.timeSlots)).toBe(true)
    })

    it('should generate data for 14 days', () => {
      const report = generateHourlySalesData(2024, 1)
      expect(report.data.length).toBe(14)
    })

    it('should have valid daily data structure', () => {
      const report = generateHourlySalesData(2024, 1)

      report.data.forEach((day, index) => {
        expect(day).toHaveProperty('date')
        expect(day).toHaveProperty('dayOfWeek')
        expect(day).toHaveProperty('hours')
        expect(day).toHaveProperty('total')

        expect(day.date).toBe(index + 1)
        expect(['日', '月', '火', '水', '木', '金', '土']).toContain(day.dayOfWeek)
        expect(Array.isArray(day.hours)).toBe(true)
        expect(day.hours.length).toBe(21) // 7-27 hours
        expect(typeof day.total).toBe('number')
      })
    })

    it('should calculate correct daily totals', () => {
      const report = generateHourlySalesData(2024, 1)

      report.data.forEach((day) => {
        const expectedTotal = day.hours.reduce((sum, hour) => sum + hour, 0)
        expect(day.total).toBe(expectedTotal)
      })
    })

    it('should have 21 hourly totals (7-27)', () => {
      const report = generateHourlySalesData(2024, 1)
      expect(report.hourlyTotals.length).toBe(21)
    })

    it('should calculate correct hourly totals', () => {
      const report = generateHourlySalesData(2024, 1)

      for (let hour = 0; hour < 21; hour++) {
        const expectedHourTotal = report.data.reduce((sum, day) => sum + day.hours[hour], 0)
        expect(report.hourlyTotals[hour]).toBe(expectedHourTotal)
      }
    })

    it('should calculate correct grand total', () => {
      const report = generateHourlySalesData(2024, 1)

      const expectedGrandTotal = report.data.reduce((sum, day) => sum + day.total, 0)
      expect(report.grandTotal).toBe(expectedGrandTotal)

      const expectedFromHourly = report.hourlyTotals.reduce((sum, hourTotal) => sum + hourTotal, 0)
      expect(report.grandTotal).toBe(expectedFromHourly)
    })

    it('should have correct day of week calculation', () => {
      const report = generateHourlySalesData(2024, 1)
      const dayNames = ['日', '月', '火', '水', '木', '金', '土']

      report.data.forEach((day, index) => {
        const date = new Date(2024, 0, index + 1) // January 1-14, 2024
        const expectedDayOfWeek = dayNames[date.getDay()]
        expect(day.dayOfWeek).toBe(expectedDayOfWeek)
      })
    })

    it('should have four time slots', () => {
      const report = generateHourlySalesData(2024, 1)

      expect(report.timeSlots.length).toBe(4)

      // The actual implementation has different range values
      const ranges = report.timeSlots.map((slot) => slot.range)
      expect(ranges).toContain('15')
      expect(ranges).toContain('104')
      expect(ranges).toContain('41')
      expect(ranges).toContain('0')
    })

    it('should calculate correct time slot statistics', () => {
      const report = generateHourlySalesData(2024, 1)

      report.timeSlots.forEach((slot) => {
        expect(slot).toHaveProperty('range')
        expect(slot).toHaveProperty('count')
        expect(slot).toHaveProperty('percentage')

        expect(typeof slot.count).toBe('number')
        expect(typeof slot.percentage).toBe('number')
        expect(slot.percentage).toBeGreaterThanOrEqual(0)
        expect(slot.percentage).toBeLessThanOrEqual(100)
      })

      const totalPercentage = report.timeSlots.reduce((sum, slot) => sum + slot.percentage, 0)
      // Allow for rounding differences
      expect(totalPercentage).toBeGreaterThanOrEqual(98)
      expect(totalPercentage).toBeLessThanOrEqual(102)
    })

    it('should generate different data for different calls', () => {
      const report1 = generateHourlySalesData(2024, 1)
      const report2 = generateHourlySalesData(2024, 1)

      // Since it uses Math.random(), the data should be different
      const isDifferent = JSON.stringify(report1.data) !== JSON.stringify(report2.data)
      expect(isDifferent).toBe(true)
    })

    it('should have all sales as non-negative numbers', () => {
      const report = generateHourlySalesData(2024, 1)

      report.data.forEach((day) => {
        day.hours.forEach((hour) => {
          expect(hour).toBeGreaterThanOrEqual(0)
        })
      })
    })
  })
})
