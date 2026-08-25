/**
 * @design_doc   Reservation start-time boundary shared by booking UIs and the reservation API
 * @related_to   QuickBookingDialog, ReservationDialog, app/api/reservation/route.ts
 * @known_issues Existing legacy reservations keep their original start when unrelated fields change
 */

export const RESERVATION_START_STEP_MINUTES = 5
export const RESERVATION_START_STEP_SECONDS = RESERVATION_START_STEP_MINUTES * 60
const RESERVATION_START_STEP_MILLISECONDS = RESERVATION_START_STEP_SECONDS * 1000

export function reservationStartBoundaryErrorMessage(): string {
  return `開始時間は${RESERVATION_START_STEP_MINUTES}分単位で指定してください。`
}

export function reservationStartMinuteHint(): string {
  return `開始時間の分は${RESERVATION_START_STEP_MINUTES}分単位で指定してください。`
}

export function reservationStartBoundaryToastTitle(): string {
  return `開始時間は${RESERVATION_START_STEP_MINUTES}分単位で入力してください`
}

export function isReservationStartBoundary(value: Date): boolean {
  return value.getTime() % RESERVATION_START_STEP_MILLISECONDS === 0
}

export function ceilReservationStartMinutes(value: number): number {
  return Math.ceil(value / RESERVATION_START_STEP_MINUTES) * RESERVATION_START_STEP_MINUTES
}

export function ceilReservationStartDate(value: Date): Date {
  return new Date(
    Math.ceil(value.getTime() / RESERVATION_START_STEP_MILLISECONDS) *
      RESERVATION_START_STEP_MILLISECONDS
  )
}
