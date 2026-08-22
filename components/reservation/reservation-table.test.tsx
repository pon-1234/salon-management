/**
 * @design_doc   Reservation table row numbering and explicit detail action contract
 * @related_to   ReservationTable, ReservationDialog
 * @known_issues None
 */
import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { ReservationData } from '@/lib/types/reservation'
import { ReservationTable } from './reservation-table'

vi.mock('@/components/ui/safe-image', () => ({
  SafeImage: ({ alt }: { alt: string }) => <span>{alt}</span>,
}))

vi.mock('./reservation-dialog', () => ({
  ReservationDialog: () => null,
}))

const reservation: ReservationData = {
  id: 'reservation-1',
  customerId: 'customer-1',
  customerName: '一覧顧客',
  customerType: '通常顧客',
  phoneNumber: '09011112222',
  points: 0,
  bookingStatus: '確定済',
  status: 'confirmed',
  staffConfirmation: '確認済',
  customerConfirmation: '確認済',
  prefecture: '東京都',
  district: '豊島区',
  location: '池袋',
  locationType: '店舗',
  specificLocation: '',
  staff: '担当キャスト',
  marketingChannel: '電話',
  date: '2026-08-14',
  time: '12:00',
  inOutTime: '12:00 - 13:00',
  course: '通常コース',
  freeExtension: '0',
  designation: 'なし',
  designationFee: '0円',
  options: {},
  transportationFee: 0,
  paymentMethod: '現金',
  discount: 'なし',
  additionalFee: 0,
  totalPayment: 20_000,
  storeRevenue: 10_000,
  staffRevenue: 10_000,
  staffBonusFee: 0,
  startTime: new Date('2026-08-14T12:00:00+09:00'),
  endTime: new Date('2026-08-14T13:00:00+09:00'),
  staffImage: '/cast.jpg',
}

describe('ReservationTable', () => {
  it('renders each sequential number exactly once', () => {
    render(<ReservationTable reservations={[reservation]} />)

    const row = screen.getByRole('row', { name: /一覧顧客/ })
    expect(within(row).getAllByRole('cell')[0]?.textContent).toBe('0001')
  })

  it('opens details from an explicit operation button exactly once', () => {
    const onOpenReservation = vi.fn()
    render(<ReservationTable reservations={[reservation]} onOpenReservation={onOpenReservation} />)

    fireEvent.click(screen.getByRole('button', { name: '予約詳細を開く' }))

    expect(onOpenReservation).toHaveBeenCalledTimes(1)
    expect(onOpenReservation).toHaveBeenCalledWith(reservation)
  })

  it('uses Japanese column labels for start, end, and cast', () => {
    render(<ReservationTable reservations={[reservation]} />)

    expect(screen.getByRole('columnheader', { name: '番号' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: '開始' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: '終了' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'キャスト' })).toBeInTheDocument()
    expect(screen.queryByRole('columnheader', { name: 'NO.' })).not.toBeInTheDocument()
    expect(screen.queryByRole('columnheader', { name: '女性' })).not.toBeInTheDocument()
  })
})
