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

const quickBookingDialogMock = vi.hoisted(() =>
  vi.fn(({ open }: { open: boolean }) =>
    open ? <div data-testid="quick-booking-dialog">予約入力</div> : null
  )
)

vi.mock('./quick-booking-dialog', () => ({
  QuickBookingDialog: quickBookingDialogMock,
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
    quickBookingDialogMock.mockClear()
  })

  it('keeps the time axis and horizontal scrollbar inside a viewport-height timeline', () => {
    render(
      <Timeline
        canCreateReservation
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

    expect(screen.getByTestId('reservation-timeline-scroll')).toHaveClass(
      'absolute',
      'overflow-auto'
    )
    expect(screen.getByTestId('timeline-horizontal-scrollbar')).toHaveClass('absolute', 'bottom-0')
    expect(screen.getByTestId('timeline-time-header')).toHaveClass('sticky', 'top-0')
    expect(quickBookingDialogMock).toHaveBeenCalledWith(
      expect.objectContaining({
        selectedStaff: undefined,
      }),
      undefined
    )
  })

  it('keeps on-duty hours white and darkens the rest of the row', () => {
    const mixedStaff = [
      staff[0],
      {
        ...staff[0],
        id: 'off-duty-cast',
        name: '休みキャスト',
        workStart: undefined,
        workEnd: undefined,
        appointments: [],
      },
    ]

    render(
      <Timeline
        canCreateReservation
        staff={mixedStaff}
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

    expect(screen.getByRole('button', { name: /さら/ })).toHaveClass('bg-white')
    expect(screen.getByRole('button', { name: /休みキャスト/ })).toHaveClass('bg-slate-200')
  })

  it('shows the special designation fee rank next to the stage name instead of designation ranking', () => {
    const rankedStaff = [
      {
        ...staff[0],
        specialDesignationFee: 5_000,
        regularDesignationRank: 2,
        panelDesignationRank: 3,
      },
    ]

    render(
      <Timeline
        canCreateReservation
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

    const nameRow = screen.getByTestId('timeline-cast-name-さら')
    expect(nameRow).toHaveTextContent('さら')
    expect(nameRow).toHaveTextContent('特別指名 5,000円')
    expect(screen.queryByText('本指名 2位')).not.toBeInTheDocument()
    expect(screen.queryByText('パネル 3位')).not.toBeInTheDocument()
  })

  it('marks a cast with a special designation fee on the staff column', () => {
    const specialStaff = [
      {
        ...staff[0],
        specialDesignationFee: 5_000,
      },
    ]

    render(
      <Timeline
        canCreateReservation
        staff={specialStaff}
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

    expect(screen.getByTestId('timeline-cast-name-さら')).toHaveTextContent('特別指名 5,000円')
    expect(screen.getByLabelText('特別指名料 5,000円')).toBeInTheDocument()
  })

  it('does not mark a cast without a special designation fee', () => {
    render(
      <Timeline
        canCreateReservation
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

    expect(screen.queryByLabelText(/特別指名料/)).not.toBeInTheDocument()
  })

  it('passes the store option catalog to the selected cast detail', () => {
    const optionCatalog = [{ id: 'option-aroma', name: 'アロマ追加', price: 1_000, note: '確認用' }]

    render(
      <Timeline
        canCreateReservation
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
        canCreateReservation
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

  it('uses the reservation source of truth for the timeline status label', () => {
    render(
      <Timeline
        canCreateReservation
        staff={staff}
        selectedDate={new Date('2030-07-21T00:00:00+09:00')}
        selectedCustomer={null}
        setSelectedAppointment={vi.fn()}
        reservations={[
          {
            ...reservation,
            status: 'preconfirmed',
            bookingStatus: 'preconfirmed',
          },
        ]}
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
    expect(within(appointmentButton).getByText('事前確認')).toBeVisible()
    expect(within(appointmentButton).queryByText('仮予約')).not.toBeInTheDocument()
  })

  it('preserves a midnight shift end and offers starts through the final valid window', () => {
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
        canCreateReservation
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

    expect(screen.getByRole('button', { name: '14:00から予約' })).toBeVisible()
    expect(screen.getByRole('button', { name: '14:30から予約' })).toBeVisible()
    expect(screen.getByRole('button', { name: '23:30から予約' })).toBeVisible()
    expect(screen.queryByText('午前')).not.toBeInTheDocument()
    expect(screen.queryByText('午後')).not.toBeInTheDocument()
  })

  it('places each 30-minute booking circle on the same column as the header time label', () => {
    const selectedCustomer = {
      id: 'customer-1',
      name: '確認顧客',
      ngCasts: [],
      ngCastIds: [],
    } as unknown as Customer
    const eveningStaff = [
      {
        ...staff[0],
        appointments: [],
        workStart: new Date('2030-07-21T18:00:00+09:00'),
        workEnd: new Date('2030-07-21T22:30:00+09:00'),
      },
    ]

    render(
      <Timeline
        canCreateReservation
        staff={eveningStaff}
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

    expect(screen.getByRole('button', { name: '18:00から予約' })).toHaveStyle({
      left: '960px',
    })
    expect(screen.getByRole('button', { name: '18:30から予約' })).toHaveStyle({
      left: '1020px',
    })
    expect(screen.getByRole('button', { name: '22:00から予約' })).toHaveStyle({
      left: '1440px',
    })
  })

  it('offers booking circles only on 30-minute marks', () => {
    const selectedCustomer = {
      id: 'customer-1',
      name: '確認顧客',
      ngCasts: [],
      ngCastIds: [],
    } as unknown as Customer
    const workingStaff = [
      {
        ...staff[0],
        appointments: [],
        workStart: new Date('2030-07-21T14:00:00+09:00'),
        workEnd: new Date('2030-07-21T15:00:00+09:00'),
      },
    ]

    render(
      <Timeline
        canCreateReservation
        staff={workingStaff}
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

    expect(screen.getByRole('button', { name: '14:00から予約' })).toBeVisible()
    expect(screen.getByRole('button', { name: '14:30から予約' })).toBeVisible()
    expect(screen.queryByRole('button', { name: '14:05から予約' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '14:50から予約' })).not.toBeInTheDocument()
  })

  it('labels 30-minute marks on the time axis and does not start a booking from the header', () => {
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
        canCreateReservation
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

    const header = screen.getByTestId('timeline-time-header')
    expect(within(header).getByText('15:00')).toBeVisible()
    expect(within(header).getByText('15:30')).toBeVisible()
    expect(screen.queryByRole('button', { name: '15:00を予約開始に設定' })).not.toBeInTheDocument()

    fireEvent.click(within(header).getByText('15:00'))

    expect(quickBookingDialogMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ open: false }),
      undefined
    )
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
        canCreateReservation
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

    expect(screen.queryByRole('button', { name: '14:00から予約' })).not.toBeInTheDocument()
  })

  it('keeps existing reservations readable but disables empty-slot booking without create permission', () => {
    const selectedCustomer = {
      id: 'customer-1',
      name: '確認顧客',
      ngCasts: [],
      ngCastIds: [],
    } as unknown as Customer
    const setSelectedAppointment = vi.fn()
    const readOnlyStaff = [
      {
        ...staff[0],
        workStart: startTime,
        workEnd: endTime,
      },
      {
        ...staff[0],
        id: 'cast-available',
        name: '空きキャスト',
        appointments: [],
        workStart: new Date('2030-07-21T14:00:00+09:00'),
        workEnd: new Date('2030-07-21T15:00:00+09:00'),
      },
    ]

    render(
      <Timeline
        canCreateReservation={false}
        staff={readOnlyStaff}
        selectedDate={new Date('2030-07-21T00:00:00+09:00')}
        selectedCustomer={selectedCustomer}
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

    fireEvent.click(screen.getByRole('button', { name: /\[確認用\] 旧顧客 #104168/ }))
    expect(setSelectedAppointment).toHaveBeenCalledWith(reservation)
    expect(screen.getByRole('button', { name: '14:00から予約' })).toBeDisabled()
    fireEvent.click(screen.getByRole('button', { name: '14:00から予約' }))
    expect(screen.queryByTestId('quick-booking-dialog')).not.toBeInTheDocument()
    expect(quickBookingDialogMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ open: false }),
      undefined
    )
  })
})
