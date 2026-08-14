/**
 * @design_doc   Accurate cast performance UI and server-provided portal data contract
 * @related_to   WorkPerformanceTab and CastPerformanceReport
 * @known_issues None
 */
import { render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { CastPerformanceReport } from '@/lib/types/cast-performance'

import { WorkPerformanceTab, getJstYearMonth } from './work-performance-tab'

vi.mock('@/contexts/store-context', () => ({
  useStore: () => ({ currentStore: { id: 'ikebukuro' } }),
}))

const targetPerformance: CastPerformanceReport = {
  cast: { id: 'cast-live-1', name: '池袋キャスト' },
  period: { year: 2026, month: 8, timeZone: 'Asia/Tokyo' },
  completedReservations: 7,
  reservationDays: 4,
  totalSales: 123_000,
  staffRevenue: 73_000,
  storeRevenue: 50_000,
  missingRevenue: { staff: 0, store: 0 },
  payments: {
    cash: { count: 4, amount: 70_000 },
    card: { count: 2, amount: 43_000 },
    unclassified: { count: 1, amount: 10_000 },
  },
  customers: { new: 2, storeRepeat: 3, returningRegular: 2, unclassified: 0 },
  designations: { regular: 3, free: 2, none: 1, unclassified: 1 },
  marketing: { princess: 2, other: 4, unclassified: 1 },
  courses: [
    { id: 'course-1', name: '池袋120分', count: 5, reservationSales: 90_000 },
    { id: 'course-2', name: '池袋150分', count: 2, reservationSales: 33_000 },
  ],
  options: [
    { id: 'option-1', name: '衣装', count: 3, sales: 9_000, selectionRate: 42.9 },
    { id: 'option-2', name: '延長', count: 1, sales: 3_000, selectionRate: 14.3 },
  ],
}

describe('WorkPerformanceTab', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.setSystemTime(new Date('2026-08-14T12:00:00+09:00'))
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('shows completed reservation metrics and the accurate cast-scoped breakdowns', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify(targetPerformance), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    )

    render(<WorkPerformanceTab castId="cast-live-1" castName="池袋キャスト" />)

    expect(await screen.findByText('池袋120分')).toBeVisible()
    expect(screen.getByRole('heading', { name: '池袋キャストさんの就業成績' })).toBeVisible()
    expect(fetch).toHaveBeenCalledWith(
      '/api/analytics/cast-performance?castId=cast-live-1&year=2026&month=8&storeId=ikebukuro',
      { cache: 'no-store' }
    )

    const completedCard = screen.getByText('完了予約').closest('[data-slot="card"]')
    expect(within(completedCard as HTMLElement).getByText('7本')).toBeVisible()
    expect(screen.getByText('新規')).toBeVisible()
    expect(screen.getByText('店リピ')).toBeVisible()
    expect(screen.getByText('本指名')).toBeVisible()
    expect(screen.getByText('フリー指名')).toBeVisible()
    expect(screen.getByText('姫予約')).toBeVisible()
    expect(screen.getByText('媒体未分類')).toBeVisible()

    const courseRow = screen.getByText('池袋120分').closest('tr')
    expect(courseRow).not.toBeNull()
    expect(within(courseRow as HTMLElement).getByText('5本')).toBeVisible()
    expect(within(courseRow as HTMLElement).getByText('¥90,000')).toBeVisible()

    const optionRow = screen.getByText('衣装').closest('tr')
    expect(optionRow).not.toBeNull()
    expect(within(optionRow as HTMLElement).getByText('3本')).toBeVisible()
    expect(within(optionRow as HTMLElement).getByText('42.9%')).toBeVisible()
    expect(within(optionRow as HTMLElement).getByText('¥9,000')).toBeVisible()
  })

  it('shows an explicit error instead of zero-valued performance on request failure', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ error: '成績集計に失敗しました' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    )

    render(<WorkPerformanceTab castId="cast-live-1" castName="池袋キャスト" />)

    expect(await screen.findByRole('alert')).toHaveTextContent('成績集計に失敗しました')
    await waitFor(() => {
      expect(screen.queryByText('今月の実績データはありません')).not.toBeInTheDocument()
    })
  })

  it('rejects a successful response whose performance contract is incomplete', async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ ...targetPerformance, options: 'invalid' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    )

    render(<WorkPerformanceTab castId="cast-live-1" castName="池袋キャスト" />)

    expect(await screen.findByRole('alert')).toHaveTextContent('就業成績の応答形式が不正です')
  })

  it('selects the current month in JST at the UTC month boundary', async () => {
    expect(getJstYearMonth(new Date('2026-07-31T15:30:00.000Z'))).toEqual({
      year: 2026,
      month: 8,
    })
    vi.setSystemTime(new Date('2026-08-01T00:30:00+09:00'))
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(JSON.stringify({ ...targetPerformance, completedReservations: 0 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    )

    render(<WorkPerformanceTab castId="cast-live-1" castName="池袋キャスト" />)

    expect(await screen.findByText('完了予約')).toBeVisible()
    expect(fetch).toHaveBeenCalledWith(
      '/api/analytics/cast-performance?castId=cast-live-1&year=2026&month=8&storeId=ikebukuro',
      { cache: 'no-store' }
    )
  })

  it('uses server-provided performance in the cast portal without calling an admin API', () => {
    render(
      <WorkPerformanceTab
        castId="cast-live-1"
        castName="池袋キャスト"
        initialPerformance={targetPerformance}
      />
    )

    expect(screen.getByRole('heading', { name: '池袋キャストさんの就業成績' })).toBeVisible()
    expect(screen.getByText('池袋120分')).toBeVisible()
    expect(fetch).not.toHaveBeenCalled()
  })
})
