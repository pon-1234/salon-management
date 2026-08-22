/**
 * @design_doc   SCH-01/SCH-02 キャスト出勤時間テンプレートと休み登録
 * @related_to   ScheduleEditDialog per-day template buttons
 * @known_issues None
 */
import { fireEvent, render, screen, within } from '@testing-library/react'
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

  it('applies 昼勤 and 夜勤 to the clicked date only', () => {
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
    expect(dayCards.length).toBeGreaterThan(2)

    fireEvent.click(
      within(dayCards[0] as HTMLElement).getByRole('button', { name: '昼勤 12:00-22:00 を適用' })
    )
    fireEvent.click(
      within(dayCards[1] as HTMLElement).getByRole('button', { name: '夜勤 18:00-02:30 を適用' })
    )

    expect(within(dayCards[0] as HTMLElement).getByText('12:00')).toBeInTheDocument()
    expect(within(dayCards[0] as HTMLElement).getByText('22:00')).toBeInTheDocument()
    expect(within(dayCards[1] as HTMLElement).getByText('18:00')).toBeInTheDocument()
    expect(within(dayCards[1] as HTMLElement).getByText('02:30')).toBeInTheDocument()
    expect(within(dayCards[2] as HTMLElement).queryByText('出勤予定')).not.toBeInTheDocument()
    expect(within(dayCards[2] as HTMLElement).queryByText('12:00')).not.toBeInTheDocument()
    expect(within(dayCards[2] as HTMLElement).queryByText('18:00')).not.toBeInTheDocument()
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
        initialSchedule={{
          '2026-08-10': { type: '出勤予定', startTime: '12:00', endTime: '22:00' },
        }}
        onSave={vi.fn()}
      />
    )

    const dayCard = document.getElementById('schedule-edit-day-2026-08-10') as HTMLElement
    fireEvent.click(within(dayCard).getByRole('button', { name: '休みを適用' }))

    expect(within(dayCard).getByRole('combobox')).toHaveTextContent('休日')
    expect(within(dayCard).queryByText('12:00')).not.toBeInTheDocument()
    expect(within(dayCard).queryByText('22:00')).not.toBeInTheDocument()
  })
})
