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
  generateStaffAttendanceData,
} from './data'
import { generateAreaSalesData } from '@/lib/area-sales/data'
import { AreaSalesData } from '@/lib/types/area-sales'
import { generateDistrictSalesData } from '@/lib/district-sales/data'
import { DistrictSalesReport } from '@/lib/types/district-sales'
import { generateHourlySalesData } from '@/lib/hourly-sales/data'
import { HourlySalesReport } from '@/lib/types/hourly-sales'
import { StaffAttendanceSummary } from '@/lib/types/staff-attendance'

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

  async getDistrictSalesData(year: number, prefecture: string): Promise<DistrictSalesReport> {
    return generateDistrictSalesData(year, prefecture)
  }

  async getMonthlyStaffSummary(year: number, _month: number): Promise<MonthlyStaffSummary[]> {
    return staffPerformanceData.map((staff) => {
      const workedDays = Number.parseInt(String(staff.workDays).split('/')[0] ?? '0', 10)
      const newCustomers = (staff.newCustomers?.free ?? 0) + (staff.newCustomers?.paid ?? 0)
      const customerCount = staff.totalTransactions ?? 0
      const totalSales = staff.totalAmount ?? 0
      const repeaters = Math.max(customerCount - newCustomers, 0)
      const averagePerCustomer = customerCount > 0 ? Math.round(totalSales / customerCount) : 0

      return {
        id: staff.id ?? `${year}-staff-${staff.name}`,
        name: staff.name,
        workDays: workedDays,
        customerCount,
        totalSales,
        averagePerCustomer,
        newCustomers,
        repeaters,
      }
    })
  }

  async getMonthlyAreaSummary(year: number, month: number): Promise<MonthlyAreaSummary[]> {
    const monthIndex = Math.min(Math.max(month - 1, 0), 11)
    const areaData = await this.getAreaSalesData(year)

    return areaData
      .filter((entry) => !entry.isSubtotal)
      .map((entry) => {
        const sales = entry.monthlySales[monthIndex] ?? 0
        const customerCount = entry.monthlyCustomers?.[monthIndex] ?? 0
        const newCustomers = entry.monthlyNewCustomers?.[monthIndex] ?? 0
        const repeaters = Math.max(customerCount - newCustomers, 0)
        const averagePerCustomer = customerCount > 0 ? Math.round(sales / customerCount) : 0
        const previousSales = entry.monthlySales[monthIndex - 1] ?? sales
        const growthRate = previousSales > 0 ? ((sales - previousSales) / previousSales) * 100 : 0

        return {
          area: entry.area,
          customerCount,
          newCustomers,
          repeaters,
          totalSales: sales,
          averagePerCustomer,
          growthRate: Math.round(growthRate * 10) / 10,
        }
      })
  }

  async getHourlySalesReport(year: number, month: number): Promise<HourlySalesReport> {
    return generateHourlySalesData(year, month)
  }

  async getStaffAttendanceReport(year: number, month: number): Promise<StaffAttendanceSummary[]> {
    return generateStaffAttendanceData(year, month)
  }
}
