import { Reservation, Service } from '../types/reservation'

type ReservationSeed = Omit<Reservation, 'storeId' | 'castId'> & {
  storeId?: string
  castId?: string
}

export const mockServices: Service[] = [
  // キャンペーンコース
  {
    id: 'campaign70',
    name: '70分お試しフリー限定',
    duration: 70,
    price: 13000,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'campaign90',
    name: '90分コース',
    duration: 90,
    price: 19000,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'campaign110',
    name: '110分人気No.2コース',
    duration: 110,
    price: 25000,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'campaign130',
    name: '130分人気No.1コース',
    duration: 130,
    price: 30000,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'campaign160',
    name: '160分コース',
    duration: 160,
    price: 36000,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'campaign190',
    name: '190分コース',
    duration: 190,
    price: 42000,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  // 密着睾丸コース
  {
    id: '60min',
    name: '60分お試しフリー限定',
    duration: 60,
    price: 16000,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '80min',
    name: '80分コース',
    duration: 80,
    price: 21000,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '100min',
    name: '100分コース',
    duration: 100,
    price: 26000,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '120min',
    name: '120分オススメコース',
    duration: 120,
    price: 32000,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '150min',
    name: '150分コース',
    duration: 150,
    price: 39000,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '180min',
    name: '180分コース',
    duration: 180,
    price: 46000,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'extension30',
    name: '延長30分',
    duration: 30,
    price: 8000,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
]

const reservationSeeds: ReservationSeed[] = [
  {
    id: '1',
    customerId: '1',
    staffId: '1',
    serviceId: '60min',
    startTime: new Date(2024, 11, 15, 14, 0),
    endTime: new Date(2024, 11, 15, 15, 0),
    status: 'confirmed',
    price: 13000,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '2',
    customerId: '2',
    staffId: '2',
    serviceId: '90min',
    startTime: new Date(2024, 11, 15, 16, 0),
    endTime: new Date(2024, 11, 15, 17, 30),
    status: 'pending',
    price: 18000,
    notes: '初めてのご利用です。丁寧な対応をお願いします。',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '3',
    customerId: '3',
    staffId: '3',
    serviceId: '120min',
    startTime: new Date(2024, 11, 16, 10, 0),
    endTime: new Date(2024, 11, 16, 12, 0),
    status: 'confirmed',
    price: 22000,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '4',
    customerId: '4',
    staffId: '4',
    serviceId: '150min',
    startTime: new Date(2024, 11, 16, 14, 0),
    endTime: new Date(2024, 11, 16, 16, 30),
    status: 'confirmed',
    price: 26000,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '5',
    customerId: '5',
    staffId: '1',
    serviceId: 'event70',
    startTime: new Date(2024, 11, 17, 18, 0),
    endTime: new Date(2024, 11, 17, 19, 10),
    status: 'pending',
    price: 15000,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '6',
    customerId: '6',
    staffId: '2',
    serviceId: 'event110',
    startTime: new Date(2024, 11, 17, 20, 0),
    endTime: new Date(2024, 11, 17, 21, 50),
    status: 'confirmed',
    price: 21000,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '7',
    customerId: '7',
    staffId: '3',
    serviceId: '80min',
    startTime: new Date(2024, 11, 18, 12, 0),
    endTime: new Date(2024, 11, 18, 13, 20),
    status: 'confirmed',
    price: 16000,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '8',
    customerId: '8',
    staffId: '4',
    serviceId: '100min',
    startTime: new Date(2024, 11, 18, 15, 0),
    endTime: new Date(2024, 11, 18, 16, 40),
    status: 'pending',
    price: 19000,
    notes: 'アロマオイルマッサージをリクエスト',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '9',
    customerId: '9',
    staffId: '1',
    serviceId: '180min',
    startTime: new Date(2024, 11, 19, 19, 0),
    endTime: new Date(2024, 11, 19, 22, 0),
    status: 'confirmed',
    price: 30000,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: '10',
    customerId: '10',
    staffId: '2',
    serviceId: 'extension30',
    startTime: new Date(2024, 11, 19, 22, 30),
    endTime: new Date(2024, 11, 19, 23, 0),
    status: 'confirmed',
    price: 5000,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
]

let mockReservations: Reservation[] = reservationSeeds.map((reservation) => ({
  ...reservation,
  storeId: reservation.storeId ?? 'ikebukuro',
  castId: reservation.castId ?? reservation.staffId,
}))

export function getMockReservations(): Reservation[] {
  return [...mockReservations]
}

export async function getMockReservationsByCustomerId(
  customerId: string
): Promise<Reservation[]> {
  // This is a mock implementation. In the future, replace this with an API call.
  return new Promise((resolve) => {
    setTimeout(() => {
      const customerReservations = mockReservations.filter(
        (reservation) => reservation.customerId === customerId
      )
      resolve(customerReservations)
    }, 100) // Simulate network delay
  })
}

export async function getAllMockReservations(): Promise<Reservation[]> {
  // This is a mock implementation. In the future, replace this with an API call.
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve([...mockReservations])
    }, 100) // Simulate network delay
  })
}

export function updateMockReservation(id: string, updates: Partial<Reservation>): void {
  const index = mockReservations.findIndex((r) => r.id === id)
  if (index !== -1) {
    mockReservations[index] = { ...mockReservations[index], ...updates, updatedAt: new Date() }
  }
}

export function addMockReservation(
  reservation: Omit<Reservation, 'id' | 'createdAt' | 'updatedAt'>
): Reservation {
  const newReservation: Reservation = {
    ...reservation,
    id: (mockReservations.length + 1).toString(),
    createdAt: new Date(),
    updatedAt: new Date(),
  }
  mockReservations.push(newReservation)
  return newReservation
}

export function resetMockReservations(data: Reservation[] = mockReservations) {
  mockReservations = data.map((reservation) => ({ ...reservation }))
}
