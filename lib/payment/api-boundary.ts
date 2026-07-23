/**
 * @design_doc   Issue #5 - Payment API server-side trust boundary
 * @related_to   Reservation, payment routes, administrator store assignments
 * @known_issues Customer records are global, so administrator-wide customer payment history is denied
 */

import type { Session } from 'next-auth'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hasPermission } from '@/lib/auth/permissions'
import { canAdminAccessStore } from '@/lib/auth/store-access'
import type { PaymentMethod, PaymentTransaction, ProcessPaymentRequest } from './types'

export const PAYMENT_RESERVATION_SELECT = {
  id: true,
  customerId: true,
  storeId: true,
  price: true,
  paymentMethod: true,
  status: true,
} as const

export interface PaymentReservation {
  id: string
  customerId: string
  storeId: string
  price: number
  paymentMethod: string | null
  status: string
}

const SERVER_MANAGED_PAYMENT_FIELDS = new Set([
  'clientSecret',
  'errorMessage',
  'metadata',
  'paymentIntentId',
  'processedAt',
  'providerId',
  'status',
  'stripePaymentId',
  'transaction',
  'type',
])

export async function findPaymentReservation(
  reservationId: string
): Promise<PaymentReservation | null> {
  return db.reservation.findUnique({
    where: { id: reservationId },
    select: PAYMENT_RESERVATION_SELECT,
  })
}

export function authorizePaymentReservation(
  session: Session,
  reservation: PaymentReservation,
  adminPermission: string
): NextResponse | null {
  if (session.user.role === 'customer') {
    if (session.user.id !== reservation.customerId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    return null
  }

  if (session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (!hasPermission(session.user.permissions ?? [], adminPermission)) {
    return NextResponse.json({ error: 'この操作を行う権限がありません' }, { status: 403 })
  }

  if (!canAdminAccessStore(session.user, reservation.storeId)) {
    return NextResponse.json({ error: 'この店舗を操作する権限がありません' }, { status: 403 })
  }

  return null
}

export function resolveReservationPaymentMethod(value: string | null): PaymentMethod | null {
  const normalized = value?.trim().toLowerCase()
  if (!normalized) {
    return null
  }
  if (normalized === 'cash' || normalized.includes('現金')) {
    return 'cash'
  }
  if (normalized === 'card' || normalized.includes('カード')) {
    return 'card'
  }
  if (normalized === 'bank_transfer' || normalized.includes('銀行振込')) {
    return 'bank_transfer'
  }
  return null
}

export function containsServerManagedPaymentFields(body: Record<string, unknown>): boolean {
  return Object.keys(body).some((key) => SERVER_MANAGED_PAYMENT_FIELDS.has(key))
}

export function validateReservationClaims(
  body: Record<string, unknown>,
  reservation: PaymentReservation,
  paymentMethod: PaymentMethod
): NextResponse | null {
  const mismatched =
    (body.customerId !== undefined && body.customerId !== reservation.customerId) ||
    (body.amount !== undefined && body.amount !== reservation.price) ||
    (body.storeId !== undefined && body.storeId !== reservation.storeId) ||
    (body.currency !== undefined && body.currency !== 'jpy') ||
    (body.paymentMethod !== undefined && body.paymentMethod !== paymentMethod)

  if (mismatched) {
    return NextResponse.json(
      { error: 'Payment details do not match the reservation' },
      { status: 409 }
    )
  }

  return null
}

export function buildCanonicalPaymentRequest(
  reservation: PaymentReservation,
  paymentMethod: PaymentMethod
): ProcessPaymentRequest {
  return {
    reservationId: reservation.id,
    customerId: reservation.customerId,
    amount: reservation.price,
    currency: 'jpy',
    paymentMethod,
    provider: 'manual',
    metadata: { storeId: reservation.storeId },
  }
}

export function toPublicPaymentTransaction(transaction: PaymentTransaction) {
  return {
    id: transaction.id,
    reservationId: transaction.reservationId,
    customerId: transaction.customerId,
    amount: transaction.amount,
    currency: transaction.currency,
    provider: transaction.provider,
    paymentMethod: transaction.paymentMethod,
    status: transaction.status,
    processedAt: transaction.processedAt,
    refundedAt: transaction.refundedAt,
    refundAmount: transaction.refundAmount,
    createdAt: transaction.createdAt,
    updatedAt: transaction.updatedAt,
  }
}
