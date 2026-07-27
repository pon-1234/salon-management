/**
 * @design_doc   Reservation list row and quick-action interaction contract
 * @related_to   ReservationList, ReservationListPage
 * @known_issues None
 */
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { ReservationData } from '@/lib/types/reservation'
import { ReservationList } from './reservation-list'

const createReservation = (id: string, status: string, customerName: string): ReservationData => ({
  id,
  customerId: `customer-${id}`,
  customerName,
  customerType: '通常',
  phoneNumber: '09000000000',
  points: 0,
  bookingStatus: status,
  status,
  staffConfirmation: '確認済み',
  customerConfirmation: '確認済み',
  prefecture: '東京都',
  district: '豊島区',
  location: '池袋',
  locationType: 'hotel',
  specificLocation: '池袋',
  staff: '確認キャスト',
  marketingChannel: '電話',
  date: '2026-07-20',
  time: '10:00',
  inOutTime: '10:00-12:00',
  course: '120分',
  freeExtension: 'なし',
  designation: 'none',
  designationFee: '0',
  options: {},
  transportationFee: 0,
  paymentMethod: '現金',
  discount: 'なし',
  additionalFee: 0,
  totalPayment: 20_000,
  storeRevenue: 10_000,
  staffRevenue: 10_000,
  staffBonusFee: 0,
  startTime: new Date('2026-07-20T10:00:00+09:00'),
  endTime: new Date('2026-07-20T12:00:00+09:00'),
  staffImage: '',
})

describe('ReservationList interactions', () => {
  const confirmed = createReservation('confirmed-reservation', 'confirmed', '確定顧客')
  const pending = createReservation('pending-reservation', 'pending', '仮予約顧客')

  it('opens a reservation when its row is clicked', () => {
    const onOpenReservation = vi.fn()

    render(<ReservationList reservations={[confirmed]} onOpenReservation={onOpenReservation} />)

    fireEvent.click(screen.getByText(/確定顧客/))

    expect(onOpenReservation).toHaveBeenCalledWith(confirmed)
  })

  it('runs the confirmed quick action without opening the row', () => {
    const onOpenReservation = vi.fn()
    const onMakeModifiable = vi.fn()

    render(
      <ReservationList
        reservations={[confirmed, pending]}
        onOpenReservation={onOpenReservation}
        onMakeModifiable={onMakeModifiable}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: '修正可能にする' }))

    expect(onMakeModifiable).toHaveBeenCalledWith(confirmed.id)
    expect(onOpenReservation).not.toHaveBeenCalled()
    expect(screen.getAllByRole('button', { name: '修正可能にする' })).toHaveLength(1)
  })

  it('hides an unavailable quick action and shows its loading state', () => {
    const { rerender } = render(<ReservationList reservations={[confirmed]} />)

    expect(screen.queryByRole('button', { name: '修正可能にする' })).not.toBeInTheDocument()

    rerender(
      <ReservationList
        reservations={[confirmed]}
        onMakeModifiable={vi.fn()}
        updatingReservationId={confirmed.id}
      />
    )

    expect(screen.getByRole('button', { name: '変更中…' })).toBeDisabled()
  })

  it('disables every quick action while one reservation is updating', () => {
    const secondConfirmed = createReservation('confirmed-second', 'confirmed', '確定顧客2')

    render(
      <ReservationList
        reservations={[confirmed, secondConfirmed]}
        onMakeModifiable={vi.fn()}
        updatingReservationId={confirmed.id}
      />
    )

    expect(screen.getByRole('button', { name: '変更中…' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '修正可能にする' })).toBeDisabled()
  })
})
