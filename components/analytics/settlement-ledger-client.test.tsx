/**
 * @design_doc   Store-wide payment and settlement processing screens
 * @related_to   GET /api/admin/settlements
 * @known_issues None
 */
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { SettlementLedgerClient } from './settlement-ledger-client'

vi.mock('@/contexts/store-context', () => ({
  useStore: () => ({ currentStore: { id: 'ikebukuro' } }),
}))

const ledger = {
  month: '2026-08',
  casts: [
    {
      castId: 'cast-1',
      castName: 'さら',
      pendingCount: 1,
      pendingAmount: 18_000,
      settledAmount: 0,
      staffRevenue: 18_000,
      storeRevenue: 12_000,
      pendingReservations: [
        {
          id: 'reservation-1',
          castId: 'cast-1',
          castName: 'さら',
          customerName: '[UAT] 予約確認',
          courseName: '90分',
          startTime: '2026-08-15T12:00:00.000Z',
          price: 30_000,
          staffRevenue: 18_000,
          storeRevenue: 12_000,
          takeHome: 18_000,
          paymentMethod: 'カード',
          paymentReference: 'UAT-0815-1030',
          settlementStatus: 'pending',
        },
      ],
    },
  ],
  payments: [
    {
      id: 'payment-1',
      castId: 'cast-1',
      castName: 'さら',
      amount: 18_000,
      method: 'cash',
      handledBy: 'admin-1',
      paidAt: '2026-08-15T15:00:00.000Z',
      notes: null,
      reservationIds: ['reservation-2'],
    },
  ],
}

describe('SettlementLedgerClient', () => {
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('shows pending reservations on the payment processing screen', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify(ledger), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    )
    vi.stubGlobal('fetch', fetchMock)

    render(<SettlementLedgerClient mode="payment" />)

    expect(await screen.findByRole('heading', { name: '入金処理' })).toBeInTheDocument()
    expect(screen.getByText(/\[UAT\] 予約確認/)).toBeInTheDocument()
    expect(screen.getByText(/UAT-0815-1030/)).toBeInTheDocument()
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/api/admin/settlements?'),
        expect.objectContaining({ cache: 'no-store' })
      )
    })
  })

  it('shows settlement totals and recorded payments on the settlement screen', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify(ledger), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      )
    )

    render(<SettlementLedgerClient mode="settlement" />)

    expect(await screen.findByRole('heading', { name: '入金精算処理' })).toBeInTheDocument()
    expect(screen.getByText('さら')).toBeInTheDocument()
    expect(screen.getByText('¥18,000')).toBeInTheDocument()
  })
})
