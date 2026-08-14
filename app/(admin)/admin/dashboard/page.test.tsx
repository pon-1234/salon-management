/**
 * @design_doc   docs/LEGACY_GOLD_ADMIN_MIGRATION_INVENTORY.md admin dashboard mapping
 * @related_to   DashboardPage, CustomerSelectionDialog, and weekly cast schedule
 * @known_issues Payment reference entry remains outside the dashboard scope
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { formatInTimeZone, zonedTimeToUtc } from 'date-fns-tz'
import type { Reservation } from '@/lib/types/reservation'
import DashboardPage from './page'

const mocks = vi.hoisted(() => ({
  getAllReservations: vi.fn(),
  getWeeklySchedule: vi.fn(),
  toast: vi.fn(),
  dialogSavePayload: { status: 'confirmed', notes: '更新後メモ' } as Record<string, unknown>,
}))

vi.mock('next-auth/react', () => ({
  useSession: () => ({
    data: {
      user: {
        id: 'admin-1',
        role: 'admin',
        permissions: ['dashboard:view', 'analytics:read', 'reservation:update'],
      },
    },
    status: 'authenticated',
  }),
}))

vi.mock('@/contexts/store-context', () => ({
  useStore: () => ({
    currentStore: {
      id: 'ikebukuro',
      slug: 'ikebukuro',
      name: '池袋店',
      displayName: '池袋店',
    },
  }),
}))

vi.mock('@/lib/reservation/data', () => ({
  getAllReservations: mocks.getAllReservations,
}))

vi.mock('@/lib/cast-schedule/usecases', () => ({
  CastScheduleUseCases: class {
    getWeeklySchedule = mocks.getWeeklySchedule
  },
}))

vi.mock('@/hooks/use-toast', () => ({
  toast: mocks.toast,
}))

vi.mock('@/components/reservation/reservation-dialog', () => ({
  ReservationDialog: ({
    open,
    reservation,
    onSave,
  }: {
    open: boolean
    reservation: { id: string } | null
    onSave?: (reservationId: string, payload: Record<string, unknown>) => Promise<void> | void
  }) =>
    open && reservation ? (
      <button type="button" onClick={() => void onSave?.(reservation.id, mocks.dialogSavePayload)}>
        ダッシュボード予約を保存
      </button>
    ) : null,
}))

vi.mock('@/components/customer/customer-selection-dialog', () => ({
  CustomerSelectionDialog: ({
    open,
    mode = 'reservation',
  }: {
    open: boolean
    mode?: 'reservation' | 'lookup'
  }) => (open ? <div data-testid={`customer-dialog-${mode}`} /> : null),
}))

vi.mock('recharts', () => {
  const Container = ({ children }: { children?: React.ReactNode }) => <div>{children}</div>
  const Chart = () => <div />
  const Empty = () => null
  return {
    AreaChart: Chart,
    Area: Empty,
    XAxis: Empty,
    YAxis: Empty,
    CartesianGrid: Empty,
    Tooltip: Empty,
    ResponsiveContainer: Container,
    BarChart: Chart,
    Bar: Empty,
    PieChart: Chart,
    Pie: Empty,
    Cell: Empty,
    LineChart: Chart,
    Line: Empty,
  }
})

const JST_TIMEZONE = 'Asia/Tokyo'

function currentDateKey() {
  return formatInTimeZone(new Date(), JST_TIMEZONE, 'yyyy-MM-dd')
}

function makeReservation(
  id: string,
  status: Reservation['status'],
  price: number,
  customerName: string
): Reservation {
  const dateKey = currentDateKey()
  return {
    id,
    customerId: `customer-${id}`,
    customerName,
    staffId: `cast-${id}`,
    staffName: '担当キャスト',
    serviceId: `course-${id}`,
    storeId: 'ikebukuro',
    startTime: zonedTimeToUtc(`${dateKey}T12:00:00`, JST_TIMEZONE),
    endTime: zonedTimeToUtc(`${dateKey}T13:00:00`, JST_TIMEZONE),
    status,
    price,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}

function weeklySchedule() {
  const dateKey = currentDateKey()
  return {
    startDate: new Date(),
    endDate: new Date(),
    entries: [
      {
        castId: 'cast-working',
        name: '本日出勤キャスト',
        nameKana: 'ほんじつしゅっきんきゃすと',
        age: 25,
        image: '/cast.jpg',
        hasPhone: true,
        hasBusinessContact: true,
        schedule: {
          [dateKey]: { type: '出勤予定', startTime: '10:00', endTime: '18:00' },
        },
      },
    ],
    stats: {
      totalCast: 1,
      workingCast: 1,
      averageWorkingHours: 8,
      averageWorkingCast: 1,
    },
  }
}

describe('DashboardPage field operations', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.dialogSavePayload = { status: 'confirmed', notes: '更新後メモ' }
    mocks.getAllReservations.mockResolvedValue([])
    mocks.getWeeklySchedule.mockResolvedValue(weeklySchedule())
    vi.unstubAllGlobals()
  })

  it('keeps reservation, customer, today attendance, and weekly actions visible with no bookings', async () => {
    render(<DashboardPage />)

    expect(await screen.findByRole('button', { name: '予約作成' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '顧客検索' })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: '電話番号' })).toHaveAttribute('type', 'tel')
    expect(screen.getByRole('button', { name: '電話番号で予約を検索' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '本日出勤一覧' })).toBeInTheDocument()
    expect(screen.getByText('本日出勤キャスト')).toBeInTheDocument()
    expect(screen.getByText('10:00〜18:00')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '週間出勤表を見る' })).toHaveAttribute(
      'href',
      '/admin/cast/weekly-schedule'
    )
    expect(screen.getByRole('link', { name: '業務日報を開く' })).toHaveAttribute(
      'href',
      '/admin/analytics/daily-report'
    )
    expect(mocks.getWeeklySchedule).toHaveBeenCalledWith(
      expect.objectContaining({ storeId: 'ikebukuro', castFilter: 'all' })
    )
    expect(mocks.getAllReservations).toHaveBeenCalledWith(
      expect.objectContaining({
        storeId: 'ikebukuro',
        limit: 100,
        offset: 0,
        startDate: expect.any(String),
        endDate: expect.any(String),
      })
    )
  })

  it('separates reservation creation from customer detail lookup', async () => {
    const user = userEvent.setup()
    render(<DashboardPage />)

    await user.click(await screen.findByRole('button', { name: '予約作成' }))
    expect(screen.getByTestId('customer-dialog-reservation')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '顧客検索' }))
    expect(screen.getByTestId('customer-dialog-lookup')).toBeInTheDocument()
  })

  it('excludes cancelled orders from revenue and the operational reservation list', async () => {
    mocks.getAllReservations.mockResolvedValueOnce([
      makeReservation('active', 'confirmed', 12_000, '有効予約顧客'),
      makeReservation('cancelled', 'cancelled', 99_000, '取消予約顧客'),
    ])

    render(<DashboardPage />)

    expect((await screen.findAllByText('¥12,000')).length).toBeGreaterThan(0)
    expect(screen.queryByText('¥111,000')).not.toBeInTheDocument()
    expect(screen.getByText('有効予約顧客')).toBeInTheDocument()
    expect(screen.queryByText('取消予約顧客')).not.toBeInTheDocument()
  })

  it('edits and saves a confirmed reservation without changing it to modifiable', async () => {
    const user = userEvent.setup()
    const confirmed = makeReservation('direct-edit', 'confirmed', 12_000, '直接編集顧客')
    mocks.getAllReservations.mockResolvedValueOnce([confirmed])
    const fetchMock = vi
      .fn()
      .mockImplementation(async (_input: RequestInfo | URL, init?: RequestInit) => {
        const payload = JSON.parse(String(init?.body)) as Record<string, unknown>
        return {
          ok: true,
          status: 200,
          json: async () => ({ ...confirmed, ...payload }),
        } as Response
      })
    vi.stubGlobal('fetch', fetchMock)

    render(<DashboardPage />)

    await user.click(await screen.findByText('直接編集顧客'))
    await user.click(screen.getByRole('button', { name: 'ダッシュボード予約を保存' }))

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        '/api/reservation?storeId=ikebukuro',
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({
            id: confirmed.id,
            status: 'confirmed',
            notes: '更新後メモ',
          }),
        })
      )
    )
    expect(fetchMock.mock.calls[0]?.[1]?.body).not.toContain('modifiable')
  })

  it('removes a dashboard order immediately after a reasoned cancellation', async () => {
    const user = userEvent.setup()
    const confirmed = makeReservation('cancel-now', 'confirmed', 12_000, '取消対象顧客')
    mocks.getAllReservations.mockResolvedValueOnce([confirmed])
    mocks.dialogSavePayload = {
      status: 'cancelled',
      cancellationSource: 'store',
      cancellationReason: '店舗都合',
    }
    const fetchMock = vi
      .fn()
      .mockImplementation(async (_input: RequestInfo | URL, init?: RequestInit) => {
        const payload = JSON.parse(String(init?.body)) as Record<string, unknown>
        return {
          ok: true,
          status: 200,
          json: async () => ({ ...confirmed, ...payload }),
        } as Response
      })
    vi.stubGlobal('fetch', fetchMock)

    render(<DashboardPage />)

    await user.click(await screen.findByText('取消対象顧客'))
    await user.click(screen.getByRole('button', { name: 'ダッシュボード予約を保存' }))

    await waitFor(() => {
      expect(screen.queryByText('取消対象顧客')).not.toBeInTheDocument()
      expect(
        screen.queryByRole('button', { name: 'ダッシュボード予約を保存' })
      ).not.toBeInTheDocument()
    })
  })

  it('finds a customer by an entered phone number and exposes direct reservation creation', async () => {
    const user = userEvent.setup()
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        {
          id: 'legacy-customer-member-100448',
          name: '電話検索顧客',
          phone: '09012345678',
        },
      ],
    })
    vi.stubGlobal('fetch', fetchMock)
    render(<DashboardPage />)

    const phoneInput = await screen.findByRole('textbox', { name: '電話番号' })
    await user.type(phoneInput, '090-1234-5678')
    await user.click(screen.getByRole('button', { name: '電話番号で予約を検索' }))

    expect(await screen.findByRole('link', { name: '電話検索顧客で予約を作成' })).toHaveAttribute(
      'href',
      '/admin/reservation?customerId=legacy-customer-member-100448'
    )
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/customer?phone=09012345678&limit=10',
      expect.objectContaining({ credentials: 'include', cache: 'no-store' })
    )
  })
})
