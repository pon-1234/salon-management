/**
 * @design_doc   Reservation card/cash rows for the admin payment-status ledger
 * @related_to   PaymentStatusTable, GET /api/payments
 * @known_issues Online card capture remains disabled in preview
 */
import type { PaymentMethod, PaymentStatus, PaymentTransaction } from './types'

export type ReservationPaymentSource = {
  id: string
  customerId: string | null
  price: number | null
  paymentMethod: string | null
  paymentReference?: string | null
  status: string
  startTime: Date
  updatedAt?: Date | null
}

function resolvePaymentMethod(value: string | null): PaymentMethod {
  const normalized = value?.trim().toLowerCase() ?? ''
  if (normalized.includes('card') || normalized.includes('カード')) return 'card'
  if (normalized.includes('bank') || normalized.includes('振込')) return 'bank_transfer'
  return 'cash'
}

function resolveStatus(status: string): PaymentStatus {
  if (status === 'cancelled') return 'cancelled'
  if (status === 'completed' || status === 'confirmed') return 'completed'
  return 'pending'
}

export function toReservationPaymentLedgerRow(
  reservation: ReservationPaymentSource
): PaymentTransaction {
  const processedAt = reservation.updatedAt ?? reservation.startTime
  return {
    id: `reservation-payment:${reservation.id}`,
    reservationId: reservation.id,
    customerId: reservation.customerId ?? '',
    amount: Math.max(reservation.price ?? 0, 0),
    currency: 'jpy',
    provider: 'manual',
    paymentMethod: resolvePaymentMethod(reservation.paymentMethod),
    status: resolveStatus(reservation.status),
    metadata: reservation.paymentReference
      ? { paymentReference: reservation.paymentReference }
      : undefined,
    processedAt,
    createdAt: reservation.startTime,
    updatedAt: processedAt,
  }
}
