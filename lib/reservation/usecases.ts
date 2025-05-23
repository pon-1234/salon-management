import { Reservation, Service } from './types';
import { ReservationRepository } from './repository';

export class ReservationUseCases {
  constructor(private repository: ReservationRepository) {}

  async getReservation(id: string): Promise<Reservation | null> {
    return this.repository.getReservation(id);
  }

  async getReservationsByCustomer(customerId: string): Promise<Reservation[]> {
    return this.repository.getReservationsByCustomer(customerId);
  }

  async getReservationsByStaff(staffId: string, startDate: Date, endDate: Date): Promise<Reservation[]> {
    return this.repository.getReservationsByStaff(staffId, startDate, endDate);
  }

  async createReservation(reservation: Omit<Reservation, 'id'>): Promise<Reservation> {
    return this.repository.createReservation(reservation);
  }

  async updateReservation(id: string, reservation: Partial<Reservation>): Promise<Reservation> {
    return this.repository.updateReservation(id, reservation);
  }

  async deleteReservation(id: string): Promise<void> {
    return this.repository.deleteReservation(id);
  }

  async getServices(): Promise<Service[]> {
    return this.repository.getServices();
  }
}
