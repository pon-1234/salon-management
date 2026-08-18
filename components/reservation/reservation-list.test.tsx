/**
 * @design_doc   Reservation list row and quick-action interaction contract
 * @related_to   ReservationList, ReservationListPage
 * @known_issues None
 */
import { fireEvent, render, screen } from '@testing-library/react'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import type { ReservationData } from '@/lib/types/reservation'
import { ReservationList } from './reservation-list'

const source = readFileSync(join(__dirname, 'reservation-list.tsx'), 'utf8')

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

  it('opens confirmed reservations directly without the legacy modifiable-status step', () => {
    const onOpenReservation = vi.fn()

    render(
      <ReservationList reservations={[confirmed, pending]} onOpenReservation={onOpenReservation} />
    )

    fireEvent.click(screen.getByText(/確定顧客/))

    expect(onOpenReservation).toHaveBeenCalledWith(confirmed)
    expect(screen.queryByRole('button', { name: '修正可能にする' })).not.toBeInTheDocument()
    expect(source).not.toContain('onMakeModifiable')
  })

  it('uses Japanese column labels instead of English ops jargon', () => {
    render(<ReservationList reservations={[confirmed]} />)

    expect(screen.getByRole('columnheader', { name: '番号' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: '開始' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: '終了' })).toBeInTheDocument()
    expect(screen.queryByRole('columnheader', { name: 'NO.' })).not.toBeInTheDocument()
    expect(screen.queryByRole('columnheader', { name: 'IN' })).not.toBeInTheDocument()
    expect(screen.queryByRole('columnheader', { name: 'OUT' })).not.toBeInTheDocument()
  })

  it('shows an empty state when there are no reservations', () => {
    render(<ReservationList reservations={[]} />)

    expect(screen.getByText('この日の予約はありません。')).toBeInTheDocument()
  })
})
