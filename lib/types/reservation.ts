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

export interface ReservationData {
  id: string;
  customerId: string;
  customerName: string;
  customerType: string;
  phoneNumber: string;
  points: number;
  bookingStatus: string;
  staffConfirmation: string;
  customerConfirmation: string;
  prefecture: string;
  district: string;
  location: string;
  locationType: string;
  specificLocation: string;
  staff: string;
  marketingChannel: string;
  date: string;
  time: string;
  inOutTime: string;
  course: string;
  freeExtension: string;
  designation: string;
  designationFee: string;
  options: Record<string, boolean>;
  transportationFee: number;
  paymentMethod: string;
  discount: string;
  additionalFee: number;
  totalPayment: number;
  storeRevenue: number;
  staffRevenue: number;
  staffBonusFee: number;
  startTime: Date;
  endTime: Date;
  staffImage: string;
}

export interface Service extends BaseEntity {
  name: string;
  duration: number;
  price: number;
}
