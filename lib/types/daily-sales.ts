export interface DailyStaffSales {
  staffId: string;
  staffName: string;
  workingHours: {
    start: string;
    end: string;
    total: string;
  };
  cashTransactions: {
    count: number;
    amount: number;
  };
  cardTransactions: {
    count: number;
    amount: number;
  };
  totalTransactions: number;
  discounts: {
    regular: number;
    hotel: number;
  };
  totalAmount: number;
  staffFee: number;
  staffSales: number;
  sales: {
    cash: number;
    card: number;
    total: number;
  };
  currentBalance: number;
}

export interface DailySalesData {
  date: string;
  totalStaff: number;
  totalWorkingHours: number;
  staffSales: DailyStaffSales[];
  totals: {
    cashTransactions: {
      count: number;
      amount: number;
    };
    cardTransactions: {
      count: number;
      amount: number;
    };
    totalTransactions: number;
    discounts: {
      regular: number;
      hotel: number;
    };
    totalAmount: number;
    staffFee: number;
    staffSales: number;
    sales: {
      cash: number;
      card: number;
      total: number;
    };
    currentBalance: number;
  };
}
