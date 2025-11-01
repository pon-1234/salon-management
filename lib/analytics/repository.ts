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
import { staffPerformanceData, generateMarketingChannelData } from './data'

export class AnalyticsRepositoryImpl implements AnalyticsRepository {
  constructor(private readonly storeId?: string) {}

  private async fetchJson<T>(endpoint: string): Promise<T> {
    const response = await fetch(endpoint, { cache: 'no-store' })
    if (!response.ok) {
      const message = await response.text()
      throw new Error(`Failed to fetch ${endpoint}: ${response.status} ${message}`)
    }
    return (await response.json()) as T
  }

  private buildQuery(params: Record<string, string>): string {
    const searchParams = new URLSearchParams(params)
    if (this.storeId) {
      searchParams.set('storeId', this.storeId)
    }
    return searchParams.toString()
  }

  private fetchWithQuery<T>(endpoint: string, params: Record<string, string>): Promise<T> {
    const query = this.buildQuery(params)
    return this.fetchJson<T>(`${endpoint}?${query}`)
  }

  async getMonthlyData(year: number): Promise<MonthlyData[]> {
    return this.fetchWithQuery<MonthlyData[]>('/api/analytics/monthly', {
      year: String(year),
    })
  }

  async getDailyData(year: number, month: number): Promise<DailyData[]> {
    return this.fetchWithQuery<DailyData[]>('/api/analytics/daily', {
      year: String(year),
      month: String(month),
    })
  }

  async getStaffPerformanceData(): Promise<StaffPerformanceData[]> {
    return staffPerformanceData
  }

  async getCourseSalesData(year: number, month: number): Promise<CourseSalesData[]> {
    return this.fetchWithQuery<CourseSalesData[]>('/api/analytics/course-sales', {
      year: String(year),
      month: String(month),
    })
  }

  async getOptionSalesData(year: number): Promise<OptionSalesData[]> {
    return this.fetchWithQuery<OptionSalesData[]>('/api/analytics/option-sales', {
      year: String(year),
    })
  }

  async getOptionCombinationData(year: number): Promise<OptionCombinationData[]> {
    return this.fetchWithQuery<OptionCombinationData[]>('/api/analytics/option-combinations', {
      year: String(year),
    })
  }

  async getMarketingChannelData(year: number): Promise<MarketingChannelData[]> {
    return generateMarketingChannelData(year)
  }

  async getMonthlyStaffSummary(year: number, month: number): Promise<MonthlyStaffSummary[]> {
    return this.fetchWithQuery<MonthlyStaffSummary[]>('/api/analytics/monthly-staff', {
      year: String(year),
      month: String(month),
    })
  }

  async getMonthlyAreaSummary(year: number, month: number): Promise<MonthlyAreaSummary[]> {
    return this.fetchWithQuery<MonthlyAreaSummary[]>('/api/analytics/monthly-area', {
      year: String(year),
      month: String(month),
    })
  }
}
