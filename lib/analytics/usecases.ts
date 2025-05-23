import { AnalyticsRepository, MonthlyData, DailyData, StaffPerformanceData } from '../types/analytics';
import { CourseSalesData, OptionSalesData } from '../types/analytics'; //追加インポート
import { MarketingChannelData } from '../types/analytics'; //追加インポート

export class AnalyticsUseCases {
  constructor(private repository: AnalyticsRepository) {}

  async getMonthlyReport(year: number): Promise<MonthlyData[]> {
    return this.repository.getMonthlyData(year);
  }

  async getDailyReport(year: number, month: number): Promise<DailyData[]> {
    return this.repository.getDailyData(year, month);
  }

  async getStaffPerformance(): Promise<StaffPerformanceData[]> {
    return this.repository.getStaffPerformanceData();
  }

  async getCourseSalesReport(year: number, month: number): Promise<CourseSalesData[]> {
    return this.repository.getCourseSalesData(year, month);
  }

  async getOptionSalesReport(year: number): Promise<OptionSalesData[]> {
    return this.repository.getOptionSalesData(year);
  }

  async getMarketingChannelReport(year: number): Promise<MarketingChannelData[]> {
    return this.repository.getMarketingChannelData(year);
  }
}
