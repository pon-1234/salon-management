/**
 * @design_doc   Weekly cast schedule presentation modes
 * @related_to   ScheduleGrid and ScheduleEditDialog
 * @known_issues None
 */
import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { CastScheduleEntry } from '@/lib/cast-schedule/old-types'
import { ScheduleGrid } from './schedule-grid'

const editDialogMock = vi.hoisted(() => vi.fn((_props?: unknown) => null))

vi.mock('./schedule-edit-dialog', () => ({
  ScheduleEditDialog: (props: { focusDate?: string | null; open: boolean }) => {
    editDialogMock(props)
    return props.open ? <div data-testid="schedule-edit-dialog" /> : null
  },
}))

const entry: CastScheduleEntry = {
  castId: 'cast-1',
  name: '明里',
  nameKana: 'あかり',
  age: 25,
  image: '/cast.jpg',
  hasPhone: true,
  hasBusinessContact: true,
  schedule: {
    '2026-08-10': { type: '出勤予定', startTime: '10:00', endTime: '18:00' },
    '2026-08-11': { type: '休日' },
  },
}

describe('ScheduleGrid', () => {
  afterEach(() => {
    editDialogMock.mockClear()
  })
  it('renders a compact list when list mode is selected and the weekly table otherwise', () => {
    const { rerender } = render(
      <ScheduleGrid
        startDate={new Date('2026-08-10T00:00:00+09:00')}
        entries={[entry]}
        viewMode="list"
      />
    )

    expect(screen.getByRole('list', { name: '週間出勤一覧' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '明里の週間予定を編集' })).toBeInTheDocument()
    expect(screen.queryByRole('table', { name: '週間出勤表' })).not.toBeInTheDocument()

    rerender(
      <ScheduleGrid
        startDate={new Date('2026-08-10T00:00:00+09:00')}
        entries={[entry]}
        viewMode="grid"
      />
    )

    expect(screen.getByRole('table', { name: '週間出勤表' })).toBeInTheDocument()
    expect(screen.queryByRole('list', { name: '週間出勤一覧' })).not.toBeInTheDocument()
  })

  it('keeps dates visible while scrolling and opens that day in the editor', () => {
    const scrollIntoView = vi.fn()
    const previousHtmlScroll = Object.getOwnPropertyDescriptor(
      HTMLElement.prototype,
      'scrollIntoView'
    )
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      writable: true,
      value: scrollIntoView,
    })

    try {
      render(
        <ScheduleGrid
          startDate={new Date('2026-08-10T00:00:00+09:00')}
          entries={[entry]}
          viewMode="grid"
        />
      )

      const dateHeader = screen.getByRole('button', { name: '08/10(月)の列へ移動' })
      expect(screen.getByTestId('schedule-scrollport')).toHaveClass('h-full', 'overflow-auto')
      expect(screen.getByTestId('schedule-scrollport')).not.toHaveClass('max-h-[calc(100vh-12rem)]')
      expect(dateHeader.closest('[data-testid="schedule-date-header"]')).toHaveClass('sticky')

      fireEvent.click(dateHeader)
      expect(scrollIntoView).toHaveBeenCalled()

      fireEvent.click(screen.getByText('出勤予定'))

      expect(editDialogMock).toHaveBeenCalledWith(
        expect.objectContaining({
          open: true,
          focusDate: '2026-08-10',
        })
      )
      expect(screen.getByTestId('schedule-edit-dialog')).toBeInTheDocument()
    } finally {
      if (previousHtmlScroll) {
        Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', previousHtmlScroll)
      }
    }
  })

  it('shows an explicit empty result instead of a blank schedule', () => {
    render(
      <ScheduleGrid
        startDate={new Date('2026-08-10T00:00:00+09:00')}
        entries={[]}
        viewMode="grid"
      />
    )

    expect(screen.getByText('条件に一致するキャストはいません')).toBeInTheDocument()
  })
})
