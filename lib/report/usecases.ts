import { DailyReport, StaffDailyReport } from './types';
import { staffMembers } from '@/lib/staff/data';
import { courses, options } from '@/lib/course-option/data';

export async function generateDailyReport(date: string): Promise<DailyReport> {
  // In a real application, this function would fetch data from an API
  // For now, we'll generate mock data

  const staffReports: StaffDailyReport[] = staffMembers.map(staff => ({
    staffId: staff.id,
    staffName: staff.name,
    workingHours: Math.floor(Math.random() * 8) + 4, // 4-12 hours
    salesAmount: Math.floor(Math.random() * 100000) + 50000, // 50,000-150,000 yen
    customerCount: Math.floor(Math.random() * 5) + 1, // 1-5 customers
    designationCount: Math.floor(Math.random() * 3), // 0-2 designations
    optionSales: Math.floor(Math.random() * 10000), // 0-10,000 yen
  }));

  const totalSales = staffReports.reduce((sum, report) => sum + report.salesAmount, 0);
  const totalCustomers = staffReports.reduce((sum, report) => sum + report.customerCount, 0);
  const totalWorkingHours = staffReports.reduce((sum, report) => sum + report.workingHours, 0);

  return {
    date,
    totalSales,
    totalCustomers,
    totalWorkingHours,
    staffReports,
  };
}
