/**
 * @design_doc   Reservation card/cash rows for the admin payment-status ledger
 * @related_to   PaymentStatusTable, GET /api/payments
 * @known_issues Online card capture remains disabled in preview
 */
import { describe, expect, it } from 'vitest'

import { toReservationPaymentLedgerRow } from './reservation-ledger'

describe('toReservationPaymentLedgerRow', () => {
  it('maps a completed card reservation to a completed ledger row with the management number', () => {
    expect(
      toReservationPaymentLedgerRow({
        id: 'reservation-card-1',
        customerId: 'customer-1',
        price: 22_000,
        paymentMethod: 'カード',
        paymentReference: 'UAT-0815-1030',
        status: 'completed',
        startTime: new Date('2026-08-15T12:00:00.000Z'),
        updatedAt: new Date('2026-08-15T13:00:00.000Z'),
      })
    ).toMatchObject({
      id: 'reservation-payment:reservation-card-1',
      reservationId: 'reservation-card-1',
      customerId: 'customer-1',
      amount: 22_000,
      currency: 'jpy',
      provider: 'manual',
      paymentMethod: 'card',
      status: 'completed',
      metadata: { paymentReference: 'UAT-0815-1030' },
    })
  })

  it('keeps cancelled reservations visible as cancelled ledger rows', () => {
    expect(
      toReservationPaymentLedgerRow({
        id: 'reservation-cash-1',
        customerId: 'customer-2',
        price: 18_000,
        paymentMethod: 'cash',
        paymentReference: null,
        status: 'cancelled',
        startTime: new Date('2026-08-15T12:00:00.000Z'),
        updatedAt: new Date('2026-08-15T13:00:00.000Z'),
      })
    ).toMatchObject({
      paymentMethod: 'cash',
      status: 'cancelled',
    })
  })
})
