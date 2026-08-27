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

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode
    href: string
  } & React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}))

const ledger = {
  month: '2026-08',
  hourlyGuaranteeAmount: 5000,
  casts: [
    {
      castId: 'cast-1',
      castName: 'さら',
      completedCount: 2,
      pendingCount: 1,
      pendingAmount: 12_000,
      settledAmount: 15_000,
      staffRevenue: 18_000,
      storeRevenue: 27_000,
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
  legacyEntries: [
    {
      id: 'legacy-ledger-nyukin-11',
      castId: 'cast-1',
      castName: 'さら',
      sourceTable: 'nyukin',
      direction: 'inbound',
      kind: 'cash',
      amount: 18_000,
      notes: '現金精算',
      handledBy: '1',
      occurredAt: '2026-08-10T03:00:00.000Z',
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

    expect(await screen.findByRole('heading', { name: '精算' })).toBeInTheDocument()
    expect(await screen.findByText('さら')).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: '本数' })).toBeInTheDocument()
    expect(screen.getByText('2本')).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'キャスト売上' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: '店舗売上' })).toBeInTheDocument()
    expect(screen.getByText('¥27,000')).toBeInTheDocument()
    expect(screen.getByText('¥15,000')).toBeInTheDocument()
    expect(screen.getByText('¥12,000')).toBeInTheDocument()
    expect(screen.queryByText(/\[UAT\] 予約確認/)).not.toBeInTheDocument()
    expect(screen.queryByText(/UAT-0815-1030/)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '精算する' })).not.toBeInTheDocument()
    const statusLink = screen.getByRole('link', { name: '精算状況を見る' })
    expect(statusLink).toHaveAttribute('href', '/admin/cast/manage/cast-1?tab=settlement')
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/api/admin/settlements?'),
        expect.objectContaining({ cache: 'no-store' })
      )
    })
    expect(fetchMock).not.toHaveBeenCalledWith(
      expect.stringContaining('/api/admin/cast/settlements'),
      expect.objectContaining({ method: 'POST' })
    )
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

    expect(await screen.findByRole('heading', { name: '精算' })).toBeInTheDocument()
    expect(await screen.findByText('さら')).toBeInTheDocument()
    expect(screen.getAllByText('¥18,000').length).toBeGreaterThan(0)
    expect(screen.getByText('旧台帳')).toBeInTheDocument()
    expect(screen.getByText('さら / 入金 / 現金')).toBeInTheDocument()
    expect(screen.getByText(/同じ店舗の年次入金は含みます/)).toBeInTheDocument()
    expect(screen.queryByText(/年次アーカイブと別DBの保証実績は未取込/)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '印刷' })).toBeInTheDocument()
  })
})
