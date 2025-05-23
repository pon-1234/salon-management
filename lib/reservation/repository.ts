import { Reservation, Service } from './types';

export interface ReservationRepository {
  getReservation(id: string): Promise<Reservation | null>;
  getReservationsByCustomer(customerId: string): Promise<Reservation[]>;
  getReservationsByStaff(staffId: string, startDate: Date, endDate: Date): Promise<Reservation[]>;
  createReservation(reservation: Omit<Reservation, 'id'>): Promise<Reservation>;
  updateReservation(id: string, reservation: Partial<Reservation>): Promise<Reservation>;
  deleteReservation(id: string): Promise<void>;
  getServices(): Promise<Service[]>;
}
