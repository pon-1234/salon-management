/**
 * @design_doc   docs/LEGACY_GOLD_ADMIN_MIGRATION_INVENTORY.md cast settlement management
 * @related_to   PaymentHistoryTab and settlement payment APIs
 * @known_issues None
 */
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type {
  CastSettlementRecordDetail,
  CastSettlementsData,
  SettlementPaymentDto,
} from '@/lib/cast-portal/types'
import { PaymentHistoryTab } from './payment-history-tab'

function settlementRecord(
  id: string,
  status: string,
  settlementStatus: CastSettlementRecordDetail['settlementStatus'],
  staffRevenue: number,
  courseName: string
): CastSettlementRecordDetail {
  return {
    id,
    startTime: '2026-08-14T01:00:00.000Z',
    status,
    settlementStatus,
    courseName,
    courseDuration: 60,
    price: staffRevenue * 2,
    staffRevenue,
    unpaidAmount: staffRevenue,
    storeRevenue: staffRevenue,
    welfareExpense: 1_000,
    designationFee: 0,
    transportationFee: 0,
    additionalFee: 0,
    discountAmount: 0,
    options: [],
  }
}

const pendingRecord = settlementRecord(
  'reservation-pending',
  'completed',
  'pending',
  12_000,
  '完了済み未精算コース'
)
const settlementPayload: CastSettlementsData = {
  summary: {
    month: '2026-08',
    totalRevenue: 64_000,
    staffRevenue: 32_000,
    storeRevenue: 32_000,
    welfareExpense: 4_000,
    completedCount: 3,
    pendingCount: 2,
  },
  days: [
    {
      date: '2026-08-14',
      totalRevenue: 64_000,
      reservationCount: 4,
      records: [
        pendingRecord,
        settlementRecord('reservation-partial', 'completed', 'partial', 8_000, '一部精算コース'),
        settlementRecord('reservation-settled', 'completed', 'settled', 5_000, '精算済みコース'),
        settlementRecord('reservation-incomplete', 'confirmed', 'pending', 7_000, '未完了コース'),
      ],
    },
  ],
}

const paymentWithStatuses: SettlementPaymentDto = {
  id: 'payment-1',
  castId: 'cast-1',
  storeId: 'ikebukuro',
  amount: 25_000,
  method: '現金精算',
  handledBy: '管理者',
  paidAt: '2026-08-14T04:00:00.000Z',
  notes: null,
  reservations: [
    {
      id: 'detail-pending',
      startTime: '2026-08-14T01:00:00.000Z',
      courseName: '詳細未精算',
      staffRevenue: 10_000,
      settlementStatus: 'pending',
    },
    {
      id: 'detail-partial',
      startTime: '2026-08-14T02:00:00.000Z',
      courseName: '詳細一部精算',
      staffRevenue: 8_000,
      settlementStatus: 'partial',
    },
    {
      id: 'detail-settled',
      startTime: '2026-08-14T03:00:00.000Z',
      courseName: '詳細精算済み',
      staffRevenue: 7_000,
      settlementStatus: 'settled',
    },
  ],
}

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function successfulFetch(payments: SettlementPaymentDto[] = []) {
  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    if (init?.method === 'POST') {
      return jsonResponse(paymentWithStatuses, 201)
    }
    if (url.includes('/payments?')) {
      return jsonResponse(payments)
    }
    return jsonResponse(settlementPayload)
  })
}

describe('PaymentHistoryTab', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('does not expose the settlement action on the history card', async () => {
    vi.stubGlobal('fetch', successfulFetch([paymentWithStatuses]))

    render(<PaymentHistoryTab castId="cast-1" storeId="ikebukuro" />)

    expect(await screen.findByText('精算履歴')).toBeVisible()
    expect(screen.queryByRole('button', { name: '精算する' })).not.toBeInTheDocument()
  })

  it('shows the API error body when loading fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL) =>
        String(input).includes('/payments?')
          ? jsonResponse({ error: '入金履歴APIに接続できません' }, 503)
          : jsonResponse(settlementPayload)
      )
    )

    render(<PaymentHistoryTab castId="cast-1" storeId="ikebukuro" />)

    expect(await screen.findByRole('alert')).toHaveTextContent('入金履歴APIに接続できません')
  })

  it('labels pending, partial, and settled reservations in payment details', async () => {
    const user = userEvent.setup()
    vi.stubGlobal('fetch', successfulFetch([paymentWithStatuses]))

    render(<PaymentHistoryTab castId="cast-1" storeId="ikebukuro" />)

    await user.click(await screen.findByRole('button', { name: '入金記録の詳細を表示' }))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText('未精算')).toBeVisible()
    expect(within(dialog).getByText('一部精算')).toBeVisible()
    expect(within(dialog).getByText('精算済み')).toBeVisible()
  })
})
