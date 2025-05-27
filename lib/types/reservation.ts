import { BaseEntity } from '../shared';

export interface Reservation extends BaseEntity {
  customerId: string;
  staffId: string;
  serviceId: string;
  startTime: Date;
  endTime: Date;
  status: 'confirmed' | 'pending' | 'cancelled' | 'modifiable';
  price: number;
  notes?: string;
  modifiableUntil?: Date;
  lastModified?: Date;
}

export interface Service extends BaseEntity {
  name: string;
  duration: number;
  price: number;
}
