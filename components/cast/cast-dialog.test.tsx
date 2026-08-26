/**
 * @design_doc   docs/PREVIEW_UAT_CHECKLIST.md timeline cast detail contract
 * @related_to   StaffDialog and Timeline
 * @known_issues None
 */
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Cast } from '@/lib/cast/types'
import { StaffDialog } from './cast-dialog'

vi.mock('@/contexts/store-context', () => ({
  useStore: () => ({
    currentStore: { id: 'ikebukuro' },
  }),
}))

vi.mock('@/hooks/use-toast', () => ({
  toast: vi.fn(),
}))

const staff: Cast = {
  id: 'legacy-cast-56060',
  createdAt: new Date('2026-08-01T00:00:00+09:00'),
  updatedAt: new Date('2026-08-01T00:00:00+09:00'),
  name: '確認キャスト',
  nameKana: 'かくにんきゃすと',
  age: 25,
  height: 160,
  bust: 'C',
  waist: 58,
  hip: 84,
  type: 'standard',
  image: '/images/non-photo.svg',
  images: ['/images/non-photo.svg'],
  description: '旧システムから移行した紹介文です。',
  netReservation: true,
  specialDesignationFee: 2_000,
  regularDesignationFee: 3_000,
  panelDesignationRank: 3,
  regularDesignationRank: 2,
  workStatus: '出勤',
  workStart: new Date('2026-08-15T10:00:00+09:00'),
  workEnd: new Date('2026-08-15T18:00:00+09:00'),
  appointments: [],
  availableOptions: ['option-aroma'],
}

describe('StaffDialog', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ data: [] }),
      }))
    )
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it('shows the real description, selected-day attendance, and only assigned options', () => {
    render(
      <StaffDialog
        open
        onOpenChange={() => undefined}
        staff={staff}
        selectedDate={new Date('2026-08-15T00:00:00+09:00')}
        optionCatalog={[
          { id: 'option-aroma', name: 'アロマ追加', price: 1_000, note: '確認用' },
          { id: 'option-unassigned', name: '未対応オプション', price: 2_000, note: null },
        ]}
      />
    )

    expect(screen.getByText('旧システムから移行した紹介文です。')).toBeInTheDocument()
    expect(screen.getByText('2026/08/15 (土)')).toBeInTheDocument()
    expect(screen.getByText('10:00 - 18:00')).toBeInTheDocument()
    expect(screen.getByLabelText('出勤開始')).toBeInTheDocument()
    expect(screen.getByLabelText('出勤終了')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '出勤時間を保存' })).toBeInTheDocument()
    expect(screen.getByText('アロマ追加')).toBeInTheDocument()
    expect(screen.queryByText('未対応オプション')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '選択' })).not.toBeInTheDocument()
    expect(screen.getByRole('dialog')).toHaveAccessibleDescription(
      '実際のプロフィール、選択日の出勤、対応オプションを表示します。'
    )
  })
})
