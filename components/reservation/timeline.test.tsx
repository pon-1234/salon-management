/**
 * @design_doc   Admin reservation timeline appointment-card visibility contract
 * @related_to   Timeline, Appointment, ReservationData
 * @known_issues None
 */
import { fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Appointment, Cast } from '@/lib/cast/types'
import type { ReservationData } from '@/lib/types/reservation'
import type { Customer } from '@/lib/customer/types'
import { TIMELINE_HOUR_WIDTH_PX } from '@/lib/reservation/booking-slot-window'
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

  afterEach(() => {
    vi.useRealTimers()
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

    expect(screen.getByTestId('reservation-timeline')).toHaveClass(
      'flex',
      'min-h-0',
      'flex-1',
      'overflow-hidden'
    )
    expect(screen.getByTestId('reservation-timeline-viewport')).toHaveClass('min-h-0', 'flex-1')
    expect(screen.getByTestId('reservation-timeline-viewport')).not.toHaveClass('min-h-[28rem]')
    expect(screen.getByTestId('reservation-timeline-scroll')).toHaveClass('overflow-y-auto')
    expect(screen.getByTestId('timeline-horizontal-scrollbar')).toHaveClass('overflow-x-scroll')
    expect(screen.getByTestId('reservation-timeline-scroll')).not.toContainElement(
      screen.getByTestId('timeline-time-header')
    )
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

  it('shows the special designation fee below the stage name instead of designation ranking', () => {
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
    expect(nameRow).toHaveTextContent('特別指名料 5,000円')
    expect(nameRow).toHaveClass('flex-col', 'items-start')
    expect(nameRow).not.toHaveClass('items-center')
    expect(within(nameRow).getByText('さら')).toHaveClass('w-full')
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

    expect(screen.getByTestId('timeline-cast-name-さら')).toHaveTextContent('特別指名料 5,000円')
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
    const customerName = within(appointmentButton).getByText(`${appointment.customerName} 様`)

    expect(appointmentButton).toHaveClass('overflow-hidden')
    expect(customerName).toHaveClass('shrink-0')
    expect(customerName).toHaveAttribute('title', `${appointment.customerName} 様`)
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
      left: `${8 * TIMELINE_HOUR_WIDTH_PX}px`,
    })
    expect(screen.getByRole('button', { name: '18:30から予約' })).toHaveStyle({
      left: `${8.5 * TIMELINE_HOUR_WIDTH_PX}px`,
    })
    expect(screen.getByRole('button', { name: '22:00から予約' })).toHaveStyle({
      left: `${12 * TIMELINE_HOUR_WIDTH_PX}px`,
    })

    const bookingCircleButton = screen.getByRole('button', { name: '18:00から予約' })
    expect(bookingCircleButton).toHaveClass('justify-center')
    expect(bookingCircleButton).not.toHaveClass('justify-start')
    const bookingCircle = bookingCircleButton.querySelector('span')
    expect(bookingCircle).not.toHaveClass('ml-0.5')
    expect(bookingCircle).toBeEmptyDOMElement()
    expect(bookingCircle).toHaveAttribute('aria-hidden', 'true')
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

  it('does not draw a current-time center line over reservation cards', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2030-07-21T15:15:00+09:00'))

    try {
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

      expect(document.querySelector('.bg-red-500')).not.toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
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
    const startButtons = screen.getAllByRole('button', { name: '14:00から予約' })
    expect(startButtons.length).toBeGreaterThan(0)
    startButtons.forEach((button) => expect(button).toBeDisabled())
    fireEvent.click(startButtons[0])
    expect(screen.queryByTestId('quick-booking-dialog')).not.toBeInTheDocument()
    expect(quickBookingDialogMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ open: false }),
      undefined
    )
  })

  it('shows name, in/out, course, hotel, and status even on a 60-minute card', () => {
    const hourAppointment = {
      ...appointment,
      startTime: new Date('2030-07-21T18:00:00+09:00'),
      endTime: new Date('2030-07-21T19:00:00+09:00'),
      reservationTime: '18:00-19:00',
    }
    const hourReservation = {
      ...reservation,
      hotelName: '池袋ホテル',
      roomNumber: '1203',
      course: hourAppointment.serviceName,
      totalPayment: 21_000,
      courseItems: [
        {
          id: 'legacy-course-90',
          name: '旧90分コース',
          duration: 90,
          price: 18_000,
          sortOrder: 0,
        },
      ],
    }

    render(
      <Timeline
        canCreateReservation
        staff={[{ ...staff[0], appointments: [hourAppointment] }]}
        selectedDate={new Date('2030-07-21T00:00:00+09:00')}
        selectedCustomer={null}
        setSelectedAppointment={vi.fn()}
        reservations={[hourReservation]}
        businessHours={{
          startMinutes: 10 * 60,
          endMinutes: 24 * 60,
          startLabel: '10:00',
          endLabel: '24:00',
        }}
      />
    )

    const card = screen.getByRole('button', { name: /旧顧客 #104168 様 18:00-19:00/ })
    expect(card).toHaveClass('flex-row')
    expect(card).toHaveStyle({ width: `${TIMELINE_HOUR_WIDTH_PX}px` })
    expect(within(card).getByTestId('timeline-appointment-in')).toHaveTextContent('18:00')
    expect(within(card).getByTestId('timeline-appointment-out')).toHaveTextContent('19:00')
    expect(card).toHaveTextContent('様')
    expect(card).toHaveTextContent('旧90分コース')
    expect(card).toHaveTextContent('池袋ホテル')
    expect(card).toHaveTextContent('1203')
    expect(card).toHaveTextContent('仮予約')
    expect(card).toHaveTextContent('旧90分コース（18,000円）')
    expect(
      Array.from(card.querySelectorAll('[data-timeline-field]')).map((element) =>
        element.getAttribute('data-timeline-field')
      )
    ).toEqual(['time', 'status', 'course', 'customer', 'hotel'])
  })

  it('keeps a reservation visible when it starts before store opening', () => {
    const earlyAppointment = {
      ...appointment,
      startTime: new Date('2030-07-21T08:00:00+09:00'),
      endTime: new Date('2030-07-21T09:30:00+09:00'),
    }

    render(
      <Timeline
        canCreateReservation
        staff={[{ ...staff[0], appointments: [earlyAppointment] }]}
        selectedDate={new Date('2030-07-21T00:00:00+09:00')}
        selectedCustomer={null}
        setSelectedAppointment={vi.fn()}
        reservations={[{ ...reservation, id: earlyAppointment.id }]}
        businessHours={{
          startMinutes: 10 * 60,
          endMinutes: 23 * 60,
          startLabel: '10:00',
          endLabel: '23:00',
        }}
      />
    )

    expect(
      screen.getByRole('button', { name: /旧顧客 #104168 様 08:00-09:30/ })
    ).toBeInTheDocument()
  })

  it('shows time labels and booking circles when a cast clocks in before store opening', () => {
    const selectedCustomer = {
      id: 'customer-1',
      name: '確認顧客',
      ngCasts: [],
      ngCastIds: [],
    } as unknown as Customer

    render(
      <Timeline
        canCreateReservation
        staff={[
          {
            ...staff[0],
            appointments: [],
            workStart: new Date('2030-07-21T08:00:00+09:00'),
            workEnd: new Date('2030-07-21T16:30:00+09:00'),
          },
        ]}
        selectedDate={new Date('2030-07-21T00:00:00+09:00')}
        selectedCustomer={selectedCustomer}
        setSelectedAppointment={vi.fn()}
        reservations={[]}
        businessHours={{
          startMinutes: 10 * 60,
          endMinutes: 23 * 60,
          startLabel: '10:00',
          endLabel: '23:00',
        }}
      />
    )

    expect(screen.getByTestId('timeline-time-header')).toHaveTextContent('08:00')
    expect(screen.getByTestId('timeline-time-header').parentElement).toHaveClass('sticky', 'top-0')
    expect(screen.getByRole('button', { name: '08:00から予約' })).toBeVisible()
    expect(screen.queryByRole('button', { name: '07:30から予約' })).not.toBeInTheDocument()
  })

  it('shows booking circles through midnight when a cast works until 24:00', () => {
    const selectedCustomer = {
      id: 'customer-1',
      name: '確認顧客',
      ngCasts: [],
      ngCastIds: [],
    } as unknown as Customer

    render(
      <Timeline
        canCreateReservation
        staff={[
          {
            ...staff[0],
            name: 'まりな',
            appointments: [],
            workStart: new Date('2030-07-21T19:00:00+09:00'),
            workEnd: new Date('2030-07-22T00:00:00+09:00'),
          },
        ]}
        selectedDate={new Date('2030-07-21T00:00:00+09:00')}
        selectedCustomer={selectedCustomer}
        setSelectedAppointment={vi.fn()}
        reservations={[]}
        businessHours={{
          startMinutes: 10 * 60,
          endMinutes: 23 * 60,
          startLabel: '10:00',
          endLabel: '23:00',
        }}
      />
    )

    expect(screen.getByTestId('timeline-time-header')).toHaveTextContent('23:30')
    expect(screen.getByRole('button', { name: '23:30から予約' })).toBeVisible()
  })

  it('marks the current time as a bookable circle', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2030-07-21T14:07:00+09:00'))
    const selectedCustomer = {
      id: 'customer-1',
      name: '確認顧客',
      ngCasts: [],
      ngCastIds: [],
    } as unknown as Customer

    render(
      <Timeline
        canCreateReservation
        staff={[{ ...staff[0], appointments: [] }]}
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

    expect(screen.getByRole('button', { name: '14:10から予約' })).toHaveAttribute(
      'data-current-time',
      'true'
    )
  })
})
