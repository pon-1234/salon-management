import { SalesRecord, PaymentRecord, SettlementSummary } from './types'

// 売上記録のモックデータ
export const mockSalesRecords: SalesRecord[] = [
  {
    id: 'sales_001',
    castId: '1',
    date: new Date('2025-06-05T14:00:00'),
    serviceName: 'スタンダード120分',
    customerName: '田中様',
    serviceAmount: 15000,
    designationFee: 2000,
    optionFees: 3000,
    totalAmount: 20000,
    castShare: 12000,
    shopShare: 8000,
    paymentStatus: '未精算',
    location: '六本木ヒルズ',
    notes: 'リピーター様',
  },
  {
    id: 'sales_002',
    castId: '1',
    date: new Date('2025-06-04T19:30:00'),
    serviceName: 'プレミアム90分',
    customerName: '佐藤様',
    serviceAmount: 18000,
    designationFee: 3000,
    optionFees: 0,
    totalAmount: 21000,
    castShare: 12600,
    shopShare: 8400,
    paymentStatus: '精算済み',
    location: '恵比寿ガーデンプレイス',
  },
  {
    id: 'sales_003',
    castId: '1',
    date: new Date('2025-06-03T16:00:00'),
    serviceName: 'リラクゼーション60分',
    customerName: '山田様',
    serviceAmount: 10000,
    designationFee: 1500,
    optionFees: 2000,
    totalAmount: 13500,
    castShare: 8100,
    shopShare: 5400,
    paymentStatus: '未精算',
    location: '新宿パークハイアット',
  },
  {
    id: 'sales_004',
    castId: '1',
    date: new Date('2025-06-02T20:00:00'),
    serviceName: 'スタンダード120分',
    customerName: '鈴木様',
    serviceAmount: 15000,
    designationFee: 2000,
    optionFees: 1000,
    totalAmount: 18000,
    castShare: 10800,
    shopShare: 7200,
    paymentStatus: '精算済み',
    location: '渋谷スクランブルスクエア',
  },
  {
    id: 'sales_005',
    castId: '1',
    date: new Date('2025-06-01T13:00:00'),
    serviceName: 'プレミアム150分',
    customerName: '高橋様',
    serviceAmount: 25000,
    designationFee: 4000,
    optionFees: 5000,
    totalAmount: 34000,
    castShare: 20400,
    shopShare: 13600,
    paymentStatus: '未精算',
    location: '銀座リッツカールトン',
    notes: 'VIP顧客',
  },
]

// 入金記録のモックデータ
export const mockPaymentRecords: PaymentRecord[] = [
  {
    id: 'payment_001',
    castId: '1',
    date: new Date('2025-06-04T10:00:00'),
    paymentType: '現金精算',
    amount: 23400,
    salesRecordIds: ['sales_002', 'sales_004'],
    handledBy: '管理者',
    notes: '6/2-6/4分の精算',
  },
  {
    id: 'payment_002',
    castId: '1',
    date: new Date('2025-05-30T15:30:00'),
    paymentType: '現金精算',
    amount: 35000,
    salesRecordIds: ['sales_006', 'sales_007', 'sales_008'],
    handledBy: '管理者',
    notes: '5月末分の精算',
  },
  {
    id: 'payment_003',
    castId: '1',
    date: new Date('2025-05-25T11:00:00'),
    paymentType: '振込',
    amount: 45000,
    salesRecordIds: ['sales_009', 'sales_010'],
    handledBy: '経理担当',
    notes: '指定口座への振込',
  },
]

// 精算サマリーのモックデータ
export const mockSettlementSummary: SettlementSummary = {
  castId: '1',
  period: {
    from: new Date('2025-06-01'),
    to: new Date('2025-06-05'),
  },
  totalSales: 106500,
  totalCastShare: 63900,
  totalPaid: 23400,
  pendingAmount: 40500,
  recordCount: 5,
}

// キャスト別の売上記録を取得
export const getSalesRecordsByCast = (castId: string): SalesRecord[] => {
  return mockSalesRecords.filter((record) => record.castId === castId)
}

// キャスト別の入金記録を取得
export const getPaymentRecordsByCast = (castId: string): PaymentRecord[] => {
  return mockPaymentRecords.filter((record) => record.castId === castId)
}

// キャスト別の精算サマリーを取得
export const getSettlementSummaryByCast = (castId: string): SettlementSummary => {
  // 実際のアプリでは動的に計算される
  return mockSettlementSummary
}

// 期間指定での売上記録取得
export const getSalesRecordsByPeriod = (castId: string, from: Date, to: Date): SalesRecord[] => {
  return mockSalesRecords.filter(
    (record) => record.castId === castId && record.date >= from && record.date <= to
  )
}
