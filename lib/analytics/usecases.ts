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
import { DistrictSalesReport } from '@/lib/types/district-sales'
import { HourlySalesReport } from '@/lib/types/hourly-sales'
import { StaffAttendanceSummary } from '@/lib/types/staff-attendance'

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

  async getDistrictSalesReport(year: number, prefecture: string): Promise<DistrictSalesReport> {
    return this.repository.getDistrictSalesData(year, prefecture)
  }

  async getMonthlyStaffSummary(year: number, month: number): Promise<MonthlyStaffSummary[]> {
    return this.repository.getMonthlyStaffSummary(year, month)
  }

  async getMonthlyAreaSummary(year: number, month: number): Promise<MonthlyAreaSummary[]> {
    return this.repository.getMonthlyAreaSummary(year, month)
  }

  async getHourlySalesReport(year: number, month: number): Promise<HourlySalesReport> {
    return this.repository.getHourlySalesReport(year, month)
  }

  async getStaffAttendanceReport(year: number, month: number): Promise<StaffAttendanceSummary[]> {
    return this.repository.getStaffAttendanceReport(year, month)
  }
}
