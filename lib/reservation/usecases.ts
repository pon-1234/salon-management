import { BaseUseCasesImpl } from '../shared'
import { Reservation, Service } from '../types/reservation'
import { ReservationRepository } from './repository'

export class ReservationUseCases extends BaseUseCasesImpl<Reservation> {
  constructor(private reservationRepository: ReservationRepository) {
    super(reservationRepository)
  }

  async getReservationsByCustomer(customerId: string): Promise<Reservation[]> {
    return this.reservationRepository.getReservationsByCustomer(customerId)
  }

  async getReservationsByStaff(
    staffId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Reservation[]> {
    return this.reservationRepository.getReservationsByStaff(staffId, startDate, endDate)
  }

  async getServices(): Promise<Service[]> {
    return this.reservationRepository.getServices()
  }
}
