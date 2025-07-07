import { Reservation, Service } from '../types/reservation'

export const services: Service[] = [
  // キャンペーンコース
  { id: 'campaign70', name: '70分お試しフリー限定', duration: 70, price: 13000 },
  { id: 'campaign90', name: '90分コース', duration: 90, price: 19000 },
  { id: 'campaign110', name: '110分人気No.2コース', duration: 110, price: 25000 },
  { id: 'campaign130', name: '130分人気No.1コース', duration: 130, price: 30000 },
  { id: 'campaign160', name: '160分コース', duration: 160, price: 36000 },
  { id: 'campaign190', name: '190分コース', duration: 190, price: 42000 },
  // 密着睾丸コース
  { id: '60min', name: '60分お試しフリー限定', duration: 60, price: 16000 },
  { id: '80min', name: '80分コース', duration: 80, price: 21000 },
  { id: '100min', name: '100分コース', duration: 100, price: 26000 },
  { id: '120min', name: '120分オススメコース', duration: 120, price: 32000 },
  { id: '150min', name: '150分コース', duration: 150, price: 39000 },
  { id: '180min', name: '180分コース', duration: 180, price: 46000 },
  { id: 'extension30', name: '延長30分', duration: 30, price: 8000 },
]

let reservations: Reservation[] = [
  {
    id: '1',
    customerId: '1',
    staffId: '1',
    serviceId: '60min',
    startTime: new Date(2024, 11, 15, 14, 0),
    endTime: new Date(2024, 11, 15, 15, 0),
    status: 'confirmed',
    price: 13000,
    customerName: '山田太郎',
    staffName: 'みるく',
    staffRank: 'ゴールド',
    courseName: '基本コース',
    duration: 60,
    location: '池袋（北口・西口）',
    isNewDesignation: false,
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
    customerName: '鈴木花子',
    staffName: 'さくら',
    staffRank: 'シルバー',
    courseName: 'リラックスコース',
    duration: 90,
    location: '池袋（東口）ホテルA 302号室',
    isNewDesignation: true,
    notes: '初めてのご利用です。丁寧な対応をお願いします。',
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
    customerName: '佐藤次郎',
    staffName: 'れい',
    staffRank: 'ブロンズ',
    courseName: 'プレミアムコース',
    duration: 120,
    location: '池袋（北口・西口）ホテルB 505号室',
    isNewDesignation: false,
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
    customerName: '高橋美咲',
    staffName: 'ゆき',
    staffRank: 'ゴールド',
    courseName: 'VIPコース',
    duration: 150,
    location: '池袋（南口）ホテルC 701号室',
    isNewDesignation: true,
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
    customerName: '渡辺健太',
    staffName: 'みるく',
    staffRank: 'ゴールド',
    courseName: 'イベントコース',
    duration: 70,
    location: '池袋（北口・西口）',
    isNewDesignation: false,
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
    customerName: '木村雅子',
    staffName: 'さくら',
    staffRank: 'シルバー',
    courseName: 'スペシャルイベントコース',
    duration: 110,
    location: '池袋（東口）ホテルD 203号室',
    isNewDesignation: true,
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
    customerName: '中村俊介',
    staffName: 'れい',
    staffRank: 'ブロンズ',
    courseName: 'ランチタイムコース',
    duration: 80,
    location: '池袋（北口・西口）ホテルE 404号室',
    isNewDesignation: false,
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
    customerName: '小林恵美',
    staffName: 'ゆき',
    staffRank: 'ゴールド',
    courseName: 'アフタヌーンコース',
    duration: 100,
    location: '池袋（南口）',
    isNewDesignation: true,
    notes: 'アロマオイルマッサージをリクエスト',
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
    customerName: '田中誠',
    staffName: 'みるく',
    staffRank: 'ゴールド',
    courseName: 'ロングコース',
    duration: 180,
    location: '池袋（北口・西口）ホテルF 801号室',
    isNewDesignation: false,
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
    customerName: '山本裕子',
    staffName: 'さくら',
    staffRank: 'シルバー',
    courseName: '延長コース',
    duration: 30,
    location: '池袋（東口）ホテルG 605号室',
    isNewDesignation: false,
  },
]

export async function getReservationsByCustomerId(customerId: string): Promise<Reservation[]> {
  // This is a mock implementation. In the future, replace this with an API call.
  return new Promise((resolve) => {
    setTimeout(() => {
      const customerReservations = reservations.filter(
        (reservation) => reservation.customerId === customerId
      )
      resolve(customerReservations)
    }, 100) // Simulate network delay
  })
}

export async function getAllReservations(): Promise<Reservation[]> {
  // This is a mock implementation. In the future, replace this with an API call.
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(reservations)
    }, 100) // Simulate network delay
  })
}

export function addReservation(newReservation: Reservation): void {
  reservations.push(newReservation)
}

export function updateReservation(updatedReservation: Reservation): void {
  const index = reservations.findIndex((r) => r.id === updatedReservation.id)
  if (index !== -1) {
    reservations[index] = updatedReservation
  }
}

export function deleteReservation(id: string): void {
  reservations = reservations.filter((r) => r.id !== id)
}
