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
  currentStore: {
    id: 'ikebukuro',
    slug: 'ikebukuro',
    name: '池袋店',
    displayName: '池袋店',
  },
  permissions: [
    'dashboard:view',
    'analytics:read',
    'reservation:create',
    'reservation:update',
    'customer:read',
    'customer:create',
  ],
}))

vi.mock('next-auth/react', () => ({
  useSession: () => ({
    data: {
      user: {
        id: 'admin-1',
        role: 'admin',
        permissions: mocks.permissions,
      },
    },
    status: 'authenticated',
  }),
}))

vi.mock('@/contexts/store-context', () => ({
  useStore: () => ({
    currentStore: mocks.currentStore,
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
    mocks.permissions = [
      'dashboard:view',
      'analytics:read',
      'reservation:create',
      'reservation:update',
      'customer:read',
      'customer:create',
    ]
    mocks.currentStore = {
      id: 'ikebukuro',
      slug: 'ikebukuro',
      name: '池袋店',
      displayName: '池袋店',
    }
    mocks.getAllReservations.mockResolvedValue([])
    mocks.getWeeklySchedule.mockResolvedValue(weeklySchedule())
    vi.unstubAllGlobals()
  })

  it('keeps reservation, customer, today attendance, and weekly actions visible with no bookings', async () => {
    render(<DashboardPage />)

    expect(await screen.findByRole('button', { name: '予約作成' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '顧客検索' })).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: '電話番号' })).toHaveAttribute('type', 'tel')
    expect(screen.getByRole('button', { name: '電話番号で顧客を検索' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '電話番号で予約を検索' })).not.toBeInTheDocument()
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
    expect(screen.getByRole('link', { name: '入金処理を開く' })).toHaveAttribute(
      'href',
      '/admin/analytics/payment-processing'
    )
    expect(screen.getByRole('link', { name: '入金精算処理を開く' })).toHaveAttribute(
      'href',
      '/admin/analytics/settlement-processing'
    )
    expect(screen.getByRole('link', { name: '予約表を開く' })).toHaveAttribute(
      'href',
      '/admin/reservation'
    )
    expect(screen.getByRole('link', { name: '予約一覧を開く' })).toHaveAttribute(
      'href',
      '/admin/reservation-list'
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

  it('is an operations home instead of an analytics dump', async () => {
    render(<DashboardPage />)

    expect(await screen.findByRole('heading', { name: '今日の状況' })).toBeInTheDocument()
    expect(screen.getByTestId('today-ops-summary')).toHaveTextContent('本日の予約')
    expect(screen.getByRole('heading', { name: '直近の予約' })).toBeInTheDocument()
    expect(screen.queryByRole('tab', { name: '今週' })).not.toBeInTheDocument()
    expect(screen.queryByRole('tab', { name: '今月' })).not.toBeInTheDocument()
    expect(screen.queryByText('売上推移')).not.toBeInTheDocument()
    expect(screen.queryByText('予約ステータス分布')).not.toBeInTheDocument()
    expect(screen.queryByText('時間帯別予約状況')).not.toBeInTheDocument()
    expect(screen.queryByText('詳細分析')).not.toBeInTheDocument()
    expect(screen.queryByText('新規予約')).not.toBeInTheDocument()
    expect(screen.queryByText('キャンセル率')).not.toBeInTheDocument()
    expect(screen.queryByText('平均単価')).not.toBeInTheDocument()
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
          phone: '+819012345678',
        },
      ],
    })
    vi.stubGlobal('fetch', fetchMock)
    render(<DashboardPage />)

    const phoneInput = await screen.findByRole('textbox', { name: '電話番号' })
    await user.type(phoneInput, '090-1234-5678')
    await user.click(screen.getByRole('button', { name: '電話番号で顧客を検索' }))

    expect(await screen.findByRole('link', { name: '電話検索顧客で予約を作成' })).toHaveAttribute(
      'href',
      '/admin/reservation?customerId=legacy-customer-member-100448'
    )
    expect(screen.getByRole('link', { name: '電話検索顧客の顧客詳細を見る' })).toHaveAttribute(
      'href',
      '/admin/customers/legacy-customer-member-100448'
    )
    expect(screen.getByText('090-1234-5678')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/customer?phone=09012345678&limit=10&storeId=ikebukuro',
      expect.objectContaining({ credentials: 'include', cache: 'no-store' })
    )
  })

  it('keeps a legacy non-writable phone searchable when an existing customer owns it', async () => {
    const user = userEvent.setup()
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        {
          id: 'legacy-customer-invalid-phone',
          name: '旧番号顧客',
          phone: '+81901234567',
        },
      ],
    })
    vi.stubGlobal('fetch', fetchMock)
    render(<DashboardPage />)

    await user.type(await screen.findByRole('textbox', { name: '電話番号' }), '090-123-4567')
    await user.click(screen.getByRole('button', { name: '電話番号で顧客を検索' }))

    expect(await screen.findByRole('link', { name: '旧番号顧客の顧客詳細を見る' })).toHaveAttribute(
      'href',
      '/admin/customers/legacy-customer-invalid-phone'
    )
    expect(screen.getByText('0901234567')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/customer?phone=0901234567&limit=10&storeId=ikebukuro',
      expect.objectContaining({ credentials: 'include', cache: 'no-store' })
    )
  })

  it('keeps an exact migrated non-Japanese numeric phone searchable without offering registration', async () => {
    const user = userEvent.setup()
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        {
          id: 'legacy-customer-foreign-phone',
          name: '旧国際番号顧客',
          phone: '6512345678',
        },
      ],
    })
    vi.stubGlobal('fetch', fetchMock)
    render(<DashboardPage />)

    await user.type(await screen.findByRole('textbox', { name: '電話番号' }), '65-1234-5678')
    await user.click(screen.getByRole('button', { name: '電話番号で顧客を検索' }))

    expect(
      await screen.findByRole('link', { name: '旧国際番号顧客の顧客詳細を見る' })
    ).toHaveAttribute('href', '/admin/customers/legacy-customer-foreign-phone')
    expect(screen.queryByRole('link', { name: 'この番号で新規顧客を登録' })).not.toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/customer?phone=6512345678&limit=10&storeId=ikebukuro',
      expect.objectContaining({ credentials: 'include', cache: 'no-store' })
    )
  })

  it('does not offer new registration when an unmatched legacy phone is not writable', async () => {
    const user = userEvent.setup()
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    })
    vi.stubGlobal('fetch', fetchMock)
    render(<DashboardPage />)

    await user.type(await screen.findByRole('textbox', { name: '電話番号' }), '090-123-4567')
    await user.click(screen.getByRole('button', { name: '電話番号で顧客を検索' }))

    expect(await screen.findByText('該当する顧客が見つかりませんでした。')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'この番号で新規顧客を登録' })).not.toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/customer?phone=0901234567&limit=10&storeId=ikebukuro',
      expect.objectContaining({ credentials: 'include', cache: 'no-store' })
    )
  })

  it('carries an unmatched phone and the Ikebukuro store into name-only customer registration', async () => {
    const user = userEvent.setup()
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    })
    vi.stubGlobal('fetch', fetchMock)
    render(<DashboardPage />)

    await user.type(await screen.findByRole('textbox', { name: '電話番号' }), '090-1234-5678')
    await user.click(screen.getByRole('button', { name: '電話番号で顧客を検索' }))

    expect(await screen.findByRole('link', { name: 'この番号で新規顧客を登録' })).toHaveAttribute(
      'href',
      '/admin/customers/new?returnTo=reservation&phone=09012345678&store=ikebukuro'
    )

    await user.clear(screen.getByRole('textbox', { name: '電話番号' }))
    await user.type(screen.getByRole('textbox', { name: '電話番号' }), '080-9999-8888')

    expect(screen.queryByRole('link', { name: 'この番号で新規顧客を登録' })).not.toBeInTheDocument()
  })

  it('ignores a phone-search response after the operator changes the number', async () => {
    const user = userEvent.setup()
    let resolveSearch: ((response: Response) => void) | undefined
    const fetchMock = vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          resolveSearch = resolve
        })
    )
    vi.stubGlobal('fetch', fetchMock)
    render(<DashboardPage />)

    const phoneInput = await screen.findByRole('textbox', { name: '電話番号' })
    await user.type(phoneInput, '090-1234-5678')
    await user.click(screen.getByRole('button', { name: '電話番号で顧客を検索' }))
    await user.clear(phoneInput)
    await user.type(phoneInput, '080-9999-8888')

    resolveSearch?.({ ok: true, json: async () => [] } as Response)

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    expect(screen.queryByText('該当する顧客が見つかりませんでした。')).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'この番号で新規顧客を登録' })).not.toBeInTheDocument()
  })

  it('clears phone lookup state and ignores the old response after a store switch', async () => {
    const user = userEvent.setup()
    let resolveSearch: ((response: Response) => void) | undefined
    const fetchMock = vi.fn(
      () =>
        new Promise<Response>((resolve) => {
          resolveSearch = resolve
        })
    )
    vi.stubGlobal('fetch', fetchMock)
    const { rerender } = render(<DashboardPage />)

    const phoneInput = await screen.findByRole('textbox', { name: '電話番号' })
    await user.type(phoneInput, '090-1234-5678')
    await user.click(screen.getByRole('button', { name: '電話番号で顧客を検索' }))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))

    mocks.currentStore = {
      id: 'shinjuku',
      slug: 'shinjuku',
      name: '新宿店',
      displayName: '新宿店',
    }
    rerender(<DashboardPage />)

    await waitFor(() => expect(screen.getByRole('textbox', { name: '電話番号' })).toHaveValue(''))

    resolveSearch?.({
      ok: true,
      json: async () => [
        {
          id: 'ikebukuro-customer',
          name: '池袋の顧客',
          phone: '+819012345678',
        },
      ],
    } as Response)

    await waitFor(() => expect(screen.queryByText('池袋の顧客')).not.toBeInTheDocument())
    expect(screen.queryByText('該当する顧客が見つかりませんでした。')).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'この番号で新規顧客を登録' })).not.toBeInTheDocument()
  })

  it('does not submit a partial phone to the exact customer identity endpoint', async () => {
    const user = userEvent.setup()
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    render(<DashboardPage />)

    await user.type(await screen.findByRole('textbox', { name: '電話番号' }), '090123456')
    await user.click(screen.getByRole('button', { name: '電話番号で顧客を検索' }))

    expect(screen.getByRole('alert')).toHaveTextContent('電話番号を10〜11桁で入力してください。')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('hides customer lookup and phone search without customer:read permission', async () => {
    mocks.permissions = [
      'dashboard:view',
      'analytics:read',
      'reservation:create',
      'reservation:update',
      'customer:create',
    ]

    render(<DashboardPage />)

    await screen.findByText('予約受付')
    expect(screen.queryByRole('button', { name: '予約作成' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '顧客検索' })).not.toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: '電話番号' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '電話番号で顧客を検索' })).not.toBeInTheDocument()
  })

  it('allows customer lookup but hides new registration without customer:create permission', async () => {
    mocks.permissions = [
      'dashboard:view',
      'analytics:read',
      'reservation:create',
      'reservation:update',
      'customer:read',
    ]
    const user = userEvent.setup()
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [],
      })
    )

    render(<DashboardPage />)

    await user.type(await screen.findByRole('textbox', { name: '電話番号' }), '090-1234-5678')
    await user.click(screen.getByRole('button', { name: '電話番号で顧客を検索' }))

    expect(await screen.findByText('該当する顧客が見つかりませんでした。')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'この番号で新規顧客を登録' })).not.toBeInTheDocument()
  })

  it('keeps customer lookup but hides every reservation creation route without reservation:create', async () => {
    mocks.permissions = [
      'dashboard:view',
      'analytics:read',
      'reservation:update',
      'customer:read',
      'customer:create',
    ]
    const user = userEvent.setup()
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [
          {
            id: 'legacy-customer-member-100448',
            name: '閲覧専用顧客',
            phone: '+819012345678',
          },
        ],
      })
    )

    render(<DashboardPage />)

    expect(await screen.findByRole('button', { name: '顧客検索' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '予約作成' })).not.toBeInTheDocument()
    expect(screen.queryByText('新規予約')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '顧客検索' }))
    expect(screen.getByTestId('customer-dialog-lookup')).toBeInTheDocument()
    expect(screen.queryByTestId('customer-dialog-reservation')).not.toBeInTheDocument()

    await user.type(screen.getByRole('textbox', { name: '電話番号' }), '090-1234-5678')
    await user.click(screen.getByRole('button', { name: '電話番号で顧客を検索' }))

    expect(await screen.findByText('閲覧専用顧客')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '閲覧専用顧客の顧客詳細を見る' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: '閲覧専用顧客で予約を作成' })).not.toBeInTheDocument()
  })

  it('does not offer reservation-return customer registration without reservation:create', async () => {
    mocks.permissions = [
      'dashboard:view',
      'analytics:read',
      'reservation:update',
      'customer:read',
      'customer:create',
    ]
    const user = userEvent.setup()
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => [],
      })
    )

    render(<DashboardPage />)

    await user.type(await screen.findByRole('textbox', { name: '電話番号' }), '090-1234-5678')
    await user.click(screen.getByRole('button', { name: '電話番号で顧客を検索' }))

    expect(await screen.findByText('該当する顧客が見つかりませんでした。')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'この番号で新規顧客を登録' })).not.toBeInTheDocument()
  })
})
