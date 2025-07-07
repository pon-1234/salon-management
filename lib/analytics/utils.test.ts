import { describe, it, expect, vi, afterEach, Mock } from 'vitest'
import { getMonthlyData, getDailyData, getStaffPerformanceData } from './utils'
import * as data from './data'

// モック化
vi.mock('./data', () => ({
  generateMonthlyData: vi.fn(),
  generateDailyData: vi.fn(),
  staffPerformanceData: [],
}))

describe('Analytics Utilities', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('getMonthlyData', () => {
    it('should call generateMonthlyData with the correct year and return its result', () => {
      const mockData = [{ month: '1月', sales: 1000 }]
      ;(data.generateMonthlyData as Mock).mockReturnValue(mockData)

      const result = getMonthlyData(2024)

      expect(data.generateMonthlyData).toHaveBeenCalledWith(2024)
      expect(result).toEqual(mockData)
    })
  })

  describe('getDailyData', () => {
    it('should call generateDailyData with the correct year and month and return its result', () => {
      const mockData = [{ day: 1, sales: 100 }]
      ;(data.generateDailyData as Mock).mockReturnValue(mockData)

      const result = getDailyData(2024, 7)

      expect(data.generateDailyData).toHaveBeenCalledWith(2024, 7)
      expect(result).toEqual(mockData)
    })
  })

  describe('getStaffPerformanceData', () => {
    it('should return staffPerformanceData', () => {
      // staffPerformanceDataは配列なので、直接比較
      const result = getStaffPerformanceData()
      expect(result).toBe(data.staffPerformanceData)
    })
  })
})
