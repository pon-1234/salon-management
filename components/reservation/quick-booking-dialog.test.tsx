/**
 * @design_doc   docs/SYSTEM_AUDIT_2026-07-26.md D-1 reservation module split
 * @related_to   QuickBookingDialog reservation creation, reset, and submission behavior
 * @known_issues None known within the one-page booking flow
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { Cast } from '@/lib/cast/types'
import type { Customer } from '@/lib/customer/types'
import type { BusinessHoursRange } from '@/lib/settings/business-hours'
import { formatDateInJst } from './quick-booking.utils'
import { QuickBookingDialog } from './quick-booking-dialog'

const mocks = vi.hoisted(() => ({
  checkAvailability: vi.fn(),
  getDesignationFees: vi.fn(),
  toast: vi.fn(),
  renderTimeSlotPicker: vi.fn(),
  refreshPricing: vi.fn(),
  refreshLocations: vi.fn(),
  legacyCourses: [],
  legacyOptions: [],
  additionalFees: [],
  areas: [
    { id: 'area-toshima', name: '豊島区', city: '豊島区' },
    { id: 'area-ikebukuro', name: '池袋エリア' },
  ],
  stations: [
    {
      id: 'station-ikebukuro-north',
      name: '池袋（北口・西口）',
      areaId: 'area-toshima',
      transportationFee: 0,
      travelTime: 10,
    },
    {
      id: 'station-ikebukuro',
      name: '池袋駅',
      areaId: 'area-ikebukuro',
      transportationFee: 1_500,
      travelTime: 10,
    },
  ],
  coursePrices: [
    {
      id: 'course-standard',
      name: 'テストコース',
      duration: 60,
      price: 10_000,
      storeShare: 3_000,
      castShare: 7_000,
    },
  ],
  optionPrices: [
    {
      id: 'legacy-option-aroma',
      name: 'アロマ追加',
      price: 1_000,
      note: null,
      storeShare: 200,
      castShare: 800,
    },
  ],
}))

vi.mock('@/contexts/store-context', () => ({
  useStore: () => ({
    currentStore: {
      id: 'ikebukuro',
      slug: 'ikebukuro',
      name: '池袋店',
      displayName: '池袋店',
      welfareExpenseRate: 10,
    },
  }),
}))

vi.mock('@/hooks/use-pricing', () => ({
  usePricing: () => ({
    courses: mocks.legacyCourses,
    options: mocks.legacyOptions,
    coursePrices: mocks.coursePrices,
    optionPrices: mocks.optionPrices,
    additionalFees: mocks.additionalFees,
    loading: false,
    error: null,
    refresh: mocks.refreshPricing,
  }),
}))

vi.mock('@/hooks/use-locations', () => ({
  useLocations: () => ({
    areas: mocks.areas,
    stations: mocks.stations,
    loading: false,
    error: null,
    refresh: mocks.refreshLocations,
  }),
}))

vi.mock('@/hooks/use-availability', () => ({
  useAvailability: () => ({
    checkAvailability: mocks.checkAvailability,
  }),
}))

vi.mock('@/lib/designation/data', () => ({
  getDesignationFees: mocks.getDesignationFees,
}))

vi.mock('@/hooks/use-toast', () => ({
  toast: mocks.toast,
}))

vi.mock('./time-slot-picker', () => ({
  TimeSlotPicker: (props: Record<string, unknown>) => {
    mocks.renderTimeSlotPicker(props)
    return <div data-testid="time-slot-picker" />
  },
}))

const selectedStaff: Cast = {
  id: 'cast-1',
  name: 'テストキャスト',
  nameKana: 'てすとかすと',
  age: 25,
  height: 160,
  bust: 'C',
  waist: 58,
  hip: 86,
  type: 'テスト',
  image: '/cast.jpg',
  images: [],
  description: '',
  netReservation: true,
  specialDesignationFee: null,
  regularDesignationFee: null,
  panelDesignationRank: 0,
  regularDesignationRank: 0,
  workStatus: '出勤',
  appointments: [],
  availableOptions: ['legacy-option-aroma'],
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
}

const selectedCustomer: Customer = {
  id: 'customer-1',
  name: '予約テスト顧客',
  nameKana: 'よやくてすとこきゃく',
  phone: '090-1111-2222',
  email: 'customer@example.com',
  password: '',
  birthDate: new Date('1990-01-01T00:00:00Z'),
  age: 36,
  memberType: 'regular',
  accountStatus: 'active',
  membershipStage: 'regular',
  smsEnabled: true,
  emailNotificationEnabled: true,
  points: 100,
  registrationDate: new Date('2025-01-01T00:00:00Z'),
  createdAt: new Date('2025-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
}

const businessHours: BusinessHoursRange = {
  startMinutes: 9 * 60,
  endMinutes: 23 * 60,
  startLabel: '09:00',
  endLabel: '23:00',
}

const selectedTime = new Date('2099-01-02T03:00:00.000Z')

function createFetchMock(completedHistory: unknown[] = []) {
  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    if (init?.method === 'POST' || init?.method === 'PUT') {
      return {
        ok: true,
        status: init?.method === 'POST' ? 201 : 200,
        json: async () => ({ id: 'reservation-created' }),
      } as Response
    }

    if (String(input).includes('/api/reservation?')) {
      return {
        ok: true,
        status: 200,
        json: async () => completedHistory,
      } as Response
    }

    if (String(input).includes('/api/admin')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({
          admins: [
            {
              id: 'admin-1',
              name: '受付一郎',
              role: 'manager',
              isActive: true,
              storeIds: ['ikebukuro'],
            },
            {
              id: 'admin-2',
              name: '受付花子',
              role: 'staff',
              isActive: true,
              storeIds: ['ikebukuro'],
            },
          ],
        }),
      } as Response
    }

    return {
      ok: true,
      status: 200,
      json: async () => ({
        data: { marketingChannels: ['WEB', '電話'], creditCardFeeRate: 10 },
      }),
    } as Response
  })
}

function dialogElement({
  open = true,
  time = selectedTime,
  onOpenChange = vi.fn(),
  selectedStaff: dialogStaff = selectedStaff,
}: {
  open?: boolean
  time?: Date | null
  onOpenChange?: (open: boolean) => void
  selectedStaff?: Cast
} = {}) {
  return (
    <QuickBookingDialog
      open={open}
      onOpenChange={onOpenChange}
      selectedStaff={dialogStaff}
      selectedTime={time ?? undefined}
      selectedSlot={null}
      selectedCustomer={selectedCustomer}
      businessHours={businessHours}
    />
  )
}

async function waitForOnePageBookingForm() {
  await screen.findByRole('combobox', { name: 'コース1' })
  expect(await screen.findByText(/オプション選択/)).toBeInTheDocument()
  expect(await screen.findByText('料金内訳')).toBeInTheDocument()
}

async function submitConfirmed(user: ReturnType<typeof userEvent.setup>) {
  await user.selectOptions(screen.getByLabelText('予約ステータス'), '確定済')
  await user.click(screen.getByRole('button', { name: '予約を確定' }))
}

function getPostedReservation(fetchMock: ReturnType<typeof createFetchMock>) {
  const postCall = fetchMock.mock.calls.find(([, init]) => init?.method === 'POST')
  expect(postCall).toBeDefined()
  return JSON.parse(String(postCall?.[1]?.body)) as Record<string, unknown>
}

describe('QuickBookingDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.checkAvailability.mockReset()
    Object.defineProperty(Element.prototype, 'scrollIntoView', {
      configurable: true,
      value: vi.fn(),
    })
    mocks.coursePrices = [
      {
        id: 'course-standard',
        name: 'テストコース',
        duration: 60,
        price: 10_000,
        storeShare: 3_000,
        castShare: 7_000,
      },
    ]
    mocks.checkAvailability.mockResolvedValue({ available: true, conflicts: [] })
    mocks.getDesignationFees.mockResolvedValue([])
  })

  afterEach(() => {
    cleanup()
    Reflect.deleteProperty(Element.prototype, 'scrollIntoView')
    vi.unstubAllGlobals()
  })

  it('keeps the saved catalog order instead of sorting courses by duration', async () => {
    mocks.coursePrices = [
      { ...mocks.coursePrices[0], id: 'long', name: '先頭120分', duration: 120 },
      { ...mocks.coursePrices[0], id: 'short', name: '後方60分', duration: 60 },
    ]
    vi.stubGlobal('fetch', createFetchMock())
    render(dialogElement())
    const select = await screen.findByRole('combobox', { name: 'コース1' })
    expect(
      Array.from((select as HTMLSelectElement).options)
        .map((option) => option.value)
        .filter(Boolean)
    ).toEqual(['long', 'short'])
  })

  it('uses the reservation受付 name and shows service location fields', async () => {
    vi.stubGlobal('fetch', createFetchMock())
    render(dialogElement())

    expect(await screen.findByRole('heading', { name: '予約受付' })).toBeInTheDocument()
    expect(screen.getByLabelText('対応エリア')).toBeInTheDocument()
    expect(screen.getByLabelText('最寄り駅')).toBeInTheDocument()
    expect(screen.getByLabelText('訪問先メモ')).toBeInTheDocument()
  })

  it('shows every booking section together without step navigation and keeps submit visible', async () => {
    vi.stubGlobal('fetch', createFetchMock())
    render(dialogElement())

    await screen.findByText('料金内訳')

    const customerSummary = screen.getByTestId('quick-booking-customer-summary')
    expect(customerSummary).toHaveTextContent('お客様情報')
    expect(customerSummary).toHaveTextContent('予約テスト顧客')
    expect(customerSummary).toHaveTextContent('090-1111-2222')
    expect(customerSummary).toHaveClass('text-sm')
    expect(customerSummary.querySelector('h3')).toBeNull()
    expect(screen.getByText('サービス詳細')).toBeInTheDocument()
    expect(screen.getByText('コース選択')).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: '指名設定' })).toBeInTheDocument()
    expect(screen.getByText('オプション選択・支払い情報')).toBeInTheDocument()
    expect(screen.getByText('集客・受付情報')).toBeInTheDocument()
    expect(screen.getByText('料金内訳')).toBeInTheDocument()
    expect(screen.getByText('追加料金')).toBeInTheDocument()
    expect(screen.getByText('割引')).toBeInTheDocument()
    expect(screen.getByText('ポイント利用')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '次へ' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '戻る' })).not.toBeInTheDocument()

    const panelGrid = screen.getByTestId('quick-booking-panel-grid')
    expect(panelGrid).toHaveClass('lg:grid-cols-2')
    expect(panelGrid).not.toHaveClass('xl:grid-cols-4')

    const optionGrid = screen.getByTestId('quick-booking-option-grid')
    expect(optionGrid).toHaveClass('grid-cols-1')
    expect(optionGrid).not.toHaveClass('sm:grid-cols-2')

    const submit = screen.getByRole('button', { name: '事前確認として保存' })
    const stickyFooter = screen.getByTestId('quick-booking-sticky-footer')
    expect(stickyFooter).toHaveClass('sticky', 'bottom-0')
    expect(stickyFooter).toContainElement(submit)
  })

  it('offers only 5-minute start boundaries and rejects an off-boundary manual time', async () => {
    const fetchMock = createFetchMock()
    vi.stubGlobal('fetch', fetchMock)
    render(dialogElement())

    await screen.findByText('料金内訳')
    await waitFor(() =>
      expect(mocks.renderTimeSlotPicker).toHaveBeenCalledWith(
        expect.objectContaining({ stepMinutes: 5 })
      )
    )

    const timeInput = document.querySelector<HTMLInputElement>('input[name="time"]')
    expect(timeInput).not.toBeNull()
    expect(timeInput).toHaveAttribute('step', '300')

    fireEvent.change(timeInput!, { target: { value: '12:03' } })
    fireEvent.click(screen.getByRole('button', { name: '事前確認として保存' }))

    await waitFor(() =>
      expect(mocks.toast).toHaveBeenCalledWith({
        title: '開始時間は5分単位で入力してください',
        description: '開始時間の分は5分単位で指定してください。',
        variant: 'destructive',
      })
    )
    expect(mocks.checkAvailability).not.toHaveBeenCalled()
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'POST')).toBe(false)
  })

  it('lets the operator pick a designation from a single select instead of fee buttons', async () => {
    mocks.getDesignationFees.mockResolvedValue([
      {
        id: 'fee-free',
        name: 'フリー',
        price: 0,
        storeShare: 0,
        castShare: 0,
        sortOrder: 1,
        isActive: true,
        kind: 'free',
      },
      {
        id: 'fee-repeat',
        name: 'リピート指名',
        price: 3_000,
        storeShare: 1_000,
        castShare: 2_000,
        sortOrder: 2,
        isActive: true,
        kind: 'repeat',
      },
    ])
    vi.stubGlobal('fetch', createFetchMock())
    render(dialogElement())

    await waitForOnePageBookingForm()
    await waitFor(() =>
      expect(screen.getByRole('combobox', { name: '指名設定' })).toBeInTheDocument()
    )

    expect(screen.queryByRole('button', { name: /フリー/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /リピート指名/ })).not.toBeInTheDocument()
  })

  it('offers フリー指名 and おすすめパネル指名 when the catalog is empty', async () => {
    const user = userEvent.setup()
    mocks.getDesignationFees.mockResolvedValue([])
    vi.stubGlobal('fetch', createFetchMock())
    render(
      <QuickBookingDialog
        open
        onOpenChange={vi.fn()}
        selectedStaff={{ ...selectedStaff, specialDesignationFee: 5_000 }}
        selectedTime={selectedTime}
        selectedSlot={null}
        selectedCustomer={selectedCustomer}
        businessHours={businessHours}
      />
    )

    await waitForOnePageBookingForm()
    const designation = screen.getByRole('combobox', { name: '指名設定' })
    Object.assign(designation, {
      hasPointerCapture: () => false,
      setPointerCapture: () => undefined,
      releasePointerCapture: () => undefined,
    })
    await user.click(designation)
    expect(await screen.findByRole('option', { name: /フリー指名/ })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /おすすめパネル指名/ })).toBeInTheDocument()
  })

  it('still offers フリー指名 and おすすめパネル指名 when the catalog only has リピート指名', async () => {
    const user = userEvent.setup()
    mocks.getDesignationFees.mockResolvedValue([
      {
        id: 'fee-repeat',
        name: 'リピート指名',
        price: 3_000,
        storeShare: 1_000,
        castShare: 2_000,
        sortOrder: 2,
        isActive: true,
        kind: 'repeat',
      },
    ])
    vi.stubGlobal('fetch', createFetchMock())
    render(
      <QuickBookingDialog
        open
        onOpenChange={vi.fn()}
        selectedStaff={{ ...selectedStaff, specialDesignationFee: 4_000 }}
        selectedTime={selectedTime}
        selectedSlot={null}
        selectedCustomer={selectedCustomer}
        businessHours={businessHours}
      />
    )

    await waitForOnePageBookingForm()
    const designation = screen.getByRole('combobox', { name: '指名設定' })
    Object.assign(designation, {
      hasPointerCapture: () => false,
      setPointerCapture: () => undefined,
      releasePointerCapture: () => undefined,
    })
    await user.click(designation)
    expect(await screen.findByRole('option', { name: /フリー指名/ })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: /おすすめパネル指名/ })).toBeInTheDocument()
  })

  it('auto-selects the cast panel fee for a first visit and リピート指名 for a repeat visit', async () => {
    const catalog = [
      {
        id: 'fee-free',
        name: 'フリー',
        price: 0,
        storeShare: 0,
        castShare: 0,
        sortOrder: 1,
        isActive: true,
        kind: 'free' as const,
      },
      {
        id: 'fee-repeat',
        name: 'リピート指名',
        price: 3_000,
        storeShare: 1_000,
        castShare: 2_000,
        sortOrder: 2,
        isActive: true,
        kind: 'repeat' as const,
      },
      {
        id: 'fee-panel',
        name: 'おすすめパネル指名',
        price: 2_000,
        storeShare: 0,
        castShare: 2_000,
        sortOrder: 3,
        isActive: true,
        kind: 'panel' as const,
      },
    ]
    mocks.getDesignationFees.mockResolvedValue(catalog)
    vi.stubGlobal('fetch', createFetchMock())
    const { unmount } = render(
      dialogElement({ selectedStaff: { ...selectedStaff, specialDesignationFee: 5_000 } })
    )

    await waitForOnePageBookingForm()
    await waitFor(() => {
      expect(screen.getByRole('combobox', { name: '指名設定' })).toHaveTextContent(
        'おすすめパネル指名（5,000円）'
      )
    })
    unmount()

    mocks.getDesignationFees.mockResolvedValue(catalog)
    vi.stubGlobal('fetch', createFetchMock([{ id: 'completed-1' }]))
    render(dialogElement())
    await waitForOnePageBookingForm()
    await waitFor(() => {
      expect(screen.getByRole('combobox', { name: '指名設定' })).toHaveTextContent('リピート指名')
    })
  })

  it('uses the selected designation category for the cast take-home bonus', async () => {
    mocks.getDesignationFees.mockResolvedValue([
      {
        id: 'fee-free',
        name: 'フリー',
        price: 0,
        storeShare: 0,
        castShare: 0,
        sortOrder: 1,
        isActive: true,
        kind: 'free',
      },
      {
        id: 'fee-panel',
        name: 'おすすめパネル指名',
        price: 2_000,
        storeShare: 0,
        castShare: 2_000,
        sortOrder: 2,
        isActive: true,
        kind: 'panel',
      },
    ])
    vi.stubGlobal('fetch', createFetchMock())
    render(
      dialogElement({
        selectedStaff: {
          ...selectedStaff,
          specialDesignationFee: 2_000,
          regularDesignationFee: 3_000,
          panelTakeHomeBonus: 1_000,
          regularTakeHomeBonus: 2_000,
        },
      })
    )

    await waitForOnePageBookingForm()
    await waitFor(() =>
      expect(screen.getByRole('combobox', { name: '指名設定' })).toHaveTextContent(
        'おすすめパネル指名'
      )
    )
    expect(screen.getByText(/店舗売上:/)).toHaveTextContent('店舗売上: 2,000円')
    expect(screen.getByText(/キャスト売上:/)).toHaveTextContent('キャスト売上: 10,000円')
  })

  it('persists used points so the confirmed order can display the same deduction', async () => {
    const user = userEvent.setup()
    const fetchMock = createFetchMock()
    vi.stubGlobal('fetch', fetchMock)
    render(dialogElement())

    await waitForOnePageBookingForm()
    await user.click(screen.getByRole('switch', { name: 'ポイントを利用' }))
    await user.clear(screen.getByLabelText('利用ポイント数'))
    await user.type(screen.getByLabelText('利用ポイント数'), '100')
    await submitConfirmed(user)

    await waitFor(() => expect(getPostedReservation(fetchMock)).toBeDefined())
    expect(getPostedReservation(fetchMock)).toEqual(expect.objectContaining({ pointsUsed: 100 }))
    expect(screen.getByText('ポイント利用').parentElement).toHaveTextContent('-100円')
  })

  it('does not label any amount as welfare expense in the booking price breakdown', async () => {
    vi.stubGlobal('fetch', createFetchMock())
    render(dialogElement())

    await waitForOnePageBookingForm()

    expect(screen.queryByText(/厚生費/)).not.toBeInTheDocument()
  })

  it('toggles an option exactly once from either the whole row or its checkbox', async () => {
    const user = userEvent.setup()
    vi.stubGlobal('fetch', createFetchMock())
    render(dialogElement())

    await waitForOnePageBookingForm()

    const checkbox = screen.getByRole('checkbox', { name: /アロマ追加/ })
    expect(checkbox).not.toBeChecked()

    await user.click(screen.getByTestId('option-row-legacy-option-aroma'))
    expect(checkbox).toBeChecked()

    await user.click(checkbox)
    expect(checkbox).not.toBeChecked()
  })

  it('keeps options readable in a single-column list', async () => {
    vi.stubGlobal('fetch', createFetchMock())
    render(dialogElement())

    await waitForOnePageBookingForm()

    expect(screen.getByTestId('quick-booking-option-grid')).toHaveClass('grid-cols-1')
    expect(screen.getByTestId('quick-booking-option-grid')).not.toHaveClass('sm:grid-cols-2')
  })

  it('uses the configured intake methods without silently restoring removed entries', async () => {
    const user = userEvent.setup()
    vi.stubGlobal('fetch', createFetchMock())
    render(dialogElement())

    await waitForOnePageBookingForm()
    const channelSelect = screen.getByRole('combobox', { name: '集客手段' })
    Object.assign(channelSelect, {
      hasPointerCapture: () => false,
      setPointerCapture: () => undefined,
      releasePointerCapture: () => undefined,
    })
    await user.click(channelSelect)

    expect(await screen.findByRole('option', { name: 'WEB' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: '電話' })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: 'LINE' })).not.toBeInTheDocument()
    await user.keyboard('{Escape}')

    const siteSelect = screen.getByRole('combobox', { name: '集客チャンネル' })
    Object.assign(siteSelect, {
      hasPointerCapture: () => false,
      setPointerCapture: () => undefined,
      releasePointerCapture: () => undefined,
    })
    await user.click(siteSelect)
    expect(screen.queryByRole('option', { name: 'Heaven' })).not.toBeInTheDocument()
    expect(screen.queryByRole('option', { name: 'サイト関連' })).not.toBeInTheDocument()
  })

  it('posts confirmed status, real option IDs, and no implicit dispatch charge', async () => {
    const user = userEvent.setup()
    const fetchMock = createFetchMock()
    vi.stubGlobal('fetch', fetchMock)
    render(dialogElement())

    await waitForOnePageBookingForm()
    await user.click(screen.getByRole('checkbox', { name: /アロマ追加/ }))
    expect(screen.queryByText('交通費（円）')).not.toBeInTheDocument()
    const areaSelect = screen.getByRole('combobox', { name: '対応エリア' })
    Object.assign(areaSelect, {
      hasPointerCapture: () => false,
      setPointerCapture: () => undefined,
      releasePointerCapture: () => undefined,
    })
    await user.click(areaSelect)
    await user.click(await screen.findByRole('option', { name: '池袋エリア' }))
    const stationSelect = screen.getByRole('combobox', { name: '最寄り駅' })
    Object.assign(stationSelect, {
      hasPointerCapture: () => false,
      setPointerCapture: () => undefined,
      releasePointerCapture: () => undefined,
    })
    await user.click(stationSelect)
    await user.click(await screen.findByRole('option', { name: '池袋駅' }))
    await user.type(screen.getByLabelText('訪問先メモ'), '101前で待つ')
    await submitConfirmed(user)

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ method: 'POST' })
      )
    )
    expect(getPostedReservation(fetchMock)).toEqual(
      expect.objectContaining({
        status: 'confirmed',
        options: ['legacy-option-aroma'],
        areaId: 'area-ikebukuro',
        stationId: 'station-ikebukuro',
        locationMemo: '101前で待つ',
        transportationFee: 0,
      })
    )
  })

  it('posts pending only after the operator explicitly selects provisional booking', async () => {
    const user = userEvent.setup()
    const fetchMock = createFetchMock()
    vi.stubGlobal('fetch', fetchMock)
    render(dialogElement())

    await waitForOnePageBookingForm()
    const statusSelect = screen.getByLabelText('予約ステータス')
    expect(statusSelect).toHaveValue('事前確認')
    await user.selectOptions(statusSelect, '仮予約')
    await user.click(screen.getByRole('button', { name: '仮予約として保存' }))

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ method: 'POST' })
      )
    )
    expect(getPostedReservation(fetchMock)).toEqual(expect.objectContaining({ status: 'pending' }))
  })

  it('keeps points and store memo visible in the booking panels', async () => {
    render(dialogElement())
    await waitForOnePageBookingForm()

    expect(screen.getByPlaceholderText('店舗用メモがあれば記載してください')).toBeInTheDocument()
    expect(screen.getByRole('switch', { name: 'ポイントを利用' })).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: '追加項目（ポイント・店舗メモ）' })
    ).not.toBeInTheDocument()
  })

  it('closes an unsaved card-payment draft from the footer without extra steps', async () => {
    const onOpenChange = vi.fn()
    render(dialogElement({ onOpenChange }))
    await waitForOnePageBookingForm()

    fireEvent.click(screen.getByRole('button', { name: '閉じる' }))

    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('requires and posts a non-sensitive management reference for card payment', async () => {
    const user = userEvent.setup()
    const fetchMock = createFetchMock()
    vi.stubGlobal('fetch', fetchMock)
    render(dialogElement())

    await waitForOnePageBookingForm()
    const paymentMethod = screen.getByRole('combobox', { name: '支払い方法' })
    Object.assign(paymentMethod, {
      hasPointerCapture: () => false,
      setPointerCapture: () => undefined,
      releasePointerCapture: () => undefined,
    })
    await user.click(paymentMethod)
    await user.click(await screen.findByRole('option', { name: 'クレジットカード' }))
    const referenceInput = screen.getByLabelText('カード決済管理番号')
    await user.type(referenceInput, 'IK-2026-00421')
    await submitConfirmed(user)

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ method: 'POST' })
      )
    )
    expect(getPostedReservation(fetchMock)).toEqual(
      expect.objectContaining({
        paymentMethod: 'クレジットカード',
        paymentReference: 'IK-2026-00421',
      })
    )
  })

  it('fully resets operator input when the closed dialog is opened again', async () => {
    const user = userEvent.setup()
    const fetchMock = createFetchMock()
    vi.stubGlobal('fetch', fetchMock)
    const onOpenChange = vi.fn()
    const { rerender } = render(dialogElement({ time: null, onOpenChange }))

    const dateInput = document.querySelector<HTMLInputElement>('input[name="date"]')
    expect(dateInput).not.toBeNull()
    fireEvent.change(dateInput!, { target: { value: '2099-05-06' } })
    expect(dateInput).toHaveValue('2099-05-06')
    await waitForOnePageBookingForm()
    await user.type(
      screen.getByPlaceholderText('店舗用メモがあれば記載してください'),
      '前回入力したメモ'
    )
    await user.selectOptions(screen.getByLabelText('予約ステータス'), '仮予約')

    rerender(dialogElement({ open: false, time: null, onOpenChange }))
    await act(async () => undefined)
    rerender(dialogElement({ open: true, time: null, onOpenChange }))

    await waitFor(() => {
      expect(document.querySelector<HTMLInputElement>('input[name="date"]')).toHaveValue(
        formatDateInJst(new Date())
      )
    })
    await waitForOnePageBookingForm()
    expect(screen.getByPlaceholderText('店舗用メモがあれば記載してください')).toHaveValue('')
    expect(screen.getByLabelText('予約ステータス')).toHaveValue('事前確認')
  })

  it('does not erase entered text when async catalog data arrives while open', async () => {
    const user = userEvent.setup()
    vi.stubGlobal('fetch', createFetchMock())
    const { rerender } = render(dialogElement())

    await waitForOnePageBookingForm()
    const notes = screen.getByPlaceholderText('店舗用メモがあれば記載してください')
    await user.type(notes, '入力途中のメモ')
    expect(notes).toHaveValue('入力途中のメモ')

    mocks.coursePrices = [
      ...mocks.coursePrices,
      {
        id: 'course-late',
        name: '遅れて届いたコース',
        duration: 90,
        price: 15_000,
        storeShare: 5_000,
        castShare: 10_000,
      },
    ]
    rerender(dialogElement())

    await waitFor(() =>
      expect(screen.getByPlaceholderText('店舗用メモがあれば記載してください')).toHaveValue(
        '入力途中のメモ'
      )
    )
  })

  it('keeps the dialog open after confirmation so the operator can review the booking', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    const fetchMock = createFetchMock()
    vi.stubGlobal('fetch', fetchMock)
    render(dialogElement({ onOpenChange }))

    await waitForOnePageBookingForm()
    await submitConfirmed(user)

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ method: 'POST' })
      )
    )
    expect(onOpenChange).not.toHaveBeenCalledWith(false)
    expect(screen.getByRole('heading', { name: '予約受付' })).toBeInTheDocument()
    expect(screen.getByText('予約を作成しました。内容を確認できます。')).toBeInTheDocument()
  })

  it('limits one-tap time choices to six 5-minute starts in the selected 30-minute window', async () => {
    vi.stubGlobal('fetch', createFetchMock())
    const slotStart = new Date('2099-01-02T01:00:00.000Z')
    render(
      <QuickBookingDialog
        open
        onOpenChange={vi.fn()}
        selectedStaff={selectedStaff}
        selectedTime={slotStart}
        selectedSlot={{
          startTime: slotStart,
          endTime: new Date('2099-01-02T06:00:00.000Z'),
        }}
        selectedCustomer={selectedCustomer}
        businessHours={businessHours}
      />
    )

    await waitForOnePageBookingForm()
    await waitFor(() =>
      expect(mocks.renderTimeSlotPicker).toHaveBeenCalledWith(
        expect.objectContaining({
          stepMinutes: 5,
          windowStart: slotStart,
          windowEnd: new Date(slotStart.getTime() + 30 * 60 * 1000),
        })
      )
    )
  })

  it('accepts hotel, room, and a selectable cast on the same page', async () => {
    vi.stubGlobal('fetch', createFetchMock())
    render(
      <QuickBookingDialog
        open
        onOpenChange={vi.fn()}
        selectedStaff={selectedStaff}
        staffOptions={[selectedStaff, { ...selectedStaff, id: 'cast-2', name: '別キャスト' }]}
        selectedTime={selectedTime}
        selectedSlot={null}
        selectedCustomer={selectedCustomer}
        businessHours={businessHours}
      />
    )

    await waitForOnePageBookingForm()
    expect(screen.getByLabelText('ホテル名')).toBeInTheDocument()
    expect(screen.getByLabelText('部屋番号')).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: '担当キャスト' })).toHaveTextContent(
      'テストキャスト'
    )
  })

  it('defaults returning customers to confirmed and first-time customers to preconfirmed', async () => {
    vi.stubGlobal(
      'fetch',
      createFetchMock([
        {
          id: 'past-1',
          startTime: '2099-01-01T03:00:00.000Z',
          staffName: 'テストキャスト',
          serviceName: 'テストコース',
        },
      ])
    )
    render(dialogElement())
    await waitForOnePageBookingForm()

    await waitFor(() => {
      expect(screen.getByLabelText('予約ステータス')).toHaveValue('確定済')
    })
  })

  it('closes after a created booking without asking to discard', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    vi.stubGlobal('fetch', createFetchMock())
    render(dialogElement({ onOpenChange }))

    await waitForOnePageBookingForm()
    await submitConfirmed(user)
    await waitFor(() =>
      expect(screen.getByText('予約を作成しました。内容を確認できます。')).toBeInTheDocument()
    )

    await user.click(screen.getByRole('button', { name: '閉じる' }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
    expect(screen.queryByText('入力内容を破棄しますか？')).not.toBeInTheDocument()
  })

  it('closes from the header X after a created booking without asking to discard', async () => {
    const user = userEvent.setup()
    const onOpenChange = vi.fn()
    vi.stubGlobal('fetch', createFetchMock())
    render(dialogElement({ onOpenChange }))

    await waitForOnePageBookingForm()
    await submitConfirmed(user)
    await waitFor(() =>
      expect(screen.getByText('予約を作成しました。内容を確認できます。')).toBeInTheDocument()
    )

    await user.click(screen.getByRole('button', { name: 'Close' }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
    expect(screen.queryByText('入力内容を破棄しますか？')).not.toBeInTheDocument()
  })

  it('lets the operator change course and payment after confirm and persist with PUT', async () => {
    const user = userEvent.setup()
    mocks.coursePrices = [
      ...mocks.coursePrices,
      {
        id: 'course-90',
        name: '90分コース',
        duration: 90,
        price: 18_000,
        storeShare: 6_000,
        castShare: 12_000,
      },
      {
        id: 'course-190',
        name: '190分コース',
        duration: 190,
        price: 32_000,
        storeShare: 12_000,
        castShare: 20_000,
      },
    ]
    const fetchMock = createFetchMock()
    mocks.checkAvailability
      .mockResolvedValueOnce({ available: true, conflicts: [] })
      .mockResolvedValueOnce({
        available: false,
        conflicts: [{ id: 'reservation-created' }],
      })
    vi.stubGlobal('fetch', fetchMock)
    render(dialogElement())

    await waitForOnePageBookingForm()
    await user.click(screen.getByRole('checkbox', { name: /アロマ追加/ }))
    const paymentMethod = screen.getByRole('combobox', { name: '支払い方法' })
    Object.assign(paymentMethod, {
      hasPointerCapture: () => false,
      setPointerCapture: () => undefined,
      releasePointerCapture: () => undefined,
    })
    await user.click(paymentMethod)
    await user.click(await screen.findByRole('option', { name: 'クレジットカード' }))
    const courseSelect = screen.getByRole('combobox', { name: 'コース1' })
    await user.selectOptions(courseSelect, 'course-90')
    expect(courseSelect).toHaveValue('course-90')
    expect(screen.getByText('18,000円')).toBeInTheDocument()
    await user.selectOptions(courseSelect, 'course-190')
    expect(screen.getByText('32,000円')).toBeInTheDocument()
    await submitConfirmed(user)

    await waitFor(() =>
      expect(screen.getByText('予約を作成しました。内容を確認できます。')).toBeInTheDocument()
    )
    await user.selectOptions(courseSelect, 'course-90')
    await user.click(screen.getByRole('button', { name: '予約を更新' }))

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ method: 'PUT' })
      )
    )
  })

  it('selects and persists a same-store reception staff member separately from the cast', async () => {
    const user = userEvent.setup()
    const fetchMock = createFetchMock()
    vi.stubGlobal('fetch', fetchMock)
    render(dialogElement())

    await waitForOnePageBookingForm()
    await user.selectOptions(screen.getByLabelText('受付担当者'), 'admin-2')
    await submitConfirmed(user)

    await waitFor(() =>
      expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'POST')).toBe(true)
    )

    expect(getPostedReservation(fetchMock)).toEqual(
      expect.objectContaining({ receptionStaffId: 'admin-2', castId: 'cast-1' })
    )
  })

  it('persists the booking panel store memo as the reservation store memo', async () => {
    const user = userEvent.setup()
    const fetchMock = createFetchMock()
    vi.stubGlobal('fetch', fetchMock)
    render(dialogElement())

    await waitForOnePageBookingForm()
    await user.type(
      screen.getByPlaceholderText('店舗用メモがあれば記載してください'),
      '電話受付時の共有事項'
    )
    await submitConfirmed(user)

    await waitFor(() =>
      expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'POST')).toBe(true)
    )
    expect(getPostedReservation(fetchMock)).toEqual(
      expect.objectContaining({
        storeMemo: '電話受付時の共有事項',
      })
    )
  })

  it('defaults the service location to 豊島区 and 池袋北口', async () => {
    vi.stubGlobal('fetch', createFetchMock())
    render(dialogElement())

    await waitForOnePageBookingForm()

    await waitFor(() =>
      expect(screen.getByRole('combobox', { name: '対応エリア' })).toHaveTextContent('豊島区')
    )
    expect(screen.getByRole('combobox', { name: '最寄り駅' })).toHaveTextContent(
      '池袋（北口・西口）'
    )
  })

  it('uses three course dropdowns and persists duplicate extensions in selection order', async () => {
    const user = userEvent.setup()
    mocks.coursePrices = [
      {
        id: 'course-190',
        name: '190分',
        duration: 190,
        price: 30_000,
        storeShare: 10_000,
        castShare: 20_000,
      },
      {
        id: 'course-extension-30',
        name: '30分延長',
        duration: 30,
        price: 5_000,
        storeShare: 2_000,
        castShare: 3_000,
      },
    ]
    const fetchMock = createFetchMock()
    vi.stubGlobal('fetch', fetchMock)
    render(dialogElement())

    await screen.findByText('料金内訳')
    await user.selectOptions(screen.getByRole('combobox', { name: 'コース1' }), 'course-190')
    await user.selectOptions(
      screen.getByRole('combobox', { name: 'コース2' }),
      'course-extension-30'
    )
    await user.selectOptions(
      screen.getByRole('combobox', { name: 'コース3' }),
      'course-extension-30'
    )
    await submitConfirmed(user)

    await waitFor(() => expect(getPostedReservation(fetchMock)).toBeDefined())
    expect(getPostedReservation(fetchMock)).toEqual(
      expect.objectContaining({
        courseId: 'course-190',
        courseIds: ['course-190', 'course-extension-30', 'course-extension-30'],
        endTime: '2099-01-02T07:10:00.000Z',
      })
    )
  })

  it('adds the configured credit-card fee to the visible total', async () => {
    const user = userEvent.setup()
    vi.stubGlobal('fetch', createFetchMock())
    render(dialogElement())

    await waitForOnePageBookingForm()
    const paymentMethod = screen.getByRole('combobox', { name: '支払い方法' })
    Object.assign(paymentMethod, {
      hasPointerCapture: () => false,
      setPointerCapture: () => undefined,
      releasePointerCapture: () => undefined,
    })
    await user.click(paymentMethod)
    await user.click(await screen.findByRole('option', { name: 'クレジットカード' }))

    expect(screen.getByText('クレジット手数料').parentElement).toHaveTextContent('1,000円')
    expect(screen.getByText('合計').parentElement).toHaveTextContent('11,000円')
  })
})
