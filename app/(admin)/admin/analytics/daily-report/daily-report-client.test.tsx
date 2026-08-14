/**
 * @design_doc   docs/PREVIEW_UAT_CHECKLIST.md
 * @related_to   DailyReportPageClient and the store-scoped daily-report API
 * @known_issues None
 */
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DailyReportPageClient } from './daily-report-client'

vi.mock('@/contexts/store-context', () => ({
  useStore: () => ({ currentStore: { id: 'ikebukuro' } }),
}))

vi.mock('@/components/ui/date-picker', () => ({
  DatePicker: () => <button type="button">日付を選択</button>,
}))

describe('DailyReportPageClient', () => {
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('shows the API error instead of presenting a failed request as an empty report', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: '日報データの取得に失敗しました。' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        })
      )
    )

    render(<DailyReportPageClient />)

    expect(await screen.findByRole('alert', { name: '日報データの取得エラー' })).toHaveTextContent(
      '日報データの取得に失敗しました。'
    )
    expect(screen.queryByText('表示できる日報がありません。')).not.toBeInTheDocument()
  })

  it('renders the returned daily report for the current store', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          date: '2026-08-14',
          totalSales: 12_000,
          totalCustomers: 1,
          totalWorkingHours: 8,
          staffReports: [],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    )
    vi.stubGlobal('fetch', fetchMock)

    render(<DailyReportPageClient />)

    expect(await screen.findByText('日報: 2026-08-14')).toBeInTheDocument()
    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        expect.stringContaining('storeId=ikebukuro'),
        expect.objectContaining({ cache: 'no-store' })
      )
    })
  })
})
