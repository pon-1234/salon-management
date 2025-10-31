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
} from '../types/analytics'
import {
  staffPerformanceData,
  generateCourseSalesData,
  generateOptionSalesData,
  generateMarketingChannelData,
} from './data'

export class AnalyticsRepositoryImpl implements AnalyticsRepository {
  private async fetchJson<T>(endpoint: string): Promise<T> {
    const response = await fetch(endpoint, { cache: 'no-store' })
    if (!response.ok) {
      const message = await response.text()
      throw new Error(`Failed to fetch ${endpoint}: ${response.status} ${message}`)
    }
    return (await response.json()) as T
  }

  async getMonthlyData(year: number): Promise<MonthlyData[]> {
    const params = new URLSearchParams({ year: String(year) })
    return this.fetchJson<MonthlyData[]>(`/api/analytics/monthly?${params.toString()}`)
  }

  async getDailyData(year: number, month: number): Promise<DailyData[]> {
    const params = new URLSearchParams({
      year: String(year),
      month: String(month),
    })
    return this.fetchJson<DailyData[]>(`/api/analytics/daily?${params.toString()}`)
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

  async getMarketingChannelData(year: number): Promise<MarketingChannelData[]> {
    return generateMarketingChannelData(year)
  }

  async getMonthlyStaffSummary(year: number, month: number): Promise<MonthlyStaffSummary[]> {
    const params = new URLSearchParams({
      year: String(year),
      month: String(month),
    })
    return this.fetchJson<MonthlyStaffSummary[]>(
      `/api/analytics/monthly-staff?${params.toString()}`
    )
  }

  async getMonthlyAreaSummary(year: number, month: number): Promise<MonthlyAreaSummary[]> {
    const params = new URLSearchParams({
      year: String(year),
      month: String(month),
    })
    return this.fetchJson<MonthlyAreaSummary[]>(
      `/api/analytics/monthly-area?${params.toString()}`
    )
  }
}
