/**
 * @design_doc   SCH-01/SCH-02 キャスト出勤時間テンプレートと休み登録
 * @related_to   ScheduleEditDialog per-day template buttons
 * @known_issues None
 */
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { ScheduleEditDialog } from './schedule-edit-dialog'

vi.mock('@/contexts/store-context', () => ({
  useStore: () => ({ currentStore: { id: 'store-ikebukuro' } }),
}))

vi.mock('@/hooks/use-toast', () => ({
  toast: vi.fn(),
}))

const originalScrollIntoView = Object.getOwnPropertyDescriptor(
  HTMLElement.prototype,
  'scrollIntoView'
)
const originalHasPointerCapture = Object.getOwnPropertyDescriptor(
  HTMLElement.prototype,
  'hasPointerCapture'
)
const originalReleasePointerCapture = Object.getOwnPropertyDescriptor(
  HTMLElement.prototype,
  'releasePointerCapture'
)

beforeAll(() => {
  Object.defineProperties(HTMLElement.prototype, {
    scrollIntoView: { configurable: true, value: () => undefined },
    hasPointerCapture: { configurable: true, value: () => false },
    releasePointerCapture: { configurable: true, value: () => undefined },
  })
})

afterAll(() => {
  const restore = (property: string, descriptor: PropertyDescriptor | undefined) => {
    if (descriptor) Object.defineProperty(HTMLElement.prototype, property, descriptor)
    else delete (HTMLElement.prototype as unknown as Record<string, unknown>)[property]
  }
  restore('scrollIntoView', originalScrollIntoView)
  restore('hasPointerCapture', originalHasPointerCapture)
  restore('releasePointerCapture', originalReleasePointerCapture)
})

describe('ScheduleEditDialog day templates', () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ data: {}, scheduleTemplates: [] }),
    } as Response)
  })

  it('keeps the cast name and the only save control together at the top', () => {
    render(
      <ScheduleEditDialog
        open
        onOpenChange={vi.fn()}
        castName="明里"
        castId="cast-1"
        startDate={new Date('2026-08-10T00:00:00+09:00')}
        initialSchedule={{}}
        onSave={vi.fn()}
      />
    )

    expect(screen.getAllByRole('button', { name: '保存' })).toHaveLength(1)
    expect(screen.getByTestId('schedule-sticky-header')).toHaveTextContent('明里')
    expect(screen.queryByRole('button', { name: /昼勤/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /夜勤/ })).not.toBeInTheDocument()
  })

  it('keeps 休みを適用 as the only holiday shortcut', () => {
    render(
      <ScheduleEditDialog
        open
        onOpenChange={vi.fn()}
        castName="明里"
        castId="cast-1"
        startDate={new Date('2026-08-10T00:00:00+09:00')}
        initialSchedule={{}}
        onSave={vi.fn()}
      />
    )

    const dayCards = [...document.querySelectorAll('[id^="schedule-edit-day-"]')]
    expect(
      within(dayCards[0] as HTMLElement).getByRole('button', { name: '休みを適用' })
    ).toBeInTheDocument()
    expect(screen.queryByText('休みで登録')).not.toBeInTheDocument()
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
  })

  it('marks the clicked date as 休日 from 休みを適用', () => {
    render(
      <ScheduleEditDialog
        open
        onOpenChange={vi.fn()}
        castName="明里"
        castId="cast-1"
        startDate={new Date('2026-08-10T00:00:00+09:00')}
        initialSchedule={{}}
        onSave={vi.fn()}
      />
    )

    const dayCard = document.querySelector('[id^="schedule-edit-day-"]') as HTMLElement
    fireEvent.click(within(dayCard).getByRole('button', { name: '休みを適用' }))

    expect(within(dayCard).getByRole('combobox')).toHaveTextContent('休日')
  })

  it('includes reservation reception state in the saved schedule', () => {
    const onSave = vi.fn()
    render(
      <ScheduleEditDialog
        open
        onOpenChange={vi.fn()}
        castName="明里"
        castId="cast-1"
        startDate={new Date('2026-08-10T00:00:00+09:00')}
        initialSchedule={{
          '2026-08-10': {
            type: '出勤予定',
            startTime: '12:00',
            endTime: '22:00',
            isAvailable: false,
          },
        }}
        onSave={onSave}
      />
    )

    const firstCard = document.querySelector('[id^="schedule-edit-day-"]') as HTMLElement
    expect(within(firstCard).getByText('予約受付停止')).toBeInTheDocument()
    fireEvent.click(screen.getAllByRole('button', { name: '保存' })[0])
    expect(onSave).toHaveBeenCalledWith(
      'cast-1',
      expect.objectContaining({
        '2026-08-10': expect.objectContaining({ isAvailable: false }),
      })
    )
  })

  it('loads the complete four-week range before editing it', async () => {
    render(
      <ScheduleEditDialog
        open
        onOpenChange={vi.fn()}
        castName="明里"
        castId="cast-1"
        startDate={new Date('2026-08-10T00:00:00+09:00')}
        initialSchedule={{}}
        onSave={vi.fn()}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: '4週間をカレンダー入力' }))

    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining(
          '/api/cast-schedule?castId=cast-1&startDate=2026-08-10&endDate=2026-09-06&storeId=store-ikebukuro'
        ),
        expect.objectContaining({ credentials: 'include', cache: 'no-store' })
      )
    )
  })

  it('keeps days without a saved record as 未入力 in the four-week editor', async () => {
    render(
      <ScheduleEditDialog
        open
        onOpenChange={vi.fn()}
        castName="明里"
        castId="cast-1"
        startDate={new Date('2026-08-10T00:00:00+09:00')}
        initialSchedule={{}}
        onSave={vi.fn()}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: '4週間をカレンダー入力' }))
    await waitFor(() =>
      expect(document.querySelectorAll('[id^="schedule-edit-day-"]')).toHaveLength(28)
    )
    const firstCard = document.querySelector('[id^="schedule-edit-day-"]') as HTMLElement
    expect(within(firstCard).getByRole('combobox', { name: '勤務状況' })).toHaveTextContent(
      '未入力'
    )
  })

  it('creates a time-named template without asking for a template name', async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 })
    render(
      <ScheduleEditDialog
        open
        onOpenChange={vi.fn()}
        castName="明里"
        castId="cast-1"
        startDate={new Date('2026-08-10T00:00:00+09:00')}
        initialSchedule={{}}
        onSave={vi.fn()}
      />
    )

    expect(screen.queryByLabelText('このキャストの出勤テンプレート名')).not.toBeInTheDocument()
    await user.click(screen.getByRole('combobox', { name: 'テンプレート開始時間' }))
    await user.click(await screen.findByRole('option', { name: '12:00' }))
    await user.click(screen.getByRole('combobox', { name: 'テンプレート終了時間' }))
    await user.click(await screen.findByRole('option', { name: '22:00' }))
    await user.click(screen.getByRole('button', { name: 'この時間をテンプレート保存' }))

    await waitFor(() =>
      expect(fetch).toHaveBeenCalledWith(
        '/api/cast',
        expect.objectContaining({ method: 'PUT', body: expect.stringContaining('12:00-22:00') })
      )
    )
  })

  it('edits media text and internal notes as separate one-line fields', () => {
    render(
      <ScheduleEditDialog
        open
        onOpenChange={vi.fn()}
        castName="明里"
        castId="cast-1"
        startDate={new Date('2026-08-10T00:00:00+09:00')}
        initialSchedule={{}}
        onSave={vi.fn()}
      />
    )

    const firstCard = document.querySelector('[id^="schedule-edit-day-"]') as HTMLElement
    expect(within(firstCard).getByLabelText('媒体用テキスト')).toHaveAttribute('type', 'text')
    expect(within(firstCard).getByLabelText('備考')).toHaveAttribute('type', 'text')
  })

  it('shows each saved template delete control once instead of repeating it for every day', async () => {
    global.fetch = vi.fn().mockImplementation((url: string) =>
      Promise.resolve({
        ok: true,
        json: async () =>
          url.startsWith('/api/cast?')
            ? {
                scheduleTemplates: [
                  {
                    id: 'custom-day',
                    name: '昼番',
                    startTime: '12:00',
                    endTime: '20:00',
                    isHoliday: false,
                  },
                  { id: 'holiday', name: '休み', startTime: '', endTime: '', isHoliday: true },
                ],
              }
            : { data: {} },
      } as Response)
    )

    render(
      <ScheduleEditDialog
        open
        onOpenChange={vi.fn()}
        castName="明里"
        castId="cast-1"
        startDate={new Date('2026-08-10T00:00:00+09:00')}
        initialSchedule={{}}
        onSave={vi.fn()}
      />
    )

    await waitFor(() =>
      expect(screen.getAllByRole('button', { name: '昼番を削除' })).toHaveLength(1)
    )
  })

  it('uses the same six work states as the cast profile schedule', async () => {
    const user = userEvent.setup()
    render(
      <ScheduleEditDialog
        open
        onOpenChange={vi.fn()}
        castName="明里"
        castId="cast-1"
        startDate={new Date('2026-08-10T00:00:00+09:00')}
        initialSchedule={{}}
        onSave={vi.fn()}
      />
    )

    const firstCard = document.querySelector('[id^="schedule-edit-day-"]') as HTMLElement
    await user.click(within(firstCard).getByRole('combobox', { name: '勤務状況' }))
    for (const label of ['未入力', '出勤予定', '出勤中', '休日', '早退', '遅刻']) {
      expect(await screen.findByRole('option', { name: label })).toBeInTheDocument()
    }
  })

  it('renders four weeks as a calendar and resets that choice for another cast', async () => {
    const { rerender } = render(
      <ScheduleEditDialog
        open
        onOpenChange={vi.fn()}
        castName="明里"
        castId="cast-1"
        startDate={new Date('2026-08-10T00:00:00+09:00')}
        initialSchedule={{}}
        onSave={vi.fn()}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: '4週間をカレンダー入力' }))
    expect(await screen.findByRole('grid', { name: '4週間出勤カレンダー' })).toBeInTheDocument()

    rerender(
      <ScheduleEditDialog
        open
        onOpenChange={vi.fn()}
        castName="楓"
        castId="cast-2"
        startDate={new Date('2026-08-10T00:00:00+09:00')}
        initialSchedule={{}}
        onSave={vi.fn()}
      />
    )

    await waitFor(() =>
      expect(screen.getByRole('button', { name: '4週間をカレンダー入力' })).toHaveAttribute(
        'aria-pressed',
        'false'
      )
    )
  })

  it('creates a template from explicit start and end time selectors', () => {
    render(
      <ScheduleEditDialog
        open
        onOpenChange={vi.fn()}
        castName="明里"
        castId="cast-1"
        startDate={new Date('2026-08-10T00:00:00+09:00')}
        initialSchedule={{}}
        onSave={vi.fn()}
      />
    )

    expect(screen.getByRole('combobox', { name: 'テンプレート開始時間' })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'テンプレート終了時間' })).toBeInTheDocument()
  })
})
