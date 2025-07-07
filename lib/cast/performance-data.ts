import { WorkPerformance, MonthlyPerformanceSummary } from './types'

// 就業成績のモックデータ
export const mockWorkPerformances: WorkPerformance[] = [
  {
    id: 'perf_001',
    castId: '1',
    date: new Date('2025-06-05'),
    workDays: 1,
    workHours: 9,
    cashCount: 3,
    cashAmount: 45000,
    cardCount: 2,
    cardAmount: 36000,
    totalCount: 5,
    newFreeCount: 1,
    newPanelCount: 1,
    regularDesignationCount: 2,
    totalDesignationCount: 3,
    repeatRate: 60,
    discountAmount: 3000,
    totalAmount: 81000,
    welfareExpense: 8100,
    femaleRevenue: 48600,
    storeRevenue: 32400,
  },
  {
    id: 'perf_002',
    castId: '1',
    date: new Date('2025-06-04'),
    workDays: 1,
    workHours: 8.5,
    cashCount: 4,
    cashAmount: 60000,
    cardCount: 1,
    cardAmount: 18000,
    totalCount: 5,
    newFreeCount: 0,
    newPanelCount: 2,
    regularDesignationCount: 3,
    totalDesignationCount: 3,
    repeatRate: 80,
    discountAmount: 2000,
    totalAmount: 78000,
    welfareExpense: 7800,
    femaleRevenue: 46800,
    storeRevenue: 31200,
  },
  {
    id: 'perf_003',
    castId: '1',
    date: new Date('2025-06-03'),
    workDays: 1,
    workHours: 7.5,
    cashCount: 2,
    cashAmount: 30000,
    cardCount: 3,
    cardAmount: 54000,
    totalCount: 5,
    newFreeCount: 2,
    newPanelCount: 0,
    regularDesignationCount: 2,
    totalDesignationCount: 3,
    repeatRate: 40,
    discountAmount: 5000,
    totalAmount: 84000,
    welfareExpense: 8400,
    femaleRevenue: 50400,
    storeRevenue: 33600,
  },
  {
    id: 'perf_004',
    castId: '1',
    date: new Date('2025-06-02'),
    workDays: 1,
    workHours: 8,
    cashCount: 3,
    cashAmount: 42000,
    cardCount: 2,
    cardAmount: 30000,
    totalCount: 5,
    newFreeCount: 1,
    newPanelCount: 1,
    regularDesignationCount: 3,
    totalDesignationCount: 3,
    repeatRate: 75,
    discountAmount: 1000,
    totalAmount: 72000,
    welfareExpense: 7200,
    femaleRevenue: 43200,
    storeRevenue: 28800,
  },
  {
    id: 'perf_005',
    castId: '1',
    date: new Date('2025-06-01'),
    workDays: 1,
    workHours: 9.5,
    cashCount: 5,
    cashAmount: 75000,
    cardCount: 1,
    cardAmount: 15000,
    totalCount: 6,
    newFreeCount: 1,
    newPanelCount: 2,
    regularDesignationCount: 4,
    totalDesignationCount: 5,
    repeatRate: 83,
    discountAmount: 0,
    totalAmount: 90000,
    welfareExpense: 9000,
    femaleRevenue: 54000,
    storeRevenue: 36000,
  },
]

// 月間サマリーのモックデータ
export const mockMonthlyPerformanceSummary: MonthlyPerformanceSummary = {
  castId: '1',
  year: 2025,
  month: 6,
  totalWorkDays: 22,
  totalWorkHours: 176,
  totalCashCount: 68,
  totalCashAmount: 1020000,
  totalCardCount: 32,
  totalCardAmount: 576000,
  totalServiceCount: 100,
  totalNewCustomers: 18,
  totalDesignations: 65,
  averageRepeatRate: 65.8,
  totalRevenue: 1596000,
  totalCastShare: 957600,
  averageServiceAmount: 15960,
}

// キャスト別の就業成績を取得
export const getWorkPerformancesByCast = (castId: string): WorkPerformance[] => {
  return mockWorkPerformances.filter((performance) => performance.castId === castId)
}

// 月間サマリーを取得
export const getMonthlyPerformanceSummary = (
  castId: string,
  year: number,
  month: number
): MonthlyPerformanceSummary => {
  // 実際のアプリでは動的に計算される
  return mockMonthlyPerformanceSummary
}

// 期間指定での就業成績取得
export const getWorkPerformancesByPeriod = (
  castId: string,
  from: Date,
  to: Date
): WorkPerformance[] => {
  return mockWorkPerformances.filter(
    (performance) =>
      performance.castId === castId && performance.date >= from && performance.date <= to
  )
}

// 日別成績の集計
export const calculateDailyStats = (performances: WorkPerformance[]) => {
  const totalWorkDays = performances.length
  const totalWorkHours = performances.reduce((sum, p) => sum + p.workHours, 0)
  const totalCashCount = performances.reduce((sum, p) => sum + p.cashCount, 0)
  const totalCashAmount = performances.reduce((sum, p) => sum + p.cashAmount, 0)
  const totalCardCount = performances.reduce((sum, p) => sum + p.cardCount, 0)
  const totalCardAmount = performances.reduce((sum, p) => sum + p.cardAmount, 0)
  const totalServiceCount = performances.reduce((sum, p) => sum + p.totalCount, 0)
  const totalRevenue = performances.reduce((sum, p) => sum + p.totalAmount, 0)
  const totalNewCustomers = performances.reduce(
    (sum, p) => sum + p.newFreeCount + p.newPanelCount,
    0
  )
  const totalDesignations = performances.reduce((sum, p) => sum + p.totalDesignationCount, 0)
  const averageRepeatRate =
    performances.length > 0
      ? performances.reduce((sum, p) => sum + p.repeatRate, 0) / performances.length
      : 0

  return {
    totalWorkDays,
    totalWorkHours,
    averageWorkHours: totalWorkDays > 0 ? totalWorkHours / totalWorkDays : 0,
    totalCashCount,
    totalCashAmount,
    totalCardCount,
    totalCardAmount,
    totalServiceCount,
    averageServiceCount: totalWorkDays > 0 ? totalServiceCount / totalWorkDays : 0,
    totalRevenue,
    averageRevenue: totalWorkDays > 0 ? totalRevenue / totalWorkDays : 0,
    averageServiceAmount: totalServiceCount > 0 ? totalRevenue / totalServiceCount : 0,
    totalNewCustomers,
    newCustomerRate: totalServiceCount > 0 ? (totalNewCustomers / totalServiceCount) * 100 : 0,
    totalDesignations,
    designationRate: totalServiceCount > 0 ? (totalDesignations / totalServiceCount) * 100 : 0,
    averageRepeatRate,
  }
}
