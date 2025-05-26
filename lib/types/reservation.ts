export interface Reservation {
  id: string;
  customerId: string;
  staffId: string;
  serviceId: string;
  startTime: Date;
  endTime: Date;
  status: 'confirmed' | 'pending' | 'cancelled' | 'modifiable';
  price: number;
  notes?: string;
  modifiableUntil?: Date; // 修正可能期限
  lastModified?: Date; // 最終修正日時
}

export interface Service {
  id: string;
  name: string;
  duration: number;
  price: number;
}
