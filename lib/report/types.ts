export interface StaffDailyReport {
  staffId: string
  staffName: string
  workingHours: number
  salesAmount: number
  storeRevenue: number
  staffRevenue: number
  cashCount: number
  cashAmount: number
  cardCount: number
  cardAmount: number
  discountAmount: number
  hotelExpense: number
  welfareExpense: number
  customerCount: number
  designationCount: number
  optionSales: number
}

export interface DailyReport {
  date: string
  totalSales: number
  totalStoreRevenue: number
  totalStaffRevenue: number
  totalCashAmount: number
  totalCardAmount: number
  totalCustomers: number
  totalWorkingHours: number
  staffReports: StaffDailyReport[]
}
