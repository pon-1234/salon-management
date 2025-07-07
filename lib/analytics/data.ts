import {
  MonthlyData,
  DailyData,
  StaffPerformanceData,
  CourseSalesData,
  OptionSalesData,
  MarketingChannelData,
} from '../types/analytics'
import { courses, options } from '@/lib/course-option/data'

export function generateMonthlyData(year: number): MonthlyData[] {
  return Array.from({ length: 12 }, (_, index) => ({
    month: index + 1,
    days: new Date(year, index + 1, 0).getDate(),
    staffCount: Math.floor(Math.random() * 20) + 10,
    workingDays: Math.floor(Math.random() * 5) + 25,
    workingHours: Math.floor(Math.random() * 200) + 800,
    cashSales: Math.floor(Math.random() * 5000000) + 10000000,
    cardCount: Math.floor(Math.random() * 500) + 1000,
    cardSales: Math.floor(Math.random() * 3000000) + 5000000,
    turnoverRate: Math.random() * 0.5 + 1.5,
    tokyoCount: Math.floor(Math.random() * 300) + 500,
    kanagawaCount: Math.floor(Math.random() * 200) + 300,
    totalCount: 0, // Will be calculated
    totalSales: 0, // Will be calculated
    salesPerCustomer: 0, // Will be calculated
    discounts: Math.floor(Math.random() * 500000) + 500000,
    pointRewards: Math.floor(Math.random() * 200000) + 200000,
    totalRevenue: 0, // Will be calculated
    outsourcingCost: Math.floor(Math.random() * 1000000) + 2000000,
    welfareCost: Math.floor(Math.random() * 500000) + 1000000,
    newCustomerCount: Math.floor(Math.random() * 100) + 100,
    repeatCustomerCount: Math.floor(Math.random() * 400) + 600,
    storeSales: 0, // Will be calculated
    previousYearRatio: Math.round((Math.random() * 0.4 + 0.8) * 100) / 100,
    storeSalesRatio: Math.round((Math.random() * 0.2 + 0.4) * 100) / 100,
  })).map((data) => {
    data.totalCount = data.tokyoCount + data.kanagawaCount
    data.totalSales = data.cashSales + data.cardSales
    data.salesPerCustomer = Math.round(data.totalSales / data.totalCount)
    data.totalRevenue = data.totalSales - data.discounts - data.pointRewards
    data.storeSales = data.totalRevenue - data.outsourcingCost - data.welfareCost
    return data
  })
}

export const staffPerformanceData: StaffPerformanceData[] = [
  {
    id: '1',
    name: 'みるく',
    age: 20,
    workDays: '20/30',
    cashTransactions: { count: 40, amount: 800000 },
    cardTransactions: { count: 20, amount: 400000 },
    totalTransactions: 60,
    newCustomers: { free: 5, paid: 10 },
    designations: { regular: 15, total: 25, rate: 60 },
    discount: 50000,
    totalAmount: 1150000,
    staffFee: 575000,
    staffRevenue: 460000,
    storeRevenue: 115000,
  },
  {
    id: '2',
    name: 'さくら',
    age: 23,
    workDays: '22/30',
    cashTransactions: { count: 50, amount: 1000000 },
    cardTransactions: { count: 25, amount: 500000 },
    totalTransactions: 75,
    newCustomers: { free: 8, paid: 12 },
    designations: { regular: 20, total: 30, rate: 67 },
    discount: 75000,
    totalAmount: 1425000,
    staffFee: 712500,
    staffRevenue: 570000,
    storeRevenue: 142500,
  },
]

export function generateOptionSalesData(year: number): OptionSalesData[] {
  return options.map((option) => ({
    id: option.id,
    name: option.name,
    price: option.price,
    monthlySales: Array.from({ length: 12 }, () => Math.floor(Math.random() * 100)),
  }))
}

export function generateMarketingChannelData(year: number): MarketingChannelData[] {
  return [
    {
      channel: 'オフィシャル',
      monthlySales: [26, 16, 13, 21, 20, 18, 17, 13, 9, 8, 3, 0],
      total: 164,
    },
    {
      channel: '口コミ風俗情報局',
      monthlySales: [60, 56, 45, 67, 81, 81, 99, 77, 59, 46, 50, 23],
      total: 744,
    },
    {
      channel: 'シティーヘブン',
      monthlySales: [71, 68, 43, 70, 53, 91, 81, 80, 50, 40, 58, 25],
      total: 730,
    },
    {
      channel: 'ヘブンネット予約（店リピ）',
      monthlySales: [13, 28, 8, 13, 23, 16, 14, 11, 16, 11, 12, 6],
      total: 171,
    },
    {
      channel: 'ヘブンネット予約（新規）',
      monthlySales: [0, 0, 0, 0, 0, 12, 24, 22, 18, 10, 17, 4],
      total: 107,
    },
    {
      channel: '姫(ヒメ)予約※店リピ・本指',
      monthlySales: [38, 42, 22, 5, 6, 31, 36, 22, 36, 38, 28, 16],
      total: 320,
    },
    {
      channel: '姫(ヒメ)予約※新規',
      monthlySales: [0, 0, 0, 0, 0, 0, 1, 5, 10, 5, 8, 3],
      total: 32,
    },
    {
      channel: '店リピート',
      monthlySales: [113, 96, 103, 93, 91, 103, 110, 104, 69, 82, 75, 30],
      total: 1069,
    },
    {
      channel: '本指名リピート',
      monthlySales: [30, 35, 27, 30, 30, 36, 38, 48, 35, 28, 45, 21],
      total: 403,
    },
    {
      channel: '女性紹介',
      monthlySales: [0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0],
      total: 1,
    },
    {
      channel: '知人紹介',
      monthlySales: [1, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0],
      total: 3,
    },
    {
      channel: 'FJS協会（講師）紹介',
      monthlySales: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      total: 0,
    },
    {
      channel: '姉妹店（会員など）',
      monthlySales: [0, 1, 0, 0, 3, 1, 3, 3, 5, 3, 2, 3],
      total: 24,
    },
    {
      channel: 'DXブログ取材',
      monthlySales: [0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0],
      total: 1,
    },
    {
      channel: '不明（わからない）',
      monthlySales: [0, 0, 0, 0, 1, 2, 0, 0, 3, 0, 0, 1],
      total: 7,
    },
  ]
}

export function generateCourseSalesData(year: number, month: number): CourseSalesData[] {
  const daysInMonth = new Date(year, month, 0).getDate()
  return courses.map((course) => ({
    id: course.id,
    name: course.name,
    duration: course.duration,
    price: course.price,
    sales: Array.from({ length: daysInMonth }, () => Math.floor(Math.random() * 10)),
  }))
}

export function generateDailyData(year: number, month: number): DailyData[] {
  const daysInMonth = new Date(year, month, 0).getDate()
  return Array.from({ length: daysInMonth }, (_, index) => {
    const date = new Date(year, month - 1, index + 1)
    return {
      date: index + 1,
      dayOfWeek: ['日', '月', '火', '水', '木', '金', '土'][date.getDay()],
      staffCount: Math.floor(Math.random() * 10) + 5,
      workingHours: Math.floor(Math.random() * 50) + 30,
      directSales: Math.floor(Math.random() * 500000) + 100000,
      cardSales: Math.floor(Math.random() * 300000) + 50000,
      pointRewards: Math.floor(Math.random() * 10000),
      totalSales: 0, // Will be calculated
      staffSales: Math.floor(Math.random() * 400000) + 80000,
      storeSales: 0, // Will be calculated
      cashSales: 0, // Will be calculated
      customerCount: Math.floor(Math.random() * 30) + 10,
      turnoverRate: Math.random() * 0.5 + 1,
      newCustomers: Math.floor(Math.random() * 5) + 1,
      repeaters: Math.floor(Math.random() * 15) + 5,
      discounts: Math.floor(Math.random() * 5000),
      pointUsage: Math.floor(Math.random() * 3000),
    }
  }).map((day) => {
    day.totalSales = day.directSales + day.cardSales
    day.storeSales = day.totalSales - day.staffSales
    day.cashSales = day.totalSales - day.cardSales
    return day
  })
}
