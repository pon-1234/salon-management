/**
 * @design_doc   会議未確定: 出勤表から指定日・月へ直接移動する
 * @related_to   ScheduleActionButtons date controls
 * @known_issues None
 */
import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ScheduleActionButtons } from './schedule-action-buttons'

const stores = [{ id: 'ikebukuro', displayName: '池袋店' }]

function renderButtons(onDateChange = vi.fn()) {
  render(
    <ScheduleActionButtons
      onRefresh={vi.fn()}
      date={new Date('2026-08-24T00:00:00+09:00')}
      onDateChange={onDateChange}
      stores={stores}
      selectedStoreId="ikebukuro"
      onStoreChange={vi.fn()}
      searchQuery=""
      onSearchQueryChange={vi.fn()}
      statusFilter="all"
      onStatusFilterChange={vi.fn()}
      characterFilter="全"
      onCharacterFilterChange={vi.fn()}
      viewMode="grid"
      onViewModeChange={vi.fn()}
    />
  )
  return onDateChange
}

describe('ScheduleActionButtons date jump', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-22T12:00:00+09:00'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('jumps to today, the previous month, and the next month', () => {
    const onDateChange = renderButtons()

    fireEvent.click(screen.getByRole('button', { name: '今日' }))
    expect(onDateChange).toHaveBeenLastCalledWith(new Date('2026-08-22T12:00:00+09:00'))

    fireEvent.click(screen.getByRole('button', { name: '前の月' }))
    expect(onDateChange.mock.calls.at(-1)?.[0]).toEqual(new Date('2026-07-24T00:00:00+09:00'))

    fireEvent.click(screen.getByRole('button', { name: '次の月' }))
    expect(onDateChange.mock.calls.at(-1)?.[0]).toEqual(new Date('2026-09-24T00:00:00+09:00'))
  })
})
