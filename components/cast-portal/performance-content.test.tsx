/**
 * @design_doc   Cast portal performance uses server-authorized aggregate props
 * @related_to   CastPerformanceContent and WorkPerformanceTab
 * @known_issues None
 */
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import type { CastPerformanceSnapshot } from '@/lib/cast-portal/types'
import type { CastPerformanceReport } from '@/lib/types/cast-performance'

const mocks = vi.hoisted(() => ({ workPerformanceTab: vi.fn(() => <div>成績詳細</div>) }))

vi.mock('@/components/cast/work-performance-tab', () => ({
  WorkPerformanceTab: mocks.workPerformanceTab,
}))

import { CastPerformanceContent } from './performance-content'

describe('CastPerformanceContent', () => {
  it('passes the server-authorized cast aggregate instead of making the cast use an admin API', async () => {
    const user = userEvent.setup()
    const performance = {
      cast: { id: 'cast-1', name: '池袋キャスト' },
      period: { year: 2026, month: 8, timeZone: 'Asia/Tokyo' },
    } as CastPerformanceReport
    const initialData = {
      cast: { id: 'cast-1', name: '池袋キャスト', storeId: 'ikebukuro', storeName: '池袋' },
      periodLabel: '2026年8月',
      totalCastCount: 1,
      totalDesignation: { label: '総指名', rank: 1, count: 2 },
      regularDesignation: { label: '本指名', rank: 1, count: 1 },
      access: { label: 'アクセス', rank: null, count: null },
      performance,
    } as CastPerformanceSnapshot & { performance: CastPerformanceReport }

    render(<CastPerformanceContent initialData={initialData} />)
    await user.click(screen.getByRole('tab', { name: '成績' }))

    expect(screen.getByText('成績詳細')).toBeVisible()
    expect(mocks.workPerformanceTab).toHaveBeenCalledWith(
      expect.objectContaining({
        castId: 'cast-1',
        castName: '池袋キャスト',
        initialPerformance: performance,
      }),
      undefined
    )
  })
})
