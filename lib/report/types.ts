export interface StaffDailyReport {
  staffId: string
  staffName: string
  workingHours: number
  salesAmount: number
  customerCount: number
  designationCount: number
  optionSales: number
}

export interface DailyReport {
  date: string
  totalSales: number
  totalCustomers: number
  totalWorkingHours: number
  staffReports: StaffDailyReport[]
}
