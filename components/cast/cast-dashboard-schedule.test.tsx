/**
 * @design_doc https://app.notion.com/p/3ccdda8d8bde803fa9b6eeddcb522958
 * @related_to CastDashboard: profile schedule entry point
 * @known_issues None
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { CastDashboard } from './cast-dashboard'
import type { Cast } from '@/lib/cast/types'
vi.mock('@/contexts/store-context', () => ({
  useStore: () => ({ currentStore: { id: 'store-a' } }),
}))
const toastMock = vi.hoisted(() => vi.fn())
vi.mock('@/hooks/use-toast', () => ({ useToast: () => ({ toast: toastMock }) }))
vi.mock('@/lib/reservation/data', () => ({ getAllReservations: vi.fn().mockResolvedValue([]) }))
vi.mock('@/lib/reservation/repository-impl', () => ({ ReservationRepositoryImpl: class {} }))
vi.mock('@/components/reservation/reservation-dialog', () => ({ ReservationDialog: () => null }))
vi.mock('@/components/cast-schedule/schedule-edit-dialog', () => ({
  ScheduleEditDialog: ({
    open,
    onSave,
  }: {
    open: boolean
    onSave: (castId: string, schedule: unknown) => Promise<void>
  }) =>
    open ? (
      <button
        onClick={() =>
          void onSave('cast-1', {
            '2026-09-08': { date: '2026-09-08', status: '未入力', note: '確認中' },
          })
        }
      >
        編集を保存
      </button>
    ) : null,
}))

it('saves the profile schedule to the selected store and preserves explicit unset notes', async () => {
  global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ data: [] }) })
  render(
    <CastDashboard
      cast={
        {
          id: 'cast-1',
          name: '確認用',
          nameKana: 'かくにん',
          type: '未設定',
          specialDesignationFee: 0,
          panelDesignationRank: 0,
          regularDesignationRank: 0,
        } as Cast
      }
      onUpdate={vi.fn()}
      onRequestEdit={vi.fn()}
    />
  )
  fireEvent.click(await screen.findByRole('button', { name: '編集' }))
  fireEvent.click(screen.getByRole('button', { name: '編集を保存' }))
  await waitFor(() =>
    expect(fetch).toHaveBeenCalledWith(
      '/api/cast-schedule/batch?storeId=store-a',
      expect.objectContaining({ method: 'POST', body: expect.stringContaining('"status":"unset"') })
    )
  )
})
