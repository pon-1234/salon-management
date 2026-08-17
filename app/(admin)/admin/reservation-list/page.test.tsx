/**
 * @design_doc   Admin reservation-list interaction and persistence boundary contract
 * @related_to   ReservationListPage, ReservationList, ReservationDialog, ReservationRepositoryImpl
 * @known_issues None
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { addDays } from 'date-fns'
import { formatInTimeZone, zonedTimeToUtc } from 'date-fns-tz'
import { ja } from 'date-fns/locale'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Reservation, ReservationUpdatePayload } from '@/lib/types/reservation'
import ReservationListPage from './page'

const JST_TIMEZONE = 'Asia/Tokyo'

Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
  configurable: true,
  value: vi.fn(),
})

const repositoryMocks = vi.hoisted(() => ({
  update: vi.fn(),
}))

const reservationDataMocks = vi.hoisted(() => ({
  getAllReservations: vi.fn(),
}))

const childComponentState = vi.hoisted(() => ({
  dialogSavePayload: null as unknown,
}))

vi.mock('@/components/header', () => ({
  Header: () => <div data-testid="header" />,
}))

vi.mock('@/contexts/store-context', () => ({
  useStore: () => ({
    currentStore: { id: 'ikebukuro' },
  }),
}))

vi.mock('next-auth/react', () => ({
  useSession: () => ({
    data: {
      user: {
        id: 'manager-1',
        role: 'admin',
        permissions: ['reservation:read', 'reservation:update'],
      },
    },
  }),
}))

vi.mock('@/hooks/use-toast', () => ({
  toast: vi.fn(),
}))

vi.mock('@/lib/reservation/repository-impl', () => ({
  ReservationRepositoryImpl: class {
    update = repositoryMocks.update
  },
}))

vi.mock('@/lib/reservation/data', () => ({
  getAllReservations: reservationDataMocks.getAllReservations,
}))

vi.mock('@/components/reservation/reservation-list', () => ({
  ReservationList: ({
    reservations,
    onOpenReservation,
    onMakeModifiable,
  }: {
    reservations: Array<{ id: string; customerName: string; status?: string }>
    onOpenReservation?: (reservation: unknown) => void
    onMakeModifiable?: (reservationId: string) => void
  }) => (
    <div data-testid="reservation-list">
      {reservations.map((reservation) => (
        <div key={reservation.id}>
          <span>{reservation.customerName}</span>
          <button type="button" onClick={() => onOpenReservation?.(reservation)}>
            {reservation.customerName}の予約を開く
          </button>
          {reservation.status === 'confirmed' && onMakeModifiable ? (
            <button type="button" onClick={() => onMakeModifiable?.(reservation.id)}>
              修正可能にする
            </button>
          ) : null}
        </div>
      ))}
    </div>
  ),
}))

vi.mock('@/components/reservation/reservation-dialog', () => ({
  ReservationDialog: ({
    open,
    reservation,
    onSave,
  }: {
    open: boolean
    reservation: { id: string } | null
    onSave?: (reservationId: string, payload: unknown) => Promise<void> | void
  }) => {
    if (!open || !reservation) {
      return null
    }

    return (
      <button
        type="button"
        onClick={() => {
          void onSave?.(reservation.id, childComponentState.dialogSavePayload)
        }}
      >
        全項目を保存
      </button>
    )
  },
}))

const createReservation = ({
  id = 'reservation-confirmed',
  customerName = '当日顧客',
  startTime = new Date(),
  status = 'confirmed',
}: {
  id?: string
  customerName?: string
  startTime?: Date
  status?: Reservation['status']
} = {}): Reservation => {
  const dateKey = formatInTimeZone(startTime, JST_TIMEZONE, 'yyyy-MM-dd')
  const normalizedStart = zonedTimeToUtc(`${dateKey}T10:00:00`, JST_TIMEZONE)
  const endTime = new Date(normalizedStart.getTime() + 2 * 60 * 60 * 1000)

  return {
    id,
    customerId: `customer-${id}`,
    customerName,
    staffId: 'cast-current',
    castId: 'cast-current',
    staffName: '現在キャスト',
    serviceId: 'course-current',
    serviceName: '現在コース',
    startTime: normalizedStart,
    endTime,
    status,
    price: 20_000,
    storeId: 'ikebukuro',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  }
}

describe('ReservationListPage interactions', () => {
  let confirmedReservation: Reservation

  beforeEach(() => {
    vi.clearAllMocks()
    childComponentState.dialogSavePayload = null
    confirmedReservation = createReservation()
    reservationDataMocks.getAllReservations.mockResolvedValue([confirmedReservation])
    repositoryMocks.update.mockImplementation(
      async (_reservationId: string, update: Partial<Reservation>) => ({
        ...confirmedReservation,
        ...update,
        staffId: update.castId ?? confirmedReservation.staffId,
      })
    )
  })

  it('requests the selected JST day instead of a global reservation page', async () => {
    render(<ReservationListPage />)

    const selectedDateKey = formatInTimeZone(new Date(), JST_TIMEZONE, 'yyyy-MM-dd')
    const rangeStart = zonedTimeToUtc(`${selectedDateKey}T00:00:00`, JST_TIMEZONE)
    const rangeEnd = addDays(rangeStart, 1)

    await waitFor(() => {
      expect(reservationDataMocks.getAllReservations).toHaveBeenCalledWith(
        expect.objectContaining({
          startDate: rangeStart.toISOString(),
          endDate: rangeEnd.toISOString(),
          storeId: 'ikebukuro',
          status: 'active',
        })
      )
    })
  })

  it('excludes cancelled reservations by default and exposes them in cancellation history', async () => {
    const cancelledReservation = createReservation({
      id: 'reservation-cancelled',
      customerName: 'キャンセル顧客',
      status: 'cancelled',
    })
    reservationDataMocks.getAllReservations.mockResolvedValue([
      confirmedReservation,
      cancelledReservation,
    ])

    render(<ReservationListPage />)

    expect(await screen.findByText('当日顧客')).toBeInTheDocument()
    expect(screen.queryByText('キャンセル顧客')).not.toBeInTheDocument()
    expect(screen.getByText('総件数').parentElement).toHaveTextContent('1')

    fireEvent.click(screen.getByRole('combobox'))
    fireEvent.click(await screen.findByRole('option', { name: 'キャンセル履歴' }))

    expect(await screen.findByText('キャンセル顧客')).toBeInTheDocument()
    expect(screen.queryByText('当日顧客')).not.toBeInTheDocument()
    await waitFor(() => {
      expect(reservationDataMocks.getAllReservations).toHaveBeenLastCalledWith(
        expect.objectContaining({ status: 'cancelled' })
      )
    })
  })

  it('requests every adjusting status from the API for the adjusting filter', async () => {
    render(<ReservationListPage />)

    expect(await screen.findByText('当日顧客')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('combobox'))
    fireEvent.click(await screen.findByRole('option', { name: '調整中' }))

    await waitFor(() => {
      expect(reservationDataMocks.getAllReservations).toHaveBeenLastCalledWith(
        expect.objectContaining({ status: 'adjusting' })
      )
    })
  })

  it('opens a confirmed reservation directly without requiring a status mutation', async () => {
    render(<ReservationListPage />)

    expect(await screen.findByText('当日顧客')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '修正可能にする' })).not.toBeInTheDocument()

    fireEvent.click(
      screen.getByRole('button', {
        name: `${confirmedReservation.customerName}の予約を開く`,
      })
    )

    expect(await screen.findByRole('button', { name: '全項目を保存' })).toBeInTheDocument()
    expect(repositoryMocks.update).not.toHaveBeenCalled()
  })

  it('removes a cancelled reservation immediately and closes its dialog', async () => {
    childComponentState.dialogSavePayload = {
      status: 'cancelled',
      cancellationSource: 'store',
      cancellationReason: 'お客様都合',
    }

    render(<ReservationListPage />)

    fireEvent.click(
      await screen.findByRole('button', {
        name: `${confirmedReservation.customerName}の予約を開く`,
      })
    )
    fireEvent.click(await screen.findByRole('button', { name: '全項目を保存' }))

    await waitFor(() => {
      expect(screen.queryByText('当日顧客')).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: '全項目を保存' })).not.toBeInTheDocument()
    })
    expect(repositoryMocks.update).toHaveBeenCalledWith(
      confirmedReservation.id,
      expect.objectContaining({
        status: 'cancelled',
        cancellationReason: 'お客様都合',
      })
    )
  })

  it('forwards every editable dialog field to the reservation repository', async () => {
    const changedStart = new Date(confirmedReservation.startTime)
    changedStart.setHours(14, 0, 0, 0)
    const changedEnd = new Date(confirmedReservation.startTime)
    changedEnd.setHours(16, 30, 0, 0)
    const completePayload: ReservationUpdatePayload = {
      castId: 'cast-changed',
      courseId: 'course-changed',
      startTime: changedStart,
      endTime: changedEnd,
      status: 'cancelled',
      cancellationSource: 'store',
      cancellationReason: '日時変更のため',
      notes: '変更後の詳細メモ',
      storeMemo: '変更後の店舗メモ',
      price: 31_000,
      designationType: 'regular',
      designationFee: 3_000,
      transportationFee: 2_000,
      additionalFee: 1_000,
      discountAmount: 500,
      welfareExpense: 2_500,
      storeRevenue: 18_000,
      staffRevenue: 10_500,
      paymentMethod: 'クレジットカード',
      marketingChannel: '電話',
      areaId: 'area-changed',
      stationId: 'station-changed',
      hotelName: '変更後ホテル',
      roomNumber: '1203',
      locationMemo: '変更後の訪問先メモ',
      options: ['option-a', 'option-b'],
    }
    childComponentState.dialogSavePayload = completePayload

    render(<ReservationListPage />)

    fireEvent.click(
      await screen.findByRole('button', {
        name: `${confirmedReservation.customerName}の予約を開く`,
      })
    )
    fireEvent.click(await screen.findByRole('button', { name: '全項目を保存' }))

    await waitFor(() => {
      expect(repositoryMocks.update).toHaveBeenCalledWith(
        confirmedReservation.id,
        expect.objectContaining({
          courseId: completePayload.courseId,
          cancellationSource: completePayload.cancellationSource,
          discountAmount: completePayload.discountAmount,
          welfareExpense: completePayload.welfareExpense,
          storeRevenue: completePayload.storeRevenue,
          staffRevenue: completePayload.staffRevenue,
          hotelName: completePayload.hotelName,
          roomNumber: completePayload.roomNumber,
          options: completePayload.options,
        })
      )
    })
  })

  it('shows weekly shortcut counts from the whole week before a day is selected', async () => {
    const todayKey = formatInTimeZone(new Date(), JST_TIMEZONE, 'yyyy-MM-dd')
    const todayStart = zonedTimeToUtc(`${todayKey}T00:00:00`, JST_TIMEZONE)
    const laterDay = addDays(todayStart, 3)
    const laterReservations = [
      createReservation({
        id: 'reservation-later-1',
        customerName: '後日顧客1',
        startTime: laterDay,
      }),
      createReservation({
        id: 'reservation-later-2',
        customerName: '後日顧客2',
        startTime: laterDay,
      }),
    ]
    const reservations = [confirmedReservation, ...laterReservations]
    reservationDataMocks.getAllReservations.mockImplementation(async (params) => {
      const rangeStart = params?.startDate
        ? new Date(params.startDate).getTime()
        : Number.NEGATIVE_INFINITY
      const rangeEnd = params?.endDate
        ? new Date(params.endDate).getTime()
        : Number.POSITIVE_INFINITY
      return reservations.filter((reservation) => {
        const start = reservation.startTime.getTime()
        return start >= rangeStart && start < rangeEnd
      })
    })

    render(<ReservationListPage />)

    expect(await screen.findByText('当日顧客')).toBeInTheDocument()
    const laterLabel = formatInTimeZone(laterDay, JST_TIMEZONE, 'M/d(E)', { locale: ja })
    const laterShortcut = screen
      .getAllByRole('button')
      .find((button) => button.textContent?.includes(laterLabel))
    expect(laterShortcut).toHaveTextContent('2人')
    expect(laterShortcut).toHaveTextContent('2件')
    expect(screen.queryByText('後日顧客1')).not.toBeInTheDocument()

    fireEvent.click(laterShortcut!)

    expect(await screen.findByText('後日顧客1')).toBeInTheDocument()
    expect(screen.getByText('後日顧客2')).toBeInTheDocument()
    expect(screen.queryByText('当日顧客')).not.toBeInTheDocument()

    const todayLabel = formatInTimeZone(todayStart, JST_TIMEZONE, 'M/d(E)', { locale: ja })
    const todayShortcut = screen
      .getAllByRole('button')
      .find((button) => button.textContent?.includes(todayLabel))
    expect(todayShortcut).toHaveTextContent('1人')
    expect(todayShortcut).toHaveTextContent('1件')
    expect(laterShortcut).toHaveTextContent('2人')
    expect(laterShortcut).toHaveTextContent('2件')
  })

  it('switches the displayed reservations with a weekly date shortcut', async () => {
    const todayKey = formatInTimeZone(new Date(), JST_TIMEZONE, 'yyyy-MM-dd')
    const todayStart = zonedTimeToUtc(`${todayKey}T00:00:00`, JST_TIMEZONE)
    const tomorrow = addDays(todayStart, 1)
    const tomorrowReservation = createReservation({
      id: 'reservation-tomorrow',
      customerName: '翌日顧客',
      startTime: tomorrow,
    })
    reservationDataMocks.getAllReservations.mockResolvedValue([
      confirmedReservation,
      tomorrowReservation,
    ])

    render(<ReservationListPage />)

    expect(await screen.findByText('当日顧客')).toBeInTheDocument()
    expect(screen.queryByText('翌日顧客')).not.toBeInTheDocument()

    const tomorrowLabel = formatInTimeZone(tomorrow, JST_TIMEZONE, 'M/d(E)', { locale: ja })
    const tomorrowShortcut = screen
      .getAllByRole('button')
      .find((button) => button.textContent?.includes(tomorrowLabel))
    expect(tomorrowShortcut).toBeDefined()
    fireEvent.click(tomorrowShortcut!)

    expect(await screen.findByText('翌日顧客')).toBeInTheDocument()
    expect(screen.queryByText('当日顧客')).not.toBeInTheDocument()

    const tomorrowEnd = addDays(tomorrow, 1)
    expect(reservationDataMocks.getAllReservations).toHaveBeenLastCalledWith(
      expect.objectContaining({
        startDate: tomorrow.toISOString(),
        endDate: tomorrowEnd.toISOString(),
      })
    )
  })

  it('fetches the reservation list again from the reload button', async () => {
    render(<ReservationListPage />)

    const reloadButton = await screen.findByRole('button', { name: '再読込' })
    await waitFor(() =>
      expect(reservationDataMocks.getAllReservations.mock.calls.length).toBeGreaterThanOrEqual(2)
    )
    const callsAfterLoad = reservationDataMocks.getAllReservations.mock.calls.length

    fireEvent.click(reloadButton)

    await waitFor(() =>
      expect(reservationDataMocks.getAllReservations.mock.calls.length).toBe(callsAfterLoad + 2)
    )
  })
})
