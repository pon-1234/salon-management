import { describe, it, expect, beforeEach, vi } from 'vitest'
import { AnalyticsUseCases } from './usecases'
import type { AnalyticsRepository } from '../types/analytics'
import type {
  MonthlyData,
  DailyData,
  StaffPerformanceData,
  CourseSalesData,
  OptionSalesData,
  MarketingChannelData,
} from '../types/analytics'

describe('AnalyticsUseCases', () => {
  let mockRepository: AnalyticsRepository
  let useCases: AnalyticsUseCases

  beforeEach(() => {
    mockRepository = {
      getMonthlyData: vi.fn(),
      getDailyData: vi.fn(),
      getStaffPerformanceData: vi.fn(),
      getCourseSalesData: vi.fn(),
      getOptionSalesData: vi.fn(),
      getOptionCombinationData: vi.fn(),
      getMarketingChannelData: vi.fn(),
      getAreaSalesData: vi.fn(),
      getDistrictSalesData: vi.fn(),
      getMonthlyStaffSummary: vi.fn(),
      getMonthlyAreaSummary: vi.fn(),
      getHourlySalesReport: vi.fn(),
      getStaffAttendanceReport: vi.fn(),
    }
    useCases = new AnalyticsUseCases(mockRepository)
  })

  describe('getMonthlyReport', () => {
    it('should return monthly data for a specific year', async () => {
      const year = 2024
      const mockMonthlyData: MonthlyData[] = [
        {
          month: 1,
          days: 31,
          staffCount: 10,
          workingDays: 25,
          workingHours: 200,
          cashSales: 500000,
          cardCount: 50,
          cardSales: 500000,
          turnoverRate: 0.8,
          tokyoCount: 80,
          kanagawaCount: 20,
          totalCount: 100,
          totalSales: 1000000,
          salesPerCustomer: 10000,
          discounts: 50000,
          pointRewards: 10000,
          totalRevenue: 940000,
          outsourcingCost: 100000,
          welfareCost: 50000,
          newCustomerCount: 20,
          repeatCustomerCount: 80,
          storeSales: 800000,
          previousYearRatio: 1.1,
          storeSalesRatio: 0.8,
        },
        {
          month: 2,
          days: 28,
          staffCount: 10,
          workingDays: 23,
          workingHours: 180,
          cashSales: 600000,
          cardCount: 60,
          cardSales: 600000,
          turnoverRate: 0.85,
          tokyoCount: 100,
          kanagawaCount: 20,
          totalCount: 120,
          totalSales: 1200000,
          salesPerCustomer: 10000,
          discounts: 60000,
          pointRewards: 12000,
          totalRevenue: 1128000,
          outsourcingCost: 120000,
          welfareCost: 55000,
          newCustomerCount: 25,
          repeatCustomerCount: 95,
          storeSales: 960000,
          previousYearRatio: 1.15,
          storeSalesRatio: 0.8,
        },
      ]

      vi.mocked(mockRepository.getMonthlyData).mockResolvedValue(mockMonthlyData)

      const result = await useCases.getMonthlyReport(year)

      expect(mockRepository.getMonthlyData).toHaveBeenCalledWith(year)
      expect(result).toEqual(mockMonthlyData)
    })

    it('should return empty array when no data available', async () => {
      const year = 2025
      vi.mocked(mockRepository.getMonthlyData).mockResolvedValue([])

      const result = await useCases.getMonthlyReport(year)

      expect(mockRepository.getMonthlyData).toHaveBeenCalledWith(year)
      expect(result).toEqual([])
    })
  })

  describe('getDailyReport', () => {
    it('should return daily data for a specific year and month', async () => {
      const year = 2024
      const month = 1
      const mockDailyData: DailyData[] = [
        {
          date: 1,
          dayOfWeek: '月',
          staffCount: 8,
          workingHours: 64,
          directSales: 40000,
          cardSales: 10000,
          pointRewards: 1000,
          totalSales: 50000,
          staffSales: 30000,
          storeSales: 20000,
          cashSales: 40000,
          customerCount: 5,
          turnoverRate: 0.8,
          newCustomers: 1,
          repeaters: 4,
          discounts: 2000,
          pointUsage: 500,
        },
        {
          date: 2,
          dayOfWeek: '火',
          staffCount: 10,
          workingHours: 80,
          directSales: 45000,
          cardSales: 15000,
          pointRewards: 1200,
          totalSales: 60000,
          staffSales: 35000,
          storeSales: 25000,
          cashSales: 45000,
          customerCount: 6,
          turnoverRate: 0.85,
          newCustomers: 2,
          repeaters: 4,
          discounts: 2500,
          pointUsage: 600,
        },
      ]

      vi.mocked(mockRepository.getDailyData).mockResolvedValue(mockDailyData)

      const result = await useCases.getDailyReport(year, month)

      expect(mockRepository.getDailyData).toHaveBeenCalledWith(year, month)
      expect(result).toEqual(mockDailyData)
    })

    it('should handle months with no data', async () => {
      const year = 2024
      const month = 13 // Invalid month
      vi.mocked(mockRepository.getDailyData).mockResolvedValue([])

      const result = await useCases.getDailyReport(year, month)

      expect(mockRepository.getDailyData).toHaveBeenCalledWith(year, month)
      expect(result).toEqual([])
    })
  })

  describe('getStaffPerformance', () => {
    it('should return staff performance data', async () => {
      const mockStaffData: StaffPerformanceData[] = [
        {
          id: 'staff-1',
          name: 'スタッフA',
          age: 25,
          workDays: '月火水木金',
          cashTransactions: {
            count: 30,
            amount: 300000,
          },
          cardTransactions: {
            count: 20,
            amount: 200000,
          },
          totalTransactions: 500000,
          newCustomers: {
            free: 5,
            paid: 10,
          },
          designations: {
            regular: 30,
            total: 50,
            rate: 0.6,
          },
          discount: 10000,
          totalAmount: 490000,
          staffFee: 245000,
          staffRevenue: 245000,
          storeRevenue: 245000,
        },
        {
          id: 'staff-2',
          name: 'スタッフB',
          age: 28,
          workDays: '月火水木金土',
          cashTransactions: {
            count: 25,
            amount: 250000,
          },
          cardTransactions: {
            count: 20,
            amount: 200000,
          },
          totalTransactions: 450000,
          newCustomers: {
            free: 3,
            paid: 12,
          },
          designations: {
            regular: 35,
            total: 45,
            rate: 0.78,
          },
          discount: 8000,
          totalAmount: 442000,
          staffFee: 221000,
          staffRevenue: 221000,
          storeRevenue: 221000,
        },
      ]

      vi.mocked(mockRepository.getStaffPerformanceData).mockResolvedValue(mockStaffData)

      const result = await useCases.getStaffPerformance()

      expect(mockRepository.getStaffPerformanceData).toHaveBeenCalled()
      expect(result).toEqual(mockStaffData)
    })

    it('should return empty array when no staff data available', async () => {
      vi.mocked(mockRepository.getStaffPerformanceData).mockResolvedValue([])

      const result = await useCases.getStaffPerformance()

      expect(mockRepository.getStaffPerformanceData).toHaveBeenCalled()
      expect(result).toEqual([])
    })
  })

  describe('getCourseSalesReport', () => {
    it('should return course sales data for a specific year and month', async () => {
      const year = 2024
      const month = 3
      const mockCourseSalesData: CourseSalesData[] = [
        {
          id: 'course-1',
          name: 'スタンダードコース',
          duration: 60,
          price: 10000,
          sales: [300000, 280000, 320000],
        },
        {
          id: 'course-2',
          name: 'プレミアムコース',
          duration: 90,
          price: 20000,
          sales: [400000, 420000, 380000],
        },
      ]

      vi.mocked(mockRepository.getCourseSalesData).mockResolvedValue(mockCourseSalesData)

      const result = await useCases.getCourseSalesReport(year, month)

      expect(mockRepository.getCourseSalesData).toHaveBeenCalledWith(year, month)
      expect(result).toEqual(mockCourseSalesData)
    })

    it('should return empty array for future dates', async () => {
      const year = 2030
      const month = 1
      vi.mocked(mockRepository.getCourseSalesData).mockResolvedValue([])

      const result = await useCases.getCourseSalesReport(year, month)

      expect(mockRepository.getCourseSalesData).toHaveBeenCalledWith(year, month)
      expect(result).toEqual([])
    })
  })

  describe('getOptionSalesReport', () => {
    it('should return option sales data for a specific year', async () => {
      const year = 2024
      const mockOptionSalesData: OptionSalesData[] = [
        {
          id: 'option-1',
          name: 'オールヌード',
          price: 3000,
          monthlySales: [100000, 95000, 105000],
        },
        {
          id: 'option-2',
          name: 'ローション追加',
          price: 2000,
          monthlySales: [50000, 55000, 55000],
        },
      ]

      vi.mocked(mockRepository.getOptionSalesData).mockResolvedValue(mockOptionSalesData)

      const result = await useCases.getOptionSalesReport(year)

      expect(mockRepository.getOptionSalesData).toHaveBeenCalledWith(year)
      expect(result).toEqual(mockOptionSalesData)
    })

    it('should handle years with no option sales', async () => {
      const year = 2020
      vi.mocked(mockRepository.getOptionSalesData).mockResolvedValue([])

      const result = await useCases.getOptionSalesReport(year)

      expect(mockRepository.getOptionSalesData).toHaveBeenCalledWith(year)
      expect(result).toEqual([])
    })
  })

  describe('getMarketingChannelReport', () => {
    it('should return marketing channel data for a specific year', async () => {
      const year = 2024
      const mockChannelData: MarketingChannelData[] = [
        {
          channel: 'ホットペッパー',
          monthlySales: [500000, 480000, 520000],
          total: 1500000,
        },
        {
          channel: '公式サイト',
          monthlySales: [400000, 400000, 400000],
          total: 1200000,
        },
        {
          channel: 'SNS',
          monthlySales: [150000, 170000, 180000],
          total: 500000,
        },
      ]

      vi.mocked(mockRepository.getMarketingChannelData).mockResolvedValue(mockChannelData)

      const result = await useCases.getMarketingChannelReport(year)

      expect(mockRepository.getMarketingChannelData).toHaveBeenCalledWith(year)
      expect(result).toEqual(mockChannelData)
    })

    it('should return empty array when no marketing data available', async () => {
      const year = 2019
      vi.mocked(mockRepository.getMarketingChannelData).mockResolvedValue([])

      const result = await useCases.getMarketingChannelReport(year)

      expect(mockRepository.getMarketingChannelData).toHaveBeenCalledWith(year)
      expect(result).toEqual([])
    })
  })
})
