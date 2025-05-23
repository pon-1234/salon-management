import { Customer, type CustomerUsageRecord } from "./types"

export { Customer }

export const customers: Customer[] = [
  {
    id: "1",
    name: "ダミー",
    nameKana: "ダミー",
    phone: "09012345678",
    email: "dummy@example.com",
    birthDate: new Date(1990, 0, 1),
    memberType: "regular",
    smsEnabled: true,
    points: 4900,
    lastVisitDate: new Date(2023, 6, 7),
    notes: "",
  },
  // Add more customers as needed
]

export async function getCustomerUsageHistory(customerId: string): Promise<CustomerUsageRecord[]> {
  // This is a mock implementation. In the future, replace this with an API call.
  return new Promise((resolve) => {
    setTimeout(() => {
      const mockHistory: CustomerUsageRecord[] = [
        {
          id: "1",
          date: new Date(2023, 11, 15),
          serviceName: "60分コース",
          staffName: "みるく",
          amount: 13000,
          status: "completed",
        },
        {
          id: "2",
          date: new Date(2023, 11, 1),
          serviceName: "90分コース",
          staffName: "さくら",
          amount: 18000,
          status: "completed",
        },
        {
          id: "3",
          date: new Date(2023, 10, 20),
          serviceName: "120分コース",
          staffName: "れい",
          amount: 22000,
          status: "cancelled",
        },
      ]
      resolve(mockHistory)
    }, 100) // Simulate network delay
  })
}
