/**
 * @design_doc   docs/PREVIEW_UAT_CHECKLIST.md reservation timeline operational filters
 * @related_to   FilterDialog and TimelineFilterOptions
 * @known_issues None
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_TIMELINE_FILTERS } from '@/lib/reservation/timeline-filters'
import { FilterDialog } from './filter-dialog'

describe('FilterDialog', () => {
  afterEach(cleanup)

  it('offers actual availability and cast-option filters for the selected day', () => {
    render(
      <FilterDialog
        open
        onOpenChange={vi.fn()}
        onApplyFilters={vi.fn()}
        filters={DEFAULT_TIMELINE_FILTERS}
        selectedDate={new Date('2026-08-15T00:00:00+09:00')}
        options={[{ id: 'option-aroma', name: 'アロマ追加' }]}
      />
    )

    expect(screen.getByText('2026年08月15日の空き状況')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '空きあり' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '予約あり' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'アロマ追加' })).toBeInTheDocument()
    expect(screen.queryByText('2024年12月09日の勤務状況で絞り込み')).not.toBeInTheDocument()
  })

  it('applies the selected operational filters', () => {
    const onApplyFilters = vi.fn()
    render(
      <FilterDialog
        open
        onOpenChange={vi.fn()}
        onApplyFilters={onApplyFilters}
        filters={DEFAULT_TIMELINE_FILTERS}
        selectedDate={new Date('2026-08-15T00:00:00+09:00')}
        options={[{ id: 'option-aroma', name: 'アロマ追加' }]}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: '空きあり' }))
    fireEvent.click(screen.getByRole('button', { name: 'アロマ追加' }))
    fireEvent.change(screen.getByLabelText('キャスト名'), { target: { value: 'あかり' } })
    fireEvent.click(screen.getByRole('button', { name: '適用' }))

    expect(onApplyFilters).toHaveBeenCalledWith({
      availability: 'open',
      optionId: 'option-aroma',
      name: 'あかり',
    })
  })
})
