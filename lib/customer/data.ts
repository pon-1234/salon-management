import { Customer, type CustomerUsageRecord, type CustomerPointHistory } from './types'

export type { Customer }

export const customers: Customer[] = [
  {
    id: '1',
    name: 'ダミー',
    nameKana: 'ダミー',
    phone: '09012345678',
    email: 'dummy@example.com',
    birthDate: new Date(1990, 0, 1),
    memberType: 'regular',
    smsEnabled: true,
    points: 4900,
    lastVisitDate: new Date(2023, 6, 7),
    notes: '',
    createdAt: new Date(2023, 5, 1),
    updatedAt: new Date(2023, 6, 7),
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
          balance: 4900,
        },
        {
          id: '2',
          date: new Date(2023, 11, 10),
          type: 'used',
          amount: -200,
          description: 'ポイント利用',
          balance: 4770,
        },
        {
          id: '3',
          date: new Date(2023, 11, 1),
          type: 'earned',
          amount: 180,
          description: '90分コース利用',
          relatedService: '90分コース',
          balance: 4970,
        },
        {
          id: '4',
          date: new Date(2023, 10, 25),
          type: 'adjusted',
          amount: 100,
          description: 'サービス調整',
          balance: 4790,
        },
        {
          id: '5',
          date: new Date(2023, 10, 20),
          type: 'used',
          amount: -500,
          description: 'ポイント利用（割引適用）',
          balance: 4690,
        },
        {
          id: '6',
          date: new Date(2023, 10, 15),
          type: 'earned',
          amount: 220,
          description: '120分コース利用',
          relatedService: '120分コース',
          balance: 5190,
        },
        {
          id: '7',
          date: new Date(2023, 9, 30),
          type: 'expired',
          amount: -50,
          description: 'ポイント期限切れ',
          balance: 4970,
        },
      ]
      resolve(mockPointHistory.sort((a, b) => b.date.getTime() - a.date.getTime()))
    }, 100) // Simulate network delay
  })
}
