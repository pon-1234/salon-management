import { Customer, type CustomerUsageRecord, type CustomerPointHistory } from './types'

export type { Customer }

export const customers: Customer[] = [
  {
    id: '1',
    name: 'ダミー',
    nameKana: 'ダミー',
    phone: '09012345678',
    email: 'dummy@example.com',
    password: 'password123',
    birthDate: new Date(1990, 0, 1),
    age: 34,
    memberType: 'regular',
    smsEnabled: true,
    emailNotificationEnabled: true,
    points: 4900,
    registrationDate: new Date(2023, 5, 1),
    lastVisitDate: new Date(2023, 6, 7),
    notes: '',
    createdAt: new Date(2023, 5, 1),
    updatedAt: new Date(2023, 6, 7),
  },
  {
    id: 'demo-tanaka',
    name: '田中 太郎',
    nameKana: 'タナカ タロウ',
    phone: '08012345678',
    email: 'tanaka@example.com',
    password: 'password123',
    birthDate: new Date(1992, 4, 12),
    age: 32,
    memberType: 'vip',
    smsEnabled: true,
    emailNotificationEnabled: true,
    points: 12500,
    registrationDate: new Date(2024, 0, 10),
    lastVisitDate: new Date(2024, 9, 5),
    notes: 'デモ用顧客。ログイン検証に使用。',
    createdAt: new Date(2024, 0, 10),
    updatedAt: new Date(2024, 9, 5),
  },
]

export async function getCustomerUsageHistory(customerId: string): Promise<CustomerUsageRecord[]> {
  // This is a mock implementation. In the future, replace this with an API call.
  return new Promise((resolve) => {
    setTimeout(() => {
      const mockHistory: CustomerUsageRecord[] = [
        {
          id: '1',
          date: new Date(2023, 11, 15),
          serviceName: '60分コース',
          staffName: 'みるく',
          amount: 13000,
          status: 'completed',
        },
        {
          id: '2',
          date: new Date(2023, 11, 1),
          serviceName: '90分コース',
          staffName: 'さくら',
          amount: 18000,
          status: 'completed',
        },
        {
          id: '3',
          date: new Date(2023, 10, 20),
          serviceName: '120分コース',
          staffName: 'れい',
          amount: 22000,
          status: 'cancelled',
        },
      ]
      resolve(mockHistory)
    }, 100) // Simulate network delay
  })
}

export async function getCustomerPointHistory(customerId: string): Promise<CustomerPointHistory[]> {
  // This is a mock implementation. In the future, replace this with an API call.
  return new Promise((resolve) => {
    setTimeout(() => {
      const mockPointHistory: CustomerPointHistory[] = [
        {
          id: '1',
          date: new Date(2023, 11, 15),
          type: 'earned',
          amount: 130,
          description: '60分コース利用',
          relatedService: '60分コース',
          reservationId: 'res-1',
          expiresAt: new Date(2024, 11, 15),
          balance: 4900,
        },
        {
          id: '2',
          date: new Date(2023, 11, 10),
          type: 'used',
          amount: -200,
          description: 'ポイント利用',
          reservationId: null,
          expiresAt: null,
          balance: 4770,
        },
        {
          id: '3',
          date: new Date(2023, 11, 1),
          type: 'earned',
          amount: 180,
          description: '90分コース利用',
          relatedService: '90分コース',
          reservationId: 'res-2',
          expiresAt: new Date(2024, 11, 1),
          balance: 4970,
        },
        {
          id: '4',
          date: new Date(2023, 10, 25),
          type: 'adjusted',
          amount: 100,
          description: 'サービス調整',
          reservationId: null,
          expiresAt: null,
          balance: 4790,
        },
        {
          id: '5',
          date: new Date(2023, 10, 20),
          type: 'used',
          amount: -500,
          description: 'ポイント利用（割引適用）',
          reservationId: null,
          expiresAt: null,
          balance: 4690,
        },
        {
          id: '6',
          date: new Date(2023, 10, 15),
          type: 'earned',
          amount: 220,
          description: '120分コース利用',
          relatedService: '120分コース',
          reservationId: 'res-3',
          expiresAt: new Date(2024, 10, 15),
          balance: 5190,
        },
        {
          id: '7',
          date: new Date(2023, 9, 30),
          type: 'expired',
          amount: -50,
          description: 'ポイント期限切れ',
          reservationId: null,
          expiresAt: new Date(2023, 9, 30),
          balance: 4970,
        },
      ]
      resolve(mockPointHistory.sort((a, b) => b.date.getTime() - a.date.getTime()))
    }, 100) // Simulate network delay
  })
}
