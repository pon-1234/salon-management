import { Repository } from '../shared'
import { Reservation, Service } from '../types/reservation'

export interface ReservationRepository extends Repository<Reservation> {
  getReservationsByCustomer(customerId: string): Promise<Reservation[]>
  getReservationsByStaff(staffId: string, startDate: Date, endDate: Date): Promise<Reservation[]>
  getServices(): Promise<Service[]>
  checkAvailability(
    castId: string,
    startTime: Date,
    endTime: Date
  ): Promise<{ available: boolean; conflicts?: any[] }>
  getAvailableSlots(
    castId: string,
    date: Date,
    duration: number
  ): Promise<{ startTime: string; endTime: string }[]>
}
