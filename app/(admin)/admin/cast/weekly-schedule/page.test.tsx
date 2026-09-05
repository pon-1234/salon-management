/**
 * @design_doc   Multi-store weekly cast schedule administration
 * @related_to   WeeklySchedulePage and ScheduleActionButtons controlled filters
 * @known_issues None
 */
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type {
  CastScheduleEntry,
  CastScheduleStatus,
  WeeklySchedule,
} from '@/lib/cast-schedule/old-types'
import WeeklySchedulePage from './page'

const mocks = vi.hoisted(() => ({
  getWeeklySchedule: vi.fn(),
  switchStore: vi.fn(),
  gridProps: vi.fn(),
  stores: [
    {
      id: 'ikebukuro',
      slug: 'ikebukuro',
      name: '池袋店',
      displayName: '池袋店',
    },
    {
      id: 'shinjuku',
      slug: 'shinjuku',
      name: '新宿店',
      displayName: '新宿店',
    },
  ],
}))

const originalHasPointerCapture = Object.getOwnPropertyDescriptor(
  HTMLElement.prototype,
  'hasPointerCapture'
)
const originalReleasePointerCapture = Object.getOwnPropertyDescriptor(
  HTMLElement.prototype,
  'releasePointerCapture'
)
const originalScrollIntoView = Object.getOwnPropertyDescriptor(
  HTMLElement.prototype,
  'scrollIntoView'
)

beforeAll(() => {
  Object.defineProperties(HTMLElement.prototype, {
    hasPointerCapture: { configurable: true, value: () => false },
    releasePointerCapture: { configurable: true, value: () => undefined },
    scrollIntoView: { configurable: true, value: () => undefined },
  })
})

afterAll(() => {
  const restore = (property: string, descriptor: PropertyDescriptor | undefined) => {
    if (descriptor) Object.defineProperty(HTMLElement.prototype, property, descriptor)
    else delete (HTMLElement.prototype as unknown as Record<string, unknown>)[property]
  }

  restore('hasPointerCapture', originalHasPointerCapture)
  restore('releasePointerCapture', originalReleasePointerCapture)
  restore('scrollIntoView', originalScrollIntoView)
})

vi.mock('@/contexts/store-context', async () => {
  const React = await vi.importActual<typeof import('react')>('react')

  return {
    useStore: () => {
      const [currentStore, setCurrentStore] = React.useState(mocks.stores[0])

      return {
        currentStore,
        availableStores: mocks.stores,
        isSuperAdmin: true,
        isLoading: false,
        switchStore: (storeId: string) => {
          mocks.switchStore(storeId)
          const selectedStore = mocks.stores.find((store) => store.id === storeId)
          if (selectedStore) setCurrentStore(selectedStore)
        },
      }
    },
  }
})

vi.mock('@/lib/cast-schedule/usecases', () => ({
  CastScheduleUseCases: class {
    getWeeklySchedule = mocks.getWeeklySchedule
  },
}))

vi.mock('@/hooks/use-toast', () => ({
  toast: vi.fn(),
}))

vi.mock('@/components/cast-schedule/schedule-info-bar', () => ({
  ScheduleInfoBar: () => <div data-testid="schedule-info" />,
}))

vi.mock('@/components/cast-schedule/schedule-grid', () => ({
  ScheduleGrid: ({
    entries,
    viewMode,
    className,
    onSaveSchedule,
  }: {
    onSaveSchedule: (
      id: string,
      schedule: Record<string, { date: string; status: '休日' }>
    ) => Promise<void>
    entries: CastScheduleEntry[]
    viewMode: 'grid' | 'list'
    className?: string
  }) => {
    mocks.gridProps(onSaveSchedule)
    return (
      <div data-testid="schedule-results" data-view-mode={viewMode} className={className}>
        {entries.length === 0 ? (
          <span>条件に一致するキャストはいません</span>
        ) : (
          entries.map((entry) => <span key={entry.castId}>{entry.name}</span>)
        )}
      </div>
    )
  },
}))

const WEEK_DATES = [
  '2026-08-10',
  '2026-08-11',
  '2026-08-12',
  '2026-08-13',
  '2026-08-14',
  '2026-08-15',
  '2026-08-16',
]

function scheduleFor(type: CastScheduleStatus['type']): CastScheduleEntry['schedule'] {
  return Object.fromEntries(WEEK_DATES.map((date) => [date, { type }]))
}

function makeEntry(
  castId: string,
  name: string,
  nameKana: string,
  status: CastScheduleStatus['type']
): CastScheduleEntry {
  return {
    castId,
    name,
    nameKana,
    age: 25,
    image: '/cast.jpg',
    hasPhone: true,
    hasBusinessContact: true,
    schedule: scheduleFor(status),
  }
}

function makeSchedule(storeId: string): WeeklySchedule {
  const entries =
    storeId === 'shinjuku'
      ? [makeEntry('shinjuku-cast', '新宿花子', 'しんじゅくはなこ', '出勤予定')]
      : [
          makeEntry('working-cast', '明里', 'あかり', '出勤予定'),
          makeEntry('holiday-cast', '楓', 'カエデ', '休日'),
          makeEntry('unset-cast', '沙羅', 'さら', '未入力'),
          makeEntry('other-cast', 'Alice', 'Alice', '休日'),
        ]

  return {
    startDate: new Date('2026-08-10T00:00:00+09:00'),
    endDate: new Date('2026-08-16T00:00:00+09:00'),
    entries,
    stats: {
      totalCast: entries.length,
      workingCast: entries.filter((entry) =>
        Object.values(entry.schedule).some((status) => status.type === '出勤予定')
      ).length,
      averageWorkingHours: 8,
      averageWorkingCast: 1,
    },
  }
}

describe('WeeklySchedulePage filters', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getWeeklySchedule.mockImplementation(({ storeId }: { storeId: string }) =>
      Promise.resolve(makeSchedule(storeId))
    )
  })

  it('applies search, status dropdown, and kana filters to the rendered schedule', async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 })
    render(<WeeklySchedulePage />)

    expect(await screen.findByText('明里')).toBeInTheDocument()
    expect(screen.getByText('楓')).toBeInTheDocument()
    expect(screen.getByText('沙羅')).toBeInTheDocument()
    expect(screen.getByText('Alice')).toBeInTheDocument()

    const search = screen.getByRole('searchbox', { name: 'キャスト名検索' })
    await user.type(search, 'カエデ')
    expect(screen.getByText('楓')).toBeInTheDocument()
    expect(screen.queryByText('明里')).not.toBeInTheDocument()

    await user.clear(search)
    await user.click(screen.getByRole('button', { name: 'か行' }))
    expect(screen.getByText('楓')).toBeInTheDocument()
    expect(screen.queryByText('沙羅')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'その他' }))
    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.queryByText('楓')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '全て' }))
    const filterTrigger = screen.getByRole('button', { name: /ステータスフィルター/ })
    fireEvent.pointerDown(filterTrigger, { button: 0 })
    fireEvent.keyDown(filterTrigger, { key: 'Enter' })

    expect(await screen.findByRole('menuitem', { name: '未入力のみ' })).toBeInTheDocument()
    expect(screen.queryByRole('menuitem', { name: 'VIPキャスト' })).not.toBeInTheDocument()
    expect(screen.queryByRole('menuitem', { name: '新人キャスト' })).not.toBeInTheDocument()
    await user.click(screen.getByRole('menuitem', { name: '未入力のみ' }))

    expect(screen.getByText('沙羅')).toBeInTheDocument()
    expect(screen.queryByText('明里')).not.toBeInTheDocument()
    expect(screen.queryByText('楓')).not.toBeInTheDocument()
  })

  it('fills the remaining admin viewport so the grid can keep dates sticky', async () => {
    render(<WeeklySchedulePage />)

    const page = await screen.findByTestId('weekly-schedule-page')
    expect(page).toHaveClass('flex', 'h-full', 'min-h-0', 'flex-col')
    expect(page).not.toHaveClass('min-h-screen')
    expect(screen.getByTestId('schedule-results')).toHaveClass('min-h-0', 'flex-1')
  })

  it('switches the actual result presentation and reloads the selected store', async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 })
    render(<WeeklySchedulePage />)

    const results = await screen.findByTestId('schedule-results')
    expect(results).toHaveAttribute('data-view-mode', 'grid')

    await user.click(screen.getByRole('button', { name: '一覧表示' }))
    expect(results).toHaveAttribute('data-view-mode', 'list')

    await user.click(screen.getByRole('button', { name: '表表示' }))
    expect(results).toHaveAttribute('data-view-mode', 'grid')

    const storeSelect = screen.getByRole('combobox', { name: '店舗' })
    fireEvent.pointerDown(storeSelect, { button: 0 })
    fireEvent.keyDown(storeSelect, { key: 'Enter' })
    await user.click(await screen.findByRole('option', { name: '新宿店' }))

    await waitFor(() => expect(mocks.switchStore).toHaveBeenCalledWith('shinjuku'))
    expect(await screen.findByText('新宿花子')).toBeInTheDocument()
    expect(screen.queryByText('明里')).not.toBeInTheDocument()
    expect(mocks.getWeeklySchedule).toHaveBeenLastCalledWith(
      expect.objectContaining({ storeId: 'shinjuku', castFilter: 'all' })
    )
  })
})

describe('WeeklySchedulePage save outcomes', () => {
  beforeEach(() => {
    mocks.getWeeklySchedule.mockResolvedValue(makeSchedule('ikebukuro'))
  })
  it('propagates save failure without removing the editor tree or refreshing away edits', async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValue({ ok: false, json: async () => ({ error: '保存エラー' }) })
    render(<WeeklySchedulePage />)
    await screen.findByTestId('schedule-results')
    const save = mocks.gridProps.mock.lastCall![0]
    await act(async () => {
      await expect(
        save('working-cast', { '2026-08-10': { date: '2026-08-10', status: '休日' } })
      ).rejects.toThrow('保存エラー')
    })
    expect(screen.getByTestId('schedule-results')).toBeInTheDocument()
  })
})

it('refreshes totals after saving without replacing the open editor tree with a loader', async () => {
  mocks.getWeeklySchedule.mockReset().mockResolvedValue(makeSchedule('ikebukuro'))
  global.fetch = vi
    .fn()
    .mockResolvedValue({ ok: true, json: async () => ({ message: '保存しました' }) })
  render(<WeeklySchedulePage />)
  await screen.findByTestId('schedule-results')
  const save = mocks.gridProps.mock.lastCall![0]
  await act(async () => {
    await save('working-cast', { '2026-08-10': { date: '2026-08-10', status: '休日' } })
  })
  expect(mocks.getWeeklySchedule).toHaveBeenCalledTimes(2)
  expect(screen.getByTestId('schedule-results')).toBeInTheDocument()
})
