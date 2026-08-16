/**
 * @design_doc   Cast sales tab production-data and failure-state contract
 * @related_to   SalesManagementTab and the store-scoped cast settlements API
 * @known_issues None
 */
import { render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SalesManagementTab } from './sales-management-tab'

vi.mock('@/contexts/store-context', () => ({
  useStore: () => ({ currentStore: { id: 'ikebukuro' } }),
}))

const settlementPayload = {
  summary: {
    month: '2026-08',
    totalRevenue: 30_000,
    staffRevenue: 18_000,
    storeRevenue: 12_000,
    welfareExpense: 1_000,
    completedCount: 0,
    pendingCount: 1,
  },
  days: [
    {
      date: '2026-08-14',
      totalRevenue: 30_000,
      reservationCount: 1,
      records: [
        {
          id: 'reservation-live-1',
          startTime: '2026-08-14T05:00:00.000Z',
          status: 'confirmed',
          settlementStatus: 'pending',
          courseName: '池袋120分',
          courseDuration: 120,
          price: 30_000,
          staffRevenue: 18_000,
          storeRevenue: 12_000,
          welfareExpense: 1_000,
          designationType: 'regular',
          designationFee: 3_000,
          transportationFee: 0,
          additionalFee: 0,
          discountAmount: 0,
          options: [{ id: 'option-1', name: '本番オプション', price: 5_000 }],
        },
      ],
    },
  ],
}

const jsonResponse = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })

describe('SalesManagementTab', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    vi.stubGlobal('fetch', vi.fn())
  })

  it('renders the selected cast real settlement records instead of the 2025 mock', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(settlementPayload))

    render(<SalesManagementTab castId="1" castName="池袋キャスト" />)

    expect(await screen.findByRole('heading', { name: '池袋キャストさんの売上管理' })).toBeVisible()
    expect(fetch).toHaveBeenCalledWith(
      expect.stringMatching(
        /\/api\/admin\/cast\/settlements\?castId=1&year=\d{4}&month=\d{1,2}&storeId=ikebukuro/
      ),
      { cache: 'no-store' }
    )
    expect(fetch).toHaveBeenCalledTimes(1)

    const totalSales = screen.getAllByText('総売上')[0].closest('[data-slot="card"]')
    expect(totalSales).not.toBeNull()
    expect(within(totalSales as HTMLElement).getByText('¥30,000')).toBeVisible()
    expect(screen.getByText('池袋120分')).toBeVisible()
    expect(screen.getByText('本番オプション（¥5,000）')).toBeVisible()
    expect(screen.queryByText('田中様')).not.toBeInTheDocument()
    expect(screen.queryByText('六本木ヒルズ')).not.toBeInTheDocument()
  })

  it('excludes cancelled reservations from both the records and sales totals', async () => {
    const confirmedRecord = settlementPayload.days[0].records[0]
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          ...settlementPayload,
          summary: { ...settlementPayload.summary, totalRevenue: 100_000 },
          days: [
            {
              ...settlementPayload.days[0],
              totalRevenue: 100_000,
              reservationCount: 2,
              records: [
                confirmedRecord,
                {
                  ...confirmedRecord,
                  id: 'cancelled-reservation',
                  status: 'cancelled',
                  courseName: 'キャンセル済みコース',
                  price: 70_000,
                  staffRevenue: 42_000,
                  storeRevenue: 28_000,
                },
              ],
            },
          ],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    )

    render(<SalesManagementTab castId="1" castName="池袋キャスト" />)

    expect(await screen.findByText('池袋120分')).toBeVisible()
    expect(screen.queryByText('キャンセル済みコース')).not.toBeInTheDocument()
    const totalSales = screen.getAllByText('総売上')[0].closest('[data-slot="card"]')
    expect(within(totalSales as HTMLElement).getByText('¥30,000')).toBeVisible()
    expect(within(totalSales as HTMLElement).queryByText('¥100,000')).not.toBeInTheDocument()
  })

  it('shows an explicit error instead of presenting a failed request as empty sales', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ error: '売上APIに接続できません' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      })
    )

    render(<SalesManagementTab castId="cast-1" castName="池袋キャスト" />)

    expect(await screen.findByRole('alert')).toHaveTextContent('売上APIに接続できません')
    await waitFor(() => {
      expect(screen.queryByText('今月の売上データはありません')).not.toBeInTheDocument()
    })
  })

  it('rejects a successful response whose settlement shape is invalid', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ summary: {}, days: 'invalid' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    )

    render(<SalesManagementTab castId="cast-1" castName="池袋キャスト" />)

    expect(await screen.findByRole('alert')).toHaveTextContent('売上情報の応答形式が不正です')
  })

  it('shows an authoritative empty result without comparing it to broader reservation analytics', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      jsonResponse({
        summary: {
          ...settlementPayload.summary,
          totalRevenue: 0,
          staffRevenue: 0,
          storeRevenue: 0,
        },
        days: [],
      })
    )

    render(<SalesManagementTab castId="1" castName="池袋キャスト" />)

    expect(await screen.findByText('今月の売上データはありません')).toBeVisible()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(fetch).toHaveBeenCalledTimes(1)
  })
})
