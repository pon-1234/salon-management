export interface Reservation {
  id: string;
  customerId: string;
  staffId: string;
  serviceId: string;
  startTime: Date;
  endTime: Date;
  status: 'confirmed' | 'pending' | 'cancelled';
  price: number;
  notes?: string;
}

export interface Service {
  id: string;
  name: string;
  duration: number;
  price: number;
}
