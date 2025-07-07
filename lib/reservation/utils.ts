import { Reservation } from '../types/reservation'

export function calculateTotalRevenue(reservations: Reservation[]): number {
  return reservations.reduce((total, reservation) => total + reservation.price, 0)
}

export function getUpcomingReservations(reservations: Reservation[], date: Date): Reservation[] {
  return reservations.filter((reservation) => reservation.startTime > date)
}

export function groupReservationsByDate(reservations: Reservation[]): {
  [date: string]: Reservation[]
} {
  return reservations.reduce(
    (groups, reservation) => {
      const date = reservation.startTime.toISOString().split('T')[0]
      if (!groups[date]) {
        groups[date] = []
      }
      groups[date].push(reservation)
      return groups
    },
    {} as { [date: string]: Reservation[] }
  )
}

export function calculateReservationDuration(reservation: Reservation): number {
  return (reservation.endTime.getTime() - reservation.startTime.getTime()) / (1000 * 60)
}
