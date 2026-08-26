/**
 * @design_doc   Reservation list presentation and shared image-loading boundary
 * @related_to   ReservationList is the single ops table used by timeline list view and reservation-list page
 * @known_issues None
 */
'use client'

import { ReservationList } from './reservation-list'
import { ReservationData } from '@/lib/types/reservation'

interface ReservationTableProps {
  reservations: ReservationData[]
  onOpenReservation?: (reservation: ReservationData | null) => void
}

export function ReservationTable({ reservations, onOpenReservation }: ReservationTableProps) {
  return (
    <ReservationList
      reservations={reservations}
      onOpenReservation={onOpenReservation ?? undefined}
    />
  )
}
