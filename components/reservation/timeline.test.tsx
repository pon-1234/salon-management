/**
 * @design_doc   Admin reservation timeline appointment-card visibility contract
 * @related_to   Timeline, Appointment, ReservationData
 * @known_issues None
 */
import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Appointment, Cast } from '@/lib/cast/types'
import type { ReservationData } from '@/lib/types/reservation'
import type { Customer } from '@/lib/customer/types'
import { Timeline } from './timeline'

vi.mock('./quick-booking-dialog', () => ({
  QuickBookingDialog: () => null,
}))

const staffDialogMock = vi.hoisted(() => vi.fn(() => null))

vi.mock('@/components/cast/cast-dialog', () => ({
  StaffDialog: staffDialogMock,
}))

const startTime = new Date('2030-07-21T18:30:00+09:00')
const endTime = new Date('2030-07-21T20:00:00+09:00')

const appointment: Appointment = {
  id: 'legacy-reservation-21804',
  customerId: 'legacy-customer-member-104168',
  serviceId: 'legacy-course-90',
  staffId: 'legacy-cast-1',
  serviceName: '旧90分コース',
  startTime,
  endTime,
  customerName: '[確認用] 旧顧客 #104168',
  customerPhone: '09000000000',
  customerEmail: '',
  reservationTime: '18:30-20:00',
  status: 'provisional',
  price: 18_000,
}

const reservation: ReservationData = {
  id: appointment.id,
  customerId: appointment.customerId,
  customerName: appointment.customerName,
  customerType: '通常',
  phoneNumber: appointment.customerPhone,
  points: 0,
  bookingStatus: appointment.status,
  status: appointment.status,
  staffConfirmation: '未確認',
  customerConfirmation: '未確認',
  prefecture: '東京都',
  district: '豊島区',
  location: '池袋',
  locationType: 'hotel',
  specificLocation: '池袋',
  staff: 'さら',
  staffId: appointment.staffId,
  storeId: 'uat-ikebukuro',
  marketingChannel: '電話',
  date: '2030-07-21',
  time: '18:30',
  inOutTime: appointment.reservationTime,
  course: appointment.serviceName,
  serviceId: appointment.serviceId,
  freeExtension: 'なし',
  designation: 'none',
  designationFee: '0',
  options: {},
  transportationFee: 0,
  paymentMethod: '現金',
  discount: 'なし',
  additionalFee: 0,
  totalPayment: appointment.price,
  storeRevenue: appointment.price,
  staffRevenue: 0,
  staffBonusFee: 0,
  startTime,
  endTime,
  staffImage: '',
}

const staff: (Cast & { appointments: Appointment[] })[] = [
  {
    id: appointment.staffId,
    createdAt: new Date('2030-01-01T00:00:00+09:00'),
    updatedAt: new Date('2030-01-01T00:00:00+09:00'),
    name: 'さら',
    nameKana: 'さら',
    age: 25,
    height: 160,
    bust: 'C',
    waist: 58,
    hip: 84,
    type: 'standard',
    image: '',
    images: [],
    description: '',
    netReservation: true,
    specialDesignationFee: null,
    regularDesignationFee: null,
    panelDesignationRank: 0,
    regularDesignationRank: 0,
    workStatus: '出勤',
    workStart: new Date('2030-07-21T11:00:00+09:00'),
    workEnd: new Date('2030-07-21T22:00:00+09:00'),
    appointments: [appointment],
    availableOptions: [],
  },
]

describe('Timeline appointment cards', () => {
  beforeEach(() => {
    staffDialogMock.mockClear()
  })

  it('keeps the time axis and horizontal scrollbar inside a viewport-height timeline', () => {
    render(
      <Timeline
        staff={staff}
        selectedDate={new Date('2030-07-21T00:00:00+09:00')}
        selectedCustomer={null}
        setSelectedAppointment={vi.fn()}
        reservations={[reservation]}
        businessHours={{
          startMinutes: 10 * 60,
          endMinutes: 24 * 60,
          startLabel: '10:00',
          endLabel: '24:00',
        }}
      />
    )

    expect(screen.getByTestId('reservation-timeline-scroll')).toHaveClass('h-[calc(100vh-14rem)]')
    expect(screen.getByTestId('timeline-time-header')).toHaveClass('sticky', 'top-0')
  })

  it('shows both operational ranks beside the cast name', () => {
    const rankedStaff = [
      {
        ...staff[0],
        regularDesignationRank: 2,
        panelDesignationRank: 3,
      },
    ]

    render(
      <Timeline
        staff={rankedStaff}
        selectedDate={new Date('2030-07-21T00:00:00+09:00')}
        selectedCustomer={null}
        setSelectedAppointment={vi.fn()}
        reservations={[reservation]}
        businessHours={{
          startMinutes: 10 * 60,
          endMinutes: 24 * 60,
          startLabel: '10:00',
          endLabel: '24:00',
        }}
      />
    )

    expect(screen.getByText('本指名 2位')).toBeInTheDocument()
    expect(screen.getByText('パネル 3位')).toBeInTheDocument()
  })

  it('passes the store option catalog to the selected cast detail', () => {
    const optionCatalog = [{ id: 'option-aroma', name: 'アロマ追加', price: 1_000, note: '確認用' }]

    render(
      <Timeline
        staff={staff}
        selectedDate={new Date('2030-07-21T00:00:00+09:00')}
        selectedCustomer={null}
        setSelectedAppointment={vi.fn()}
        reservations={[reservation]}
        optionCatalog={optionCatalog}
        businessHours={{
          startMinutes: 10 * 60,
          endMinutes: 24 * 60,
          startLabel: '10:00',
          endLabel: '24:00',
        }}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /さら/ }))

    expect(staffDialogMock).toHaveBeenLastCalledWith(
      expect.objectContaining({
        optionCatalog,
        staff: expect.objectContaining({ id: staff[0].id }),
      }),
      undefined
    )
  })

  it('keeps a legacy customer name readable and opens the matching reservation', () => {
    const setSelectedAppointment = vi.fn()

    render(
      <Timeline
        staff={staff}
        selectedDate={new Date('2030-07-21T00:00:00+09:00')}
        selectedCustomer={null}
        setSelectedAppointment={setSelectedAppointment}
        reservations={[reservation]}
        businessHours={{
          startMinutes: 10 * 60,
          endMinutes: 24 * 60,
          startLabel: '10:00',
          endLabel: '24:00',
        }}
      />
    )

    const appointmentButton = screen.getByRole('button', {
      name: /\[確認用\] 旧顧客 #104168/,
    })
    const customerName = within(appointmentButton).getByText(appointment.customerName)

    expect(appointmentButton).toHaveClass('overflow-hidden')
    expect(customerName).toHaveClass('shrink-0')
    expect(customerName).toHaveAttribute('title', appointment.customerName)
    expect(
      within(appointmentButton).getByText(appointment.serviceName, { exact: false })
    ).toBeVisible()

    fireEvent.click(appointmentButton)

    expect(setSelectedAppointment).toHaveBeenCalledWith(reservation)
  })

  it('preserves a midnight shift end and offers starts every 30 minutes', () => {
    const selectedCustomer = {
      id: 'customer-1',
      name: '確認顧客',
      ngCasts: [],
      ngCastIds: [],
    } as unknown as Customer
    const midnightStaff = [
      {
        ...staff[0],
        appointments: [],
        workStart: new Date('2030-07-21T14:00:00+09:00'),
        workEnd: new Date('2030-07-22T00:00:00+09:00'),
      },
    ]

    render(
      <Timeline
        staff={midnightStaff}
        selectedDate={new Date('2030-07-21T00:00:00+09:00')}
        selectedCustomer={selectedCustomer}
        setSelectedAppointment={vi.fn()}
        reservations={[]}
        businessHours={{
          startMinutes: 10 * 60,
          endMinutes: 24 * 60,
          startLabel: '10:00',
          endLabel: '24:00',
        }}
      />
    )

    expect(screen.getByRole('button', { name: '14:00' })).toBeVisible()
    expect(screen.getByRole('button', { name: '14:30' })).toBeVisible()
    expect(screen.getByRole('button', { name: '23:30' })).toBeVisible()
    expect(screen.queryByText('午前')).not.toBeInTheDocument()
    expect(screen.queryByText('午後')).not.toBeInTheDocument()
  })

  it('does not offer selectable starts for a past day', () => {
    const selectedCustomer = {
      id: 'customer-1',
      name: '確認顧客',
      ngCasts: [],
      ngCastIds: [],
    } as unknown as Customer
    const pastStaff = [
      {
        ...staff[0],
        appointments: [],
        workStart: new Date('2020-07-21T14:00:00+09:00'),
        workEnd: new Date('2020-07-21T22:00:00+09:00'),
      },
    ]

    render(
      <Timeline
        staff={pastStaff}
        selectedDate={new Date('2020-07-21T00:00:00+09:00')}
        selectedCustomer={selectedCustomer}
        setSelectedAppointment={vi.fn()}
        reservations={[]}
        businessHours={{
          startMinutes: 10 * 60,
          endMinutes: 24 * 60,
          startLabel: '10:00',
          endLabel: '24:00',
        }}
      />
    )

    expect(screen.queryByRole('button', { name: '14:00' })).not.toBeInTheDocument()
  })
})
