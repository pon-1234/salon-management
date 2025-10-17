import { DailyReport, StaffDailyReport } from './types'
import { castMembers } from '@/lib/cast/data'
import { courses, options } from '@/lib/course-option/data'
import { shouldUseMockFallbacks } from '@/lib/config/feature-flags'

export function generateDailyReport(date: string): DailyReport {
  if (!shouldUseMockFallbacks()) {
    throw new Error('Mock report generation is disabled in this environment')
  }

  // Mock data generation
  const totalStaffCount = castMembers.length

  const staffReports: StaffDailyReport[] = castMembers.map((cast) => ({
    staffId: cast.id,
    staffName: cast.name,
    salesAmount: Math.floor(Math.random() * 100000) + 50000,
    customerCount: Math.floor(Math.random() * 10) + 5,
    workingHours: Math.floor(Math.random() * 8) + 6,
    designationCount: Math.floor(Math.random() * 3),
    optionSales: Math.floor(Math.random() * 10000),
  }))

  const totalSales = staffReports.reduce((sum, report) => sum + report.salesAmount, 0)
  const totalCustomers = staffReports.reduce((sum, report) => sum + report.customerCount, 0)
  const totalWorkingHours = staffReports.reduce((sum, report) => sum + report.workingHours, 0)

  return {
    date,
    totalSales,
    totalCustomers,
    totalWorkingHours,
    staffReports,
  }
}
