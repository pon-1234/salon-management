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
  areas: [{ id: 'area-ikebukuro', name: '池袋エリア' }],
  stations: [
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

function createFetchMock() {
  return vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
    if (init?.method === 'POST') {
      return {
        ok: true,
        status: 201,
        json: async () => ({ id: 'reservation-created' }),
      } as Response
    }

    return {
      ok: true,
      status: 200,
      json: async () => ({ data: { marketingChannels: ['WEB', '電話'] } }),
    } as Response
  })
}

function dialogElement({
  open = true,
  time = selectedTime,
  onOpenChange = vi.fn(),
}: {
  open?: boolean
  time?: Date | null
  onOpenChange?: (open: boolean) => void
} = {}) {
  return (
    <QuickBookingDialog
      open={open}
      onOpenChange={onOpenChange}
      selectedStaff={selectedStaff}
      selectedTime={time ?? undefined}
      selectedSlot={null}
      selectedCustomer={selectedCustomer}
      businessHours={businessHours}
    />
  )
}

async function waitForOnePageBookingForm() {
  await waitFor(() => expect(screen.getAllByText(/テストコース 60分/)).not.toHaveLength(0))
  expect(await screen.findByText('オプション選択')).toBeInTheDocument()
  expect(await screen.findByText('料金内訳')).toBeInTheDocument()
}

function getPostedReservation(fetchMock: ReturnType<typeof createFetchMock>) {
  const postCall = fetchMock.mock.calls.find(([, init]) => init?.method === 'POST')
  expect(postCall).toBeDefined()
  return JSON.parse(String(postCall?.[1]?.body)) as Record<string, unknown>
}

describe('QuickBookingDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    Object.defineProperty(Element.prototype, 'scrollIntoView', {
      configurable: true,
      value: vi.fn(),
    })
    mocks.coursePrices = mocks.coursePrices.slice(0, 1)
    mocks.checkAvailability.mockResolvedValue({ available: true, conflicts: [] })
    mocks.getDesignationFees.mockResolvedValue([])
  })

  afterEach(() => {
    cleanup()
    Reflect.deleteProperty(Element.prototype, 'scrollIntoView')
    vi.unstubAllGlobals()
  })

  it('uses the reservation受付 name and hides dispatch-related fields', async () => {
    vi.stubGlobal('fetch', createFetchMock())
    render(dialogElement())

    expect(await screen.findByRole('heading', { name: '予約受付' })).toBeInTheDocument()
    expect(screen.queryByText('出張エリア・待ち合わせ場所')).not.toBeInTheDocument()
    expect(screen.queryByText('エリア')).not.toBeInTheDocument()
    expect(screen.queryByText('待ち合わせ駅')).not.toBeInTheDocument()
    expect(screen.queryByText('現地情報メモ')).not.toBeInTheDocument()
  })

  it('shows every booking section together without step navigation and keeps submit visible', async () => {
    vi.stubGlobal('fetch', createFetchMock())
    render(dialogElement())

    await waitForOnePageBookingForm()

    expect(screen.getByText('お客様情報')).toBeInTheDocument()
    expect(screen.getByText('サービス詳細')).toBeInTheDocument()
    expect(screen.getByText('コース選択')).toBeInTheDocument()
    expect(screen.getByText('指名設定')).toBeInTheDocument()
    expect(screen.getByText('支払い・受付情報')).toBeInTheDocument()
    expect(screen.getByText('料金内訳')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '次へ' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '戻る' })).not.toBeInTheDocument()

    const submit = screen.getByRole('button', { name: '予約を確定' })
    const stickyFooter = screen.getByTestId('quick-booking-sticky-footer')
    expect(stickyFooter).toHaveClass('sticky', 'bottom-0')
    expect(stickyFooter).toContainElement(submit)
  })

  it('offers only 30-minute start boundaries and rejects an off-boundary manual time', async () => {
    const fetchMock = createFetchMock()
    vi.stubGlobal('fetch', fetchMock)
    render(dialogElement())

    await waitForOnePageBookingForm()
    await waitFor(() =>
      expect(mocks.renderTimeSlotPicker).toHaveBeenCalledWith(
        expect.objectContaining({ stepMinutes: 30 })
      )
    )

    const timeInput = document.querySelector<HTMLInputElement>('input[name="time"]')
    expect(timeInput).not.toBeNull()
    expect(timeInput).toHaveAttribute('step', '1800')

    fireEvent.change(timeInput!, { target: { value: '12:10' } })
    fireEvent.click(screen.getByRole('button', { name: '予約を確定' }))

    await waitFor(() =>
      expect(mocks.toast).toHaveBeenCalledWith({
        title: '開始時間は30分単位で入力してください',
        description: '開始時間の分は00分または30分を指定してください。',
        variant: 'destructive',
      })
    )
    expect(mocks.checkAvailability).not.toHaveBeenCalled()
    expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'POST')).toBe(false)
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

  it('posts confirmed status, real option IDs, and no implicit dispatch charge', async () => {
    const user = userEvent.setup()
    const fetchMock = createFetchMock()
    vi.stubGlobal('fetch', fetchMock)
    render(dialogElement())

    await waitForOnePageBookingForm()
    await user.click(screen.getByRole('checkbox', { name: /アロマ追加/ }))
    expect(screen.queryByText('交通費（円）')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '予約を確定' }))

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
        areaId: null,
        stationId: null,
        locationMemo: '',
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
    const provisionalSwitch = screen.getByRole('switch', { name: '仮予約として保存' })
    expect(provisionalSwitch).not.toBeChecked()
    await user.click(provisionalSwitch)
    await user.click(screen.getByRole('button', { name: '仮予約として保存' }))

    await waitFor(() =>
      expect(fetchMock).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ method: 'POST' })
      )
    )
    expect(getPostedReservation(fetchMock)).toEqual(expect.objectContaining({ status: 'pending' }))
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
    await user.click(screen.getByRole('button', { name: '予約を確定' }))

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
    await user.click(screen.getByRole('switch', { name: '仮予約として保存' }))

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
    expect(screen.getByRole('switch', { name: '仮予約として保存' })).not.toBeChecked()
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
})
