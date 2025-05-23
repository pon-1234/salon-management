export interface MonthlyData {
  month: number;
  days: number;
  staffCount: number;
  workingDays: number;
  workingHours: number;
  cashSales: number;
  cardCount: number;
  cardSales: number;
  turnoverRate: number;
  tokyoCount: number;
  kanagawaCount: number;
  totalCount: number;
  totalSales: number;
  salesPerCustomer: number;
  discounts: number;
  pointRewards: number;
  totalRevenue: number;
  outsourcingCost: number;
  welfareCost: number;
  newCustomerCount: number;
  repeatCustomerCount: number;
  storeSales: number;
  previousYearRatio: number;
  storeSalesRatio: number;
}

export interface DailyData {
  date: number;
  dayOfWeek: string;
  staffCount: number;
  workingHours: number;
  directSales: number;
  cardSales: number;
  pointRewards: number;
  totalSales: number;
  staffSales: number;
  storeSales: number;
  cashSales: number;
  customerCount: number;
  turnoverRate: number;
  newCustomers: number;
  repeaters: number;
  discounts: number;
  pointUsage: number;
}

export interface StaffPerformanceData {
  id: string;
  name: string;
  age: number;
  workDays: string;
  cashTransactions: {
    count: number;
    amount: number;
  };
  cardTransactions: {
    count: number;
    amount: number;
  };
  totalTransactions: number;
  newCustomers: {
    free: number;
    paid: number;
  };
  designations: {
    regular: number;
    total: number;
    rate: number;
  };
  discount: number;
  totalAmount: number;
  staffFee: number;
  staffRevenue: number;
  storeRevenue: number;
}

export interface AnalyticsRepository {
  getMonthlyData(year: number): Promise<MonthlyData[]>;
  getDailyData(year: number, month: number): Promise<DailyData[]>;
  getStaffPerformanceData(): Promise<StaffPerformanceData[]>;
  getCourseSalesData(year: number, month: number): Promise<CourseSalesData[]>;
  getOptionSalesData(year: number): Promise<OptionSalesData[]>;
  getMarketingChannelData(year: number): Promise<MarketingChannelData[]>;
}

export interface CourseSalesData {
  id: string;
  name: string;
  duration: number;
  price: number;
  sales: number[];
}

export interface OptionSalesData {
  id: string;
  name: string;
  price: number;
  monthlySales: number[];
}

export interface MarketingChannelData {
  channel: string;
  monthlySales: number[];
  total: number;
}
