/**
 * @design_doc   Admin reservation timeline and appointment-card interaction contract
 * @related_to   ReservationPageContent, QuickBookingDialog, Appointment
 * @known_issues None
 */
'use client'

import { useState, useMemo, useCallback, useRef } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { QuickBookingDialog } from './quick-booking-dialog'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Clock, User, AlertCircle } from 'lucide-react'
import { Cast, Appointment } from '@/lib/cast/types'
import { logError } from '@/lib/error-utils'
import { StaffDialog, type StaffOptionCatalogEntry } from '@/components/cast/cast-dialog'
import { formatInTimeZone, zonedTimeToUtc } from 'date-fns-tz'
import { differenceInCalendarDays, differenceInMinutes, parse } from 'date-fns'
import { getCourseById } from '@/lib/course-option/utils'
import { Customer } from '@/lib/customer/types'
import { ReservationData } from '@/lib/types/reservation'
import {
  BusinessHoursRange,
  formatMinutesAsLabel,
  minutesToIsoInJst,
} from '@/lib/settings/business-hours'
import { getReservationStatusLabel } from '@/lib/reservation/status-display'
import {
  TIMELINE_BOOKING_INTERVAL_MINUTES,
  TIMELINE_HOUR_WIDTH_PX,
  QUICK_BOOKING_STEP_MINUTES,
  buildHalfHourBookingStarts,
  ceilToInterval,
  mergeNowBookingStart,
  resolveTimelineDisplayRange,
} from '@/lib/reservation/booking-slot-window'

const JST_TIMEZONE = 'Asia/Tokyo'
const MINUTES_IN_DAY = 24 * 60
const TIMELINE_INTERVAL_MINUTES = TIMELINE_BOOKING_INTERVAL_MINUTES
const MIN_BOOKING_DURATION_MINUTES = 10
const MIN_DISPLAY_SLOT_MINUTES = 10
const CAST_COLUMN_WIDTH = 176
const CAST_ROW_HEIGHT_CLASS = 'h-24'
const TIME_HEADER_HEIGHT_CLASS = 'h-8'

function normalizeCastWorkHours(
  member: Cast,
  selectedDateKey: string,
  minutesToUtcDate: (minutes: number) => Date
): { workStart?: Date; workEnd?: Date } {
  if (!member.workStart || !member.workEnd) {
    return { workStart: undefined, workEnd: undefined }
  }

  let workStart = member.workStart
  let workEnd = member.workEnd
  const sourceStartDateKey = formatInTimeZone(workStart, JST_TIMEZONE, 'yyyy-MM-dd')

  if (sourceStartDateKey !== selectedDateKey) {
    const sourceEndDateKey = formatInTimeZone(workEnd, JST_TIMEZONE, 'yyyy-MM-dd')
    const startMinute =
      Number(formatInTimeZone(workStart, JST_TIMEZONE, 'HH')) * 60 +
      Number(formatInTimeZone(workStart, JST_TIMEZONE, 'mm'))
    const endMinuteOfDay =
      Number(formatInTimeZone(workEnd, JST_TIMEZONE, 'HH')) * 60 +
      Number(formatInTimeZone(workEnd, JST_TIMEZONE, 'mm'))
    const crossesMidnight = sourceEndDateKey > sourceStartDateKey || endMinuteOfDay <= startMinute

    workStart = minutesToUtcDate(startMinute)
    workEnd = minutesToUtcDate(endMinuteOfDay + (crossesMidnight ? MINUTES_IN_DAY : 0))
  }

  return { workStart, workEnd }
}

const snapToStep = (minute: number) => ceilToInterval(minute, QUICK_BOOKING_STEP_MINUTES)

// safeMapを安全に実装（undefinedやnullでも空配列を返す）
function safeMap<T, U>(arr: T[] | undefined | null, callback: (item: T, index: number) => U): U[] {
  return Array.isArray(arr) ? arr.map(callback) : []
}

interface TimelineProps {
  staff: (Cast & { appointments: Appointment[] })[] | undefined
  selectedDate: Date
  selectedCustomer: Customer | null
  setSelectedAppointment: (reservation: ReservationData) => void
  reservations: ReservationData[]
  onReservationCreated?: (reservationId?: string) => void
  businessHours: BusinessHoursRange
  optionCatalog?: StaffOptionCatalogEntry[]
  canCreateReservation: boolean
  onScheduleSaved?: () => void
}

interface AvailableSlot {
  startTime: Date
  endTime: Date
  duration: number
  staffId: string
  staffName: string
}

export function Timeline({
  staff,
  selectedDate,
  selectedCustomer,
  setSelectedAppointment,
  reservations,
  onReservationCreated,
  businessHours,
  optionCatalog = [],
  canCreateReservation,
  onScheduleSaved,
}: TimelineProps) {
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null)
  const pendingCreatedReservationIdRef = useRef<string | undefined>(undefined)
  const [selectedStaff, setSelectedStaff] = useState<Cast | null>(null)
  const [zoomLevel, setZoomLevel] = useState(1)
  const timelineBodyRef = useRef<HTMLDivElement>(null)
  const timelineHeaderRef = useRef<HTMLDivElement>(null)
  const timelineCastScrollRef = useRef<HTMLDivElement>(null)
  const timelineHScrollRef = useRef<HTMLDivElement>(null)
  const syncingScrollRef = useRef(false)
  const HOUR_WIDTH = TIMELINE_HOUR_WIDTH_PX * zoomLevel
  const selectedDateKey = formatInTimeZone(selectedDate, JST_TIMEZONE, 'yyyy-MM-dd')
  const reservationsById = useMemo(
    () => new Map(reservations.map((reservation) => [reservation.id, reservation])),
    [reservations]
  )

  const getMinutesFromDate = useCallback(
    (date: Date) => {
      const dateKey = formatInTimeZone(date, JST_TIMEZONE, 'yyyy-MM-dd')
      const baseDate = parse(selectedDateKey, 'yyyy-MM-dd', new Date())
      const targetDate = parse(dateKey, 'yyyy-MM-dd', new Date())
      const dayDiff = differenceInCalendarDays(targetDate, baseDate)
      const minutesOfDay =
        Number(formatInTimeZone(date, JST_TIMEZONE, 'HH')) * 60 +
        Number(formatInTimeZone(date, JST_TIMEZONE, 'mm'))
      return dayDiff * MINUTES_IN_DAY + minutesOfDay
    },
    [selectedDateKey]
  )

  const minutesToUtcDate = useCallback(
    (minutes: number) =>
      new Date(zonedTimeToUtc(minutesToIsoInJst(selectedDateKey, minutes), JST_TIMEZONE)),
    [selectedDateKey]
  )

  const now = new Date()
  const todayKey = formatInTimeZone(now, JST_TIMEZONE, 'yyyy-MM-dd')
  const isSelectedDateToday = todayKey === selectedDateKey
  const isSelectedDatePast = selectedDateKey < todayKey
  const nowMinutes = isSelectedDateToday ? getMinutesFromDate(now) : null
  const appointmentRanges = safeMap(staff, (member) =>
    safeMap(member.appointments, (appointment) => {
      const startKey = formatInTimeZone(appointment.startTime, JST_TIMEZONE, 'yyyy-MM-dd')
      const endKey = formatInTimeZone(appointment.endTime, JST_TIMEZONE, 'yyyy-MM-dd')
      const overlapsSelectedDay =
        startKey === selectedDateKey ||
        endKey === selectedDateKey ||
        (startKey < selectedDateKey && endKey > selectedDateKey)
      return overlapsSelectedDay
        ? {
            startMinutes: getMinutesFromDate(appointment.startTime),
            endMinutes: getMinutesFromDate(appointment.endTime),
          }
        : null
    }).filter((range): range is { startMinutes: number; endMinutes: number } => range !== null)
  ).flat()
  const workRanges = safeMap(staff, (member) => {
    const hours = normalizeCastWorkHours(member, selectedDateKey, minutesToUtcDate)
    if (!hours.workStart || !hours.workEnd) {
      return null
    }
    return {
      startMinutes: getMinutesFromDate(hours.workStart),
      endMinutes: getMinutesFromDate(hours.workEnd),
    }
  }).filter((range): range is { startMinutes: number; endMinutes: number } => range !== null)
  const displayRange = resolveTimelineDisplayRange(
    { startMinutes: businessHours.startMinutes, endMinutes: businessHours.endMinutes },
    [...appointmentRanges, ...workRanges],
    nowMinutes
  )
  const startMinutes = displayRange.startMinutes
  const endMinutes = displayRange.endMinutes
  const totalMinutes = endMinutes - startMinutes
  const hourSegments = Math.ceil(totalMinutes / 60)

  const getTimeBlockStyle = useCallback(
    (startTime: Date, endTime: Date) => {
      const startMinute = getMinutesFromDate(startTime)
      const endMinute = getMinutesFromDate(endTime)
      const relativeStart = startMinute - startMinutes
      const blockMinutes = Math.max(endMinute - startMinute, 0)
      const left = (relativeStart / 60) * HOUR_WIDTH
      const width = (blockMinutes / 60) * HOUR_WIDTH
      return { left: `${left}px`, width: `${width}px` }
    },
    [getMinutesFromDate, startMinutes, HOUR_WIDTH]
  )

  const buildSelectableStartTimes = useCallback(
    (slot: AvailableSlot): Date[] => {
      const startMinute = getMinutesFromDate(slot.startTime)
      const endMinute = getMinutesFromDate(slot.endTime)

      if (endMinute - startMinute < MIN_BOOKING_DURATION_MINUTES) {
        return []
      }

      const candidates = mergeNowBookingStart(
        buildHalfHourBookingStarts(startMinute, endMinute, MIN_BOOKING_DURATION_MINUTES),
        nowMinutes,
        startMinute,
        endMinute,
        MIN_BOOKING_DURATION_MINUTES,
        QUICK_BOOKING_STEP_MINUTES
      )
      const filteredMinutes =
        nowMinutes !== null ? candidates.filter((minute) => minute >= nowMinutes) : candidates

      return filteredMinutes.map(minutesToUtcDate)
    },
    [getMinutesFromDate, minutesToUtcDate, nowMinutes]
  )

  if (!staff) {
    return (
      <div className="flex h-64 items-center justify-center text-gray-500">
        <div className="text-center">
          <AlertCircle className="mx-auto mb-2 h-12 w-12 text-gray-400" />
          <p>キャスト情報を読み込んでいます...</p>
        </div>
      </div>
    )
  }

  if (staff.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-gray-500">
        <div className="text-center">
          <AlertCircle className="mx-auto mb-2 h-12 w-12 text-gray-400" />
          <p>本日出勤予定のキャストはいません。</p>
        </div>
      </div>
    )
  }

  const handleAppointmentClick = (appointment: Appointment) => {
    const reservationData = reservations.find((entry) => entry.id === appointment.id)
    if (reservationData) {
      setSelectedAppointment(reservationData)
    }
  }

  const filteredStaff = safeMap(staff, (member) => {
    const filteredAppointments = safeMap(member.appointments, (app) => {
      const startKey = formatInTimeZone(app.startTime, JST_TIMEZONE, 'yyyy-MM-dd')
      const endKey = formatInTimeZone(app.endTime, JST_TIMEZONE, 'yyyy-MM-dd')
      const overlapsSelectedDay =
        startKey === selectedDateKey ||
        endKey === selectedDateKey ||
        (startKey < selectedDateKey && endKey > selectedDateKey)
      return overlapsSelectedDay ? app : null
    }).filter((app): app is Appointment => app !== null)

    const hours = normalizeCastWorkHours(member, selectedDateKey, minutesToUtcDate)

    return {
      ...member,
      appointments: filteredAppointments,
      workStart: hours.workStart,
      workEnd: hours.workEnd,
    }
  }).filter((member) => {
    // Filter out NG casts if a customer is selected
    if (selectedCustomer) {
      // Check both ngCasts and ngCastIds for backward compatibility
      const ngCastIds =
        selectedCustomer.ngCasts?.map((ng) => ng.castId) || selectedCustomer.ngCastIds || []
      return !ngCastIds.includes(member.id)
    }
    return true
  })

  const getAvailableSlots = (staff: Cast): AvailableSlot[] => {
    try {
      if (isSelectedDatePast || !staff.workStart || !staff.workEnd) return []

      const windowStartMinute = getMinutesFromDate(staff.workStart)
      const windowEndMinute = getMinutesFromDate(staff.workEnd)
      const timeLimitMinute = nowMinutes

      if (windowEndMinute <= windowStartMinute) {
        return []
      }

      const slots: AvailableSlot[] = []
      const sortedAppointments = safeMap(staff.appointments, (app) => app).sort(
        (a, b) => a.startTime.getTime() - b.startTime.getTime()
      )

      let currentMinute = windowStartMinute

      if (timeLimitMinute !== null) {
        currentMinute = Math.max(currentMinute, timeLimitMinute)
      }

      currentMinute = snapToStep(currentMinute)

      if (currentMinute >= windowEndMinute) {
        return []
      }

      for (const appointment of sortedAppointments) {
        const appointmentStartMinute = getMinutesFromDate(appointment.startTime)
        const appointmentEndMinute = getMinutesFromDate(appointment.endTime)

        if (appointmentEndMinute <= currentMinute) {
          continue
        }

        const gapEndMinute = Math.min(appointmentStartMinute, windowEndMinute)
        if (gapEndMinute - currentMinute >= MIN_DISPLAY_SLOT_MINUTES) {
          slots.push({
            startTime: minutesToUtcDate(currentMinute),
            endTime: minutesToUtcDate(gapEndMinute),
            duration: gapEndMinute - currentMinute,
            staffId: staff.id,
            staffName: staff.name,
          })
        }

        currentMinute = Math.max(currentMinute, appointmentEndMinute)
        if (timeLimitMinute !== null) {
          currentMinute = Math.max(currentMinute, timeLimitMinute)
        }
        currentMinute = snapToStep(currentMinute)

        if (currentMinute >= windowEndMinute) {
          break
        }
      }

      if (windowEndMinute - currentMinute >= MIN_DISPLAY_SLOT_MINUTES) {
        slots.push({
          startTime: minutesToUtcDate(currentMinute),
          endTime: minutesToUtcDate(windowEndMinute),
          duration: windowEndMinute - currentMinute,
          staffId: staff.id,
          staffName: staff.name,
        })
      }

      return slots
    } catch (error) {
      logError(error, `getAvailableSlots for staff ${staff.id}`)
      return []
    }
  }

  const handleTimeSlotClick = (slot: AvailableSlot, selectedTime: Date) => {
    if (!canCreateReservation) {
      return
    }

    const effectiveDuration = Math.max(
      differenceInMinutes(slot.endTime, selectedTime),
      MIN_BOOKING_DURATION_MINUTES
    )
    setSelectedSlot({
      ...slot,
      startTime: selectedTime,
      duration: effectiveDuration,
    })
  }

  const gridWidth = hourSegments * HOUR_WIDTH
  const halfHourSegments = hourSegments * 2

  const syncHorizontalScroll = (source: 'header' | 'body' | 'bar') => {
    if (syncingScrollRef.current) return
    const header = timelineHeaderRef.current
    const body = timelineBodyRef.current
    const bar = timelineHScrollRef.current
    const left =
      source === 'header'
        ? (header?.scrollLeft ?? 0)
        : source === 'body'
          ? (body?.scrollLeft ?? 0)
          : (bar?.scrollLeft ?? 0)
    syncingScrollRef.current = true
    if (header && source !== 'header') header.scrollLeft = left
    if (body && source !== 'body') body.scrollLeft = left
    if (bar && source !== 'bar') bar.scrollLeft = left
    syncingScrollRef.current = false
  }

  const syncVerticalScroll = (source: 'cast' | 'grid') => {
    if (syncingScrollRef.current) return
    const castPane = timelineCastScrollRef.current
    const gridPane = timelineBodyRef.current
    const top = source === 'cast' ? (castPane?.scrollTop ?? 0) : (gridPane?.scrollTop ?? 0)
    syncingScrollRef.current = true
    if (castPane && source !== 'cast') castPane.scrollTop = top
    if (gridPane && source !== 'grid') gridPane.scrollTop = top
    syncingScrollRef.current = false
  }

  const timeLabels = Array.from({ length: halfHourSegments }).map((_, index) => {
    const minute = startMinutes + index * TIMELINE_INTERVAL_MINUTES
    return (
      <div
        key={index}
        className="flex items-center justify-center border-r text-[11px] font-medium text-gray-700"
        style={{ width: `${HOUR_WIDTH / 2}px` }}
      >
        {formatMinutesAsLabel(minute)}
      </div>
    )
  })

  const castRows = safeMap(filteredStaff, (member) => (
    <button
      key={member.id}
      className={cn(
        `flex ${CAST_ROW_HEIGHT_CLASS} w-full items-center gap-2 overflow-hidden border-b px-2 py-1 transition-colors`,
        member.workStart && member.workEnd
          ? 'bg-white hover:bg-gray-50'
          : 'bg-slate-200 hover:bg-slate-300'
      )}
      onClick={() => setSelectedStaff(member)}
    >
      <Avatar className="h-7 w-7">
        <AvatarImage src={member.image} alt={member.name} />
        <AvatarFallback>{member.name.slice(0, 2)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1 text-left">
        <div
          data-testid={`timeline-cast-name-${member.name}`}
          className="flex min-w-0 flex-col items-start"
        >
          <span className="w-full truncate text-sm font-medium leading-4">{member.name}</span>
          {member.specialDesignationFee != null && member.specialDesignationFee > 0 ? (
            <Badge
              className="mt-0.5 h-3.5 max-w-full shrink-0 px-1 text-[9px] leading-none"
              variant="outline"
              aria-label={`特別指名料 ${member.specialDesignationFee.toLocaleString('ja-JP')}円`}
            >
              特別指名料 {member.specialDesignationFee.toLocaleString('ja-JP')}円
            </Badge>
          ) : null}
        </div>
        {member.workStart && member.workEnd ? (
          <div className="flex h-3 items-center gap-1 text-[10px] leading-3 text-gray-600">
            <Clock className="h-2.5 w-2.5" />
            {formatInTimeZone(member.workStart, JST_TIMEZONE, 'HH:mm')}
            {' - '}
            {formatInTimeZone(member.workEnd, JST_TIMEZONE, 'HH:mm')}
          </div>
        ) : (
          <Badge variant="secondary" className="h-4 px-1 text-[10px]">
            休み
          </Badge>
        )}
      </div>
    </button>
  ))

  return (
    <div
      data-testid="reservation-timeline"
      className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-gray-50"
    >
      <div className="flex shrink-0 items-center justify-end gap-1 border-b bg-white px-2 py-1">
        <Button
          variant={zoomLevel === 0.75 ? 'default' : 'outline'}
          size="sm"
          className="h-6 px-2 text-[11px]"
          onClick={() => setZoomLevel(0.75)}
        >
          75%
        </Button>
        <Button
          variant={zoomLevel === 1 ? 'default' : 'outline'}
          size="sm"
          className="h-6 px-2 text-[11px]"
          onClick={() => setZoomLevel(1)}
        >
          100%
        </Button>
        <Button
          variant={zoomLevel === 1.25 ? 'default' : 'outline'}
          size="sm"
          className="h-6 px-2 text-[11px]"
          onClick={() => setZoomLevel(1.25)}
        >
          125%
        </Button>
      </div>

      <div data-testid="reservation-timeline-viewport" className="relative min-h-0 w-full flex-1">
        <div
          className="absolute inset-x-0 top-0 grid"
          style={{
            bottom: '1rem',
            gridTemplateColumns: `${CAST_COLUMN_WIDTH}px minmax(0, 1fr)`,
            gridTemplateRows: '2rem minmax(0, 1fr)',
          }}
        >
          <div
            className={`z-30 flex ${TIME_HEADER_HEIGHT_CLASS} items-center border-b border-r bg-gray-50 px-2`}
          >
            <User className="mr-1 h-3.5 w-3.5 text-gray-600" />
            <span className="text-xs font-medium">キャスト</span>
          </div>
          <div
            ref={timelineHeaderRef}
            className="sticky top-0 z-30 overflow-x-auto overflow-y-hidden bg-gray-50 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            onScroll={() => syncHorizontalScroll('header')}
          >
            <div
              data-testid="timeline-time-header"
              className={`flex ${TIME_HEADER_HEIGHT_CLASS} border-b bg-gray-50`}
              style={{ width: `${gridWidth}px` }}
            >
              {timeLabels}
            </div>
          </div>
          <div
            ref={timelineCastScrollRef}
            className="overflow-y-auto overflow-x-hidden border-r bg-white [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            onScroll={() => syncVerticalScroll('cast')}
          >
            {castRows}
          </div>
          <div
            ref={timelineBodyRef}
            data-testid="reservation-timeline-scroll"
            className="overflow-x-auto overflow-y-auto"
            onScroll={() => {
              syncHorizontalScroll('body')
              syncVerticalScroll('grid')
            }}
          >
            {safeMap(filteredStaff, (member) => (
              <div
                key={member.id}
                className={cn(
                  `relative ${CAST_ROW_HEIGHT_CLASS} border-b`,
                  member.workStart && member.workEnd ? 'bg-slate-200' : 'bg-slate-300'
                )}
                style={{ width: `${gridWidth}px` }}
              >
                {member.workStart && member.workEnd && (
                  <div
                    className="absolute top-0 h-full bg-white"
                    style={getTimeBlockStyle(member.workStart, member.workEnd)}
                  />
                )}

                {safeMap(member.appointments, (appointment) => {
                  const sourceReservation = reservationsById.get(appointment.id)
                  const rawStatus = sourceReservation?.status ?? appointment.status
                  const displayStatus = rawStatus === 'provisional' ? 'pending' : rawStatus
                  const statusLabel = getReservationStatusLabel(
                    displayStatus,
                    sourceReservation?.marketingChannel
                  )
                  const isTentative = displayStatus === 'pending' || displayStatus === 'tentative'
                  const startLabel = formatInTimeZone(appointment.startTime, JST_TIMEZONE, 'HH:mm')
                  const endLabel = formatInTimeZone(appointment.endTime, JST_TIMEZONE, 'HH:mm')
                  const serviceName =
                    appointment.serviceName ||
                    (appointment.serviceId ? getCourseById(appointment.serviceId)?.name : '')
                  const courseItems = sourceReservation?.courseItems ?? []
                  const courseName =
                    courseItems.length > 0
                      ? courseItems.map((item) => item.name).join(' + ')
                      : sourceReservation?.course || serviceName || 'コース未設定'
                  const courseAmount =
                    courseItems.length > 0
                      ? courseItems.reduce((sum, item) => sum + item.price, 0)
                      : Number(sourceReservation?.totalPayment ?? appointment.price ?? 0)
                  const courseLabel = `${courseName}（${courseAmount.toLocaleString('ja-JP')}円）`
                  const hotelLabel = [sourceReservation?.hotelName, sourceReservation?.roomNumber]
                    .filter(Boolean)
                    .join(' ')

                  return (
                    <button
                      key={appointment.id}
                      type="button"
                      aria-label={`${appointment.customerName} 様 ${startLabel}-${endLabel}`}
                      className={cn(
                        'absolute top-1 cursor-pointer overflow-hidden rounded-md text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md',
                        'flex flex-row items-stretch gap-0.5 px-0.5 py-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-1',
                        isTentative && 'border-2 border-orange-300 bg-orange-100',
                        displayStatus === 'modifiable' && 'border-2 border-amber-400 bg-amber-50',
                        displayStatus === 'preconfirmed' && 'border-2 border-sky-400 bg-sky-50',
                        displayStatus === 'completed' && 'border-2 border-slate-300 bg-slate-100',
                        displayStatus === 'confirmed' && 'border-2 border-emerald-400 bg-white'
                      )}
                      style={{
                        ...getTimeBlockStyle(appointment.startTime, appointment.endTime),
                        height: 'calc(100% - 8px)',
                      }}
                      onClick={() => handleAppointmentClick(appointment)}
                    >
                      <div
                        data-timeline-field="time"
                        className="flex shrink-0 flex-col justify-center border-r border-black/10 pr-1 text-[10px] font-semibold leading-3 text-gray-800"
                      >
                        <span data-testid="timeline-appointment-in">{startLabel}</span>
                        <span data-testid="timeline-appointment-out">{endLabel}</span>
                      </div>
                      <div className="flex min-w-0 flex-1 flex-col justify-center gap-px">
                        <div className="flex min-w-0 items-center gap-1">
                          <Badge
                            data-timeline-field="status"
                            variant={isTentative ? 'secondary' : 'default'}
                            className={cn(
                              'h-4 shrink-0 px-1 py-0 text-[9px] leading-none',
                              isTentative && 'bg-orange-500 text-white',
                              displayStatus === 'modifiable' && 'bg-amber-600 text-white',
                              displayStatus === 'preconfirmed' && 'bg-sky-600 text-white',
                              displayStatus === 'completed' && 'bg-slate-600 text-white',
                              displayStatus === 'confirmed' && 'bg-emerald-600 text-white'
                            )}
                          >
                            {statusLabel}
                          </Badge>
                          {(appointment.designationType === 'special' ||
                            appointment.designationType === '特別指名') && (
                            <Badge
                              className="h-4 min-w-0 shrink truncate border border-slate-300 bg-slate-200 px-1 py-0 text-[9px] leading-none text-slate-800"
                              aria-label="特別指名"
                            >
                              特別指名
                            </Badge>
                          )}
                        </div>
                        <div
                          data-timeline-field="course"
                          className="w-full min-w-0 truncate text-[10px] font-medium leading-3 text-gray-800"
                          title={courseLabel}
                        >
                          {courseLabel}
                        </div>
                        <div
                          data-timeline-field="customer"
                          className="w-full min-w-0 shrink-0 truncate text-[11px] font-semibold leading-4 text-gray-900"
                          title={`${appointment.customerName} 様`}
                        >
                          {appointment.customerName} 様
                        </div>
                        <div
                          data-timeline-field="hotel"
                          className="w-full min-w-0 truncate text-[10px] leading-3 text-gray-500"
                          title={hotelLabel || 'ホテル・部屋番号 未設定'}
                        >
                          {hotelLabel || 'ホテル・部屋番号 未設定'}
                        </div>
                      </div>
                    </button>
                  )
                })}

                {safeMap(getAvailableSlots(member), (slot, index) => {
                  if (slot.duration < MIN_BOOKING_DURATION_MINUTES) return null
                  const selectableTimes = buildSelectableStartTimes(slot)
                  const disabled = !selectedCustomer || !canCreateReservation

                  return (
                    <div key={`${member.id}-${index}`}>
                      <div
                        data-testid="timeline-available-slot"
                        className="pointer-events-none absolute top-1 h-[calc(100%-8px)] rounded-md border border-emerald-200 bg-emerald-50/60"
                        style={getTimeBlockStyle(slot.startTime, slot.endTime)}
                      />
                      {selectableTimes.map((startTime) => {
                        const label = formatInTimeZone(startTime, JST_TIMEZONE, 'HH:mm')
                        const startMinute = getMinutesFromDate(startTime)
                        const snappedNow =
                          nowMinutes !== null
                            ? ceilToInterval(nowMinutes, QUICK_BOOKING_STEP_MINUTES)
                            : null
                        const isNowCircle = snappedNow !== null && startMinute === snappedNow
                        const circleEnd = minutesToUtcDate(startMinute + TIMELINE_INTERVAL_MINUTES)

                        return (
                          <Button
                            key={startTime.toISOString()}
                            type="button"
                            size="sm"
                            variant="ghost"
                            className={cn(
                              'absolute top-1 z-10 flex h-[calc(100%-8px)] items-center justify-center rounded-none border-0 p-0 hover:bg-transparent',
                              disabled && 'cursor-not-allowed opacity-60'
                            )}
                            style={getTimeBlockStyle(startTime, circleEnd)}
                            aria-label={`${label}から予約`}
                            title={`${label}から予約`}
                            data-current-time={isNowCircle ? 'true' : undefined}
                            onClick={() => handleTimeSlotClick(slot, startTime)}
                            disabled={disabled}
                          >
                            <span
                              aria-hidden="true"
                              className={cn(
                                'h-5 w-5 rounded-full border',
                                disabled
                                  ? 'border-gray-300 bg-white'
                                  : isNowCircle
                                    ? 'border-emerald-600 bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.25)]'
                                    : 'border-emerald-500 bg-white hover:bg-emerald-50'
                              )}
                            />
                          </Button>
                        )
                      })}
                    </div>
                  )
                })}

                {Array.from({ length: halfHourSegments }).map((_, index) => (
                  <div
                    key={index}
                    className={cn(
                      'absolute top-0 h-full border-r',
                      index % 2 === 0 ? 'border-gray-200' : 'border-gray-100'
                    )}
                    style={{ left: `${(index * HOUR_WIDTH) / 2}px` }}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
        <div className="absolute inset-x-0 bottom-0 flex h-4">
          <div
            className="shrink-0 border-t bg-gray-100"
            style={{ width: `${CAST_COLUMN_WIDTH}px` }}
          />
          <div
            ref={timelineHScrollRef}
            data-testid="timeline-horizontal-scrollbar"
            className="min-w-0 flex-1 overflow-y-hidden overflow-x-scroll border-t bg-gray-100"
            onScroll={() => syncHorizontalScroll('bar')}
          >
            <div style={{ width: `${gridWidth}px`, height: 1 }} />
          </div>
        </div>
      </div>

      <QuickBookingDialog
        open={canCreateReservation && !!selectedSlot}
        onOpenChange={(open) => {
          if (open) {
            return
          }
          setSelectedSlot(null)
          const createdId = pendingCreatedReservationIdRef.current
          pendingCreatedReservationIdRef.current = undefined
          if (createdId !== undefined) {
            onReservationCreated?.(createdId === '' ? undefined : createdId)
          }
        }}
        selectedStaff={
          selectedSlot
            ? (staff?.find((member) => member.id === selectedSlot.staffId) ??
              ({
                id: selectedSlot.staffId,
                name: selectedSlot.staffName,
              } as Cast))
            : undefined
        }
        staffOptions={staff}
        selectedTime={selectedSlot?.startTime}
        selectedSlot={selectedSlot}
        selectedCustomer={selectedCustomer}
        onReservationCreated={(reservationId) => {
          pendingCreatedReservationIdRef.current = reservationId ?? ''
        }}
        businessHours={businessHours}
      />

      <StaffDialog
        open={!!selectedStaff}
        onOpenChange={(open) => !open && setSelectedStaff(null)}
        staff={selectedStaff}
        selectedDate={selectedDate}
        optionCatalog={optionCatalog}
        onScheduleSaved={onScheduleSaved}
      />
    </div>
  )
}
