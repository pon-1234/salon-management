import {
  AnalyticsRepository,
  MonthlyData,
  DailyData,
  StaffPerformanceData,
  CourseSalesData,
  OptionSalesData,
  OptionCombinationData,
  MarketingChannelData,
  MonthlyStaffSummary,
  MonthlyAreaSummary,
} from '../types/analytics'
import {
  generateMonthlyData,
  generateDailyData,
  staffPerformanceData,
  generateCourseSalesData,
  generateOptionSalesData,
  generateMarketingChannelData,
} from './data'
import { generateAreaSalesData } from '@/lib/area-sales/data'
import { AreaSalesData } from '@/lib/types/area-sales'

export class AnalyticsRepositoryImpl implements AnalyticsRepository {
  async getMonthlyData(year: number): Promise<MonthlyData[]> {
    return generateMonthlyData(year)
  }

  async getDailyData(year: number, month: number): Promise<DailyData[]> {
    return generateDailyData(year, month)
  }

  async getStaffPerformanceData(): Promise<StaffPerformanceData[]> {
    return staffPerformanceData
  }

  async getCourseSalesData(year: number, month: number): Promise<CourseSalesData[]> {
    return generateCourseSalesData(year, month)
  }

  async getOptionSalesData(year: number): Promise<OptionSalesData[]> {
    return generateOptionSalesData(year)
  }

  async getOptionCombinationData(year: number): Promise<OptionCombinationData[]> {
    return []
  }

  async getMarketingChannelData(year: number): Promise<MarketingChannelData[]> {
    return generateMarketingChannelData(year)
  }

  async getAreaSalesData(year: number): Promise<AreaSalesData[]> {
    return generateAreaSalesData(year)
  }
}
