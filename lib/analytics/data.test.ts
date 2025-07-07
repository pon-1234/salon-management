import { describe, it, expect } from 'vitest'
import {
  generateMonthlyData,
  generateDailyData,
  generateCourseSalesData,
  generateOptionSalesData,
  generateMarketingChannelData,
  staffPerformanceData,
} from './data'
import { courses, options } from '@/lib/course-option/data'

describe('Analytics Data Generators', () => {
  describe('generateMonthlyData', () => {
    it('should generate 12 months of data', () => {
      const data = generateMonthlyData(2024)
      expect(data).toHaveLength(12)
    })

    it('should contain all required keys for each month', () => {
      const data = generateMonthlyData(2024)
      const firstMonth = data[0]
      expect(firstMonth).toHaveProperty('month')
      expect(firstMonth).toHaveProperty('totalSales')
    })

    it('should correctly calculate derived values', () => {
      const data = generateMonthlyData(2024)
      const firstMonth = data[0]
      expect(firstMonth.totalSales).toBe(firstMonth.cashSales + firstMonth.cardSales)
      expect(firstMonth.totalCount).toBe(firstMonth.tokyoCount + firstMonth.kanagawaCount)
    })
  })

  describe('generateDailyData', () => {
    it('should generate data for the correct number of days in a month', () => {
      const dataFeb = generateDailyData(2024, 2) // Leap year
      expect(dataFeb).toHaveLength(29)
      const dataApr = generateDailyData(2024, 4)
      expect(dataApr).toHaveLength(30)
    })

    it('should contain all required keys for each day', () => {
      const data = generateDailyData(2024, 7)
      const firstDay = data[0]
      expect(firstDay).toHaveProperty('date')
      expect(firstDay).toHaveProperty('totalSales')
    })

    it('should correctly calculate derived daily values', () => {
      const data = generateDailyData(2024, 7)
      const firstDay = data[0]
      expect(firstDay.totalSales).toBe(firstDay.directSales + firstDay.cardSales)
    })
  })

  describe('generateCourseSalesData', () => {
    it('should generate sales data for all courses', () => {
      const data = generateCourseSalesData(2024, 7)
      expect(data).toHaveLength(courses.length)
      expect(data[0]).toHaveProperty('id')
      expect(data[0]).toHaveProperty('sales')
      expect(data[0].sales).toHaveLength(31) // July has 31 days
    })
  })

  describe('generateOptionSalesData', () => {
    it('should generate sales data for all options', () => {
      const data = generateOptionSalesData(2024)
      expect(data).toHaveLength(options.length)
      expect(data[0]).toHaveProperty('id')
      expect(data[0]).toHaveProperty('monthlySales')
      expect(data[0].monthlySales).toHaveLength(12)
    })
  })

  describe('generateMarketingChannelData', () => {
    it('should return a static array of marketing data', () => {
      const data = generateMarketingChannelData(2024)
      expect(Array.isArray(data)).toBe(true)
      expect(data.length).toBeGreaterThan(0)
      expect(data[0]).toHaveProperty('channel')
      expect(data[0]).toHaveProperty('monthlySales')
    })
  })

  describe('staffPerformanceData', () => {
    it('should be a non-empty array with the correct structure', () => {
      expect(Array.isArray(staffPerformanceData)).toBe(true)
      expect(staffPerformanceData.length).toBeGreaterThan(0)
      const firstStaff = staffPerformanceData[0]
      expect(firstStaff).toHaveProperty('id')
      expect(firstStaff).toHaveProperty('name')
      expect(firstStaff).toHaveProperty('totalAmount')
    })
  })
})
