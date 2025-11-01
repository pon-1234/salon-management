import {
  AnalyticsRepository,
  MonthlyData,
  DailyData,
  StaffPerformanceData,
  CourseSalesData,
  OptionSalesData,
  MarketingChannelData,
  MonthlyStaffSummary,
  MonthlyAreaSummary,
  OptionCombinationData,
} from '../types/analytics'
import { AreaSalesData } from '@/lib/types/area-sales'

export class AnalyticsUseCases {
  constructor(private repository: AnalyticsRepository) {}

  async getMonthlyReport(year: number): Promise<MonthlyData[]> {
    return this.repository.getMonthlyData(year)
  }

  async getDailyReport(year: number, month: number): Promise<DailyData[]> {
    return this.repository.getDailyData(year, month)
  }

  async getStaffPerformance(): Promise<StaffPerformanceData[]> {
    return this.repository.getStaffPerformanceData()
  }

  async getCourseSalesReport(year: number, month: number): Promise<CourseSalesData[]> {
    return this.repository.getCourseSalesData(year, month)
  }

  async getOptionSalesReport(year: number): Promise<OptionSalesData[]> {
    return this.repository.getOptionSalesData(year)
  }

  async getOptionCombinationReport(year: number): Promise<OptionCombinationData[]> {
    return this.repository.getOptionCombinationData(year)
  }

  async getMarketingChannelReport(year: number): Promise<MarketingChannelData[]> {
    return this.repository.getMarketingChannelData(year)
  }

  async getAreaSalesReport(year: number): Promise<AreaSalesData[]> {
    return this.repository.getAreaSalesData(year)
  }

  async getMonthlyStaffSummary(year: number, month: number): Promise<MonthlyStaffSummary[]> {
    return this.repository.getMonthlyStaffSummary(year, month)
  }

  async getMonthlyAreaSummary(year: number, month: number): Promise<MonthlyAreaSummary[]> {
    return this.repository.getMonthlyAreaSummary(year, month)
  }
}
