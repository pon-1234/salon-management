/**
 * @design_doc   Client operational review: payment totals cover the full filtered result set
 * @related_to   PaymentStatusTable and GET /api/payments
 * @known_issues None currently
 */
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PaymentStatusTable } from './payment-status-table'
import type { PaymentTransaction, PaymentTransactionSummary } from '@/lib/payment/types'

const payment: PaymentTransaction = {
  id: 'payment-visible-row',
  reservationId: 'reservation-visible-row',
  customerId: 'customer-visible-row',
  amount: 12_000,
  currency: 'jpy',
  provider: 'manual',
  paymentMethod: 'cash',
  status: 'completed',
  createdAt: new Date('2026-08-14T00:00:00.000Z'),
  updatedAt: new Date('2026-08-14T00:00:00.000Z'),
}

const summary: PaymentTransactionSummary = {
  statusCounts: {
    completed: 42,
    pending: 3,
    processing: 2,
    failed: 1,
    cancelled: 4,
    refunded: 5,
  },
  completedAmount: 504_000,
  refundedAmount: 20_000,
  totalTransactions: 57,
  totalAmount: 600_000,
}

describe('PaymentStatusTable', () => {
  it('renders authoritative full-period totals independently of the visible page', () => {
    render(<PaymentStatusTable payments={[payment]} summary={summary} />)

    expect(screen.getByText('¥600,000')).toBeInTheDocument()
    expect(screen.getByText('¥504,000')).toBeInTheDocument()
    expect(screen.getByText('¥20,000')).toBeInTheDocument()
    expect(screen.getByText('42')).toBeInTheDocument()
    expect(screen.queryByText('57')).not.toBeInTheDocument()
  })
})
