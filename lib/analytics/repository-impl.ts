import {
  AnalyticsRepository,
  MonthlyData,
  DailyData,
  StaffPerformanceData,
  CourseSalesData,
  OptionSalesData,
  OptionCombinationData,
  MarketingChannelData,
} from '../types/analytics'
import {
  generateMonthlyData,
  generateDailyData,
  staffPerformanceData,
  generateCourseSalesData,
  generateOptionSalesData,
  generateMarketingChannelData,
} from './data'

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
}
