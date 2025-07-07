import { MonthlyData, DailyData, StaffPerformanceData } from '../types/analytics'
import { generateMonthlyData, generateDailyData, staffPerformanceData } from './data'

export function getMonthlyData(year: number): MonthlyData[] {
  return generateMonthlyData(year)
}

export function getDailyData(year: number, month: number): DailyData[] {
  return generateDailyData(year, month)
}

export function getStaffPerformanceData(): StaffPerformanceData[] {
  return staffPerformanceData
}
