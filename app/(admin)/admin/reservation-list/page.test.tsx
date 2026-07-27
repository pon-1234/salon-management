/**
 * @design_doc   Admin reservation-list interaction and persistence boundary contract
 * @related_to   ReservationListPage, ReservationList, ReservationDialog, ReservationRepositoryImpl
 * @known_issues None
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { addDays, format, startOfDay } from 'date-fns'
import { ja } from 'date-fns/locale'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Reservation, ReservationUpdatePayload } from '@/lib/types/reservation'
import ReservationListPage from './page'

const repositoryMocks = vi.hoisted(() => ({
  getAll: vi.fn(),
  update: vi.fn(),
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
    getAll = repositoryMocks.getAll
    update = repositoryMocks.update
  },
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
          {reservation.status === 'confirmed' ? (
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
}: {
  id?: string
  customerName?: string
  startTime?: Date
} = {}): Reservation => {
  const normalizedStart = new Date(startTime)
  normalizedStart.setHours(10, 0, 0, 0)
  const endTime = new Date(normalizedStart)
  endTime.setHours(12, 0, 0, 0)

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
    status: 'confirmed',
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
    repositoryMocks.getAll.mockResolvedValue([confirmedReservation])
    repositoryMocks.update.mockImplementation(
      async (_reservationId: string, update: Partial<Reservation>) => ({
        ...confirmedReservation,
        ...update,
        staffId: update.castId ?? confirmedReservation.staffId,
      })
    )
  })

  it('persists the confirmed reservation as modifiable from the quick action', async () => {
    render(<ReservationListPage />)

    fireEvent.click(await screen.findByRole('button', { name: '修正可能にする' }))

    await waitFor(() => {
      expect(repositoryMocks.update).toHaveBeenCalledWith(
        confirmedReservation.id,
        expect.objectContaining({ status: 'modifiable' })
      )
    })
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

  it('switches the displayed reservations with a weekly date shortcut', async () => {
    const tomorrow = addDays(startOfDay(new Date()), 1)
    const tomorrowReservation = createReservation({
      id: 'reservation-tomorrow',
      customerName: '翌日顧客',
      startTime: tomorrow,
    })
    repositoryMocks.getAll.mockResolvedValue([confirmedReservation, tomorrowReservation])

    render(<ReservationListPage />)

    expect(await screen.findByText('当日顧客')).toBeInTheDocument()
    expect(screen.queryByText('翌日顧客')).not.toBeInTheDocument()

    const tomorrowLabel = format(tomorrow, 'M/d(E)', { locale: ja })
    const tomorrowShortcut = screen
      .getAllByRole('button')
      .find((button) => button.textContent?.includes(tomorrowLabel))
    expect(tomorrowShortcut).toBeDefined()
    fireEvent.click(tomorrowShortcut!)

    expect(await screen.findByText('翌日顧客')).toBeInTheDocument()
    expect(screen.queryByText('当日顧客')).not.toBeInTheDocument()
  })

  it('fetches the reservation list again from the reload button', async () => {
    render(<ReservationListPage />)

    const reloadButton = await screen.findByRole('button', { name: '再読込' })
    await waitFor(() => expect(repositoryMocks.getAll).toHaveBeenCalledTimes(1))

    fireEvent.click(reloadButton)

    await waitFor(() => expect(repositoryMocks.getAll).toHaveBeenCalledTimes(2))
  })
})
