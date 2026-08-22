/**
 * @design_doc   docs/PREVIEW_UAT_CHECKLIST.md
 * @related_to   DailyReportPageClient and the store-scoped daily-report API
 * @known_issues None
 */
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { format } from 'date-fns'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DailyReportPageClient } from './daily-report-client'

vi.mock('@/contexts/store-context', () => ({
  useStore: () => ({ currentStore: { id: 'ikebukuro' } }),
}))

vi.mock('@/components/analytics/daily-sales-charts', () => ({
  DailySalesCharts: () => (
    <div>
      <h2>時間別売上推移</h2>
      <h2>週間売上比較</h2>
    </div>
  ),
}))

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

const emptySalesPayload = {
  date: '2026-08-14',
  hourlyBreakdown: [],
  weeklyTrend: [],
  totals: { sales: { total: 0 }, totalTransactions: 0, staffSales: 0 },
  staffSales: [],
}

function fetchByEndpoint(reportPayload: unknown, status = 200) {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input)
    if (url.includes('/api/analytics/daily-sales')) {
      return jsonResponse(emptySalesPayload)
    }
    return jsonResponse(reportPayload, status)
  })
}

describe('DailyReportPageClient', () => {
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('shows the API error instead of presenting a failed request as an empty report', async () => {
    vi.stubGlobal('fetch', fetchByEndpoint({ error: '日報データの取得に失敗しました。' }, 500))

    render(<DailyReportPageClient />)

    expect(await screen.findByRole('alert', { name: '日報データの取得エラー' })).toHaveTextContent(
      '日報データの取得に失敗しました。'
    )
    expect(screen.queryByText('表示できる日報がありません。')).not.toBeInTheDocument()
  })

  it('renders the returned daily report for the current store', async () => {
    const fetchMock = fetchByEndpoint({
      date: '2026-08-14',
      totalSales: 12_000,
      totalCustomers: 1,
      totalWorkingHours: 8,
      staffReports: [
        {
          staffId: 'cast-1',
          staffName: 'さら',
          workingHours: 8,
          salesAmount: 12_000,
          storeRevenue: 4_000,
          staffRevenue: 8_000,
          cashCount: 1,
          cashAmount: 12_000,
          cardCount: 0,
          cardAmount: 0,
          discountAmount: 500,
          hotelExpense: 2_000,
          welfareExpense: 800,
          customerCount: 1,
          designationCount: 1,
          optionSales: 0,
        },
      ],
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<DailyReportPageClient />)

    expect(await screen.findByText('日報: 2026-08-14')).toBeInTheDocument()
    expect(screen.getByTestId('daily-report-kpis')).toBeInTheDocument()
    expect(screen.getByText('総売上')).toBeInTheDocument()
    expect(screen.getByText('総客数')).toBeInTheDocument()
    expect(screen.getByText('値引き')).toBeInTheDocument()
    expect(screen.getByText('ホテル')).toBeInTheDocument()
    expect(screen.getByText('厚生費')).toBeInTheDocument()
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('storeId=ikebukuro'),
        expect.objectContaining({ cache: 'no-store' })
      )
    })
  })

  it('shows hourly and weekly charts without empty realtime or day-over-day labels', async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('/api/analytics/daily-sales')) {
        return new Response(
          JSON.stringify({
            date: '2026-08-14',
            hourlyBreakdown: [{ hour: '10:00', sales: 12_000, customers: 1 }],
            weeklyTrend: [{ date: '8/14', sales: 12_000 }],
            totals: { sales: { total: 12_000 }, totalTransactions: 1, staffSales: 8_000 },
            staffSales: [],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        )
      }
      return new Response(
        JSON.stringify({
          date: '2026-08-14',
          totalSales: 12_000,
          totalCustomers: 1,
          totalWorkingHours: 8,
          staffReports: [],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<DailyReportPageClient />)

    expect(await screen.findByText('時間別売上推移')).toBeInTheDocument()
    expect(screen.getByText('週間売上比較')).toBeInTheDocument()
    expect(screen.queryByText('リアルタイム')).not.toBeInTheDocument()
    expect(screen.queryByText('前日比')).not.toBeInTheDocument()
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/api/analytics/daily-sales'),
        expect.objectContaining({ cache: 'no-store' })
      )
    })
  })

  it('changes the API business date from a native date input and quick navigation buttons', async () => {
    const fetchMock = vi.fn().mockImplementation(async (input: RequestInfo | URL) => {
      const url = new URL(String(input), 'http://localhost')
      if (url.pathname.includes('/api/analytics/daily-sales')) {
        return jsonResponse(emptySalesPayload)
      }
      const date = url.searchParams.get('date') ?? ''
      return jsonResponse({
        date,
        totalSales: 0,
        totalCustomers: 0,
        totalWorkingHours: 0,
        staffReports: [],
      })
    })
    vi.stubGlobal('fetch', fetchMock)

    render(<DailyReportPageClient />)
    await screen.findByText(/^日報: /)

    const dateInput = screen.getByLabelText('日報の日付')
    expect(dateInput).toHaveAttribute('type', 'date')

    fireEvent.change(dateInput, { target: { value: '2026-08-10' } })
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/api/analytics/daily-report?date=2026-08-10'),
        expect.objectContaining({ cache: 'no-store' })
      )
    })

    fireEvent.click(screen.getByRole('button', { name: '前日' }))
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/api/analytics/daily-report?date=2026-08-09'),
        expect.any(Object)
      )
    })

    fireEvent.click(screen.getByRole('button', { name: '翌日' }))
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('/api/analytics/daily-report?date=2026-08-10'),
        expect.any(Object)
      )
    })

    const today = format(new Date(), 'yyyy-MM-dd')
    fireEvent.click(screen.getByRole('button', { name: '今日' }))
    await waitFor(() => {
      expect(dateInput).toHaveValue(today)
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining(`/api/analytics/daily-report?date=${today}`),
        expect.any(Object)
      )
    })
  })
})
