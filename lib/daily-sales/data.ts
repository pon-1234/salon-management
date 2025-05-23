import { DailySalesData } from '../types/daily-sales';

export const mockDailySalesData: DailySalesData = {
  date: "2024-12-10",
  totalStaff: 14,
  totalWorkingHours: 111,
  staffSales: [
    {
      staffId: "1",
      staffName: "るい",
      workingHours: {
        start: "10:00",
        end: "18:00",
        total: "8時間"
      },
      cashTransactions: {
        count: 0,
        amount: 0
      },
      cardTransactions: {
        count: 0,
        amount: 0
      },
      totalTransactions: 0,
      discounts: {
        regular: 0,
        hotel: 0
      },
      totalAmount: 0,
      staffFee: 0,
      staffSales: 0,
      sales: {
        cash: 0,
        card: 0,
        total: 0
      },
      currentBalance: 0
    },
    {
      staffId: "2",
      staffName: "しおり",
      workingHours: {
        start: "10:00",
        end: "18:00",
        total: "8時間"
      },
      cashTransactions: {
        count: 3,
        amount: 78000
      },
      cardTransactions: {
        count: 0,
        amount: 0
      },
      totalTransactions: 3,
      discounts: {
        regular: 0,
        hotel: 0
      },
      totalAmount: 78000,
      staffFee: 2900,
      staffSales: 46000,
      sales: {
        cash: 32000,
        card: 0,
        total: 34900
      },
      currentBalance: 34900
    },
    {
      staffId: "3",
      staffName: "みお",
      workingHours: {
        start: "10:00",
        end: "15:00",
        total: "5時間"
      },
      cashTransactions: {
        count: 1,
        amount: 29000
      },
      cardTransactions: {
        count: 0,
        amount: 0
      },
      totalTransactions: 1,
      discounts: {
        regular: 0,
        hotel: 0
      },
      totalAmount: 29000,
      staffFee: 1000,
      staffSales: 18000,
      sales: {
        cash: 11000,
        card: 0,
        total: 12000
      },
      currentBalance: 12000
    },
    {
      staffId: "4",
      staffName: "ねね",
      workingHours: {
        start: "12:00",
        end: "21:00",
        total: "9時間"
      },
      cashTransactions: {
        count: 2,
        amount: 51000
      },
      cardTransactions: {
        count: 0,
        amount: 0
      },
      totalTransactions: 2,
      discounts: {
        regular: 0,
        hotel: 0
      },
      totalAmount: 51000,
      staffFee: 2200,
      staffSales: 28000,
      sales: {
        cash: 23000,
        card: 0,
        total: 25200
      },
      currentBalance: 25200
    }
  ],
  totals: {
    cashTransactions: {
      count: 14,
      amount: 402000
    },
    cardTransactions: {
      count: 0,
      amount: 0
    },
    totalTransactions: 14,
    discounts: {
      regular: 3000,
      hotel: 0
    },
    totalAmount: 402000,
    staffFee: 15900,
    staffSales: 217100,
    sales: {
      cash: 169000,
      card: 0,
      total: 184900
    },
    currentBalance: 184900
  }
};
