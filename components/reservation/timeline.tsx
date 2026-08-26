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
  QUICK_BOOKING_STEP_MINUTES,
  buildHalfHourBookingStarts,
  ceilToInterval,
} from '@/lib/reservation/booking-slot-window'

const JST_TIMEZONE = 'Asia/Tokyo'
const MINUTES_IN_DAY = 24 * 60
const TIMELINE_INTERVAL_MINUTES = TIMELINE_BOOKING_INTERVAL_MINUTES
const MIN_BOOKING_DURATION_MINUTES = 10
const MIN_DISPLAY_SLOT_MINUTES = 10
const CAST_COLUMN_WIDTH = 176

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
  const [selectedStaff, setSelectedStaff] = useState<Cast | null>(null)
  const [zoomLevel, setZoomLevel] = useState(1)
  const timelineBodyRef = useRef<HTMLDivElement>(null)
  const timelineHScrollRef = useRef<HTMLDivElement>(null)
  const HOUR_WIDTH = 120 * zoomLevel // ズームに応じた幅
  const startMinutes = businessHours.startMinutes
  const endMinutes = businessHours.endMinutes
  const totalMinutes = endMinutes - startMinutes
  const hourSegments = Math.ceil(totalMinutes / 60)
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

  const buildSelectableStartTimes = useCallback(
    (slot: AvailableSlot): Date[] => {
      const startMinute = getMinutesFromDate(slot.startTime)
      const endMinute = getMinutesFromDate(slot.endTime)

      if (endMinute - startMinute < MIN_BOOKING_DURATION_MINUTES) {
        return []
      }

      const candidates = buildHalfHourBookingStarts(
        startMinute,
        endMinute,
        MIN_BOOKING_DURATION_MINUTES
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
    const filteredAppointments = safeMap(member.appointments, (app) =>
      formatInTimeZone(app.startTime, JST_TIMEZONE, 'yyyy-MM-dd') === selectedDateKey ? app : null
    ).filter((app): app is Appointment => app !== null)

    let workStart = member.workStart
    let workEnd = member.workEnd

    if (workStart && workEnd) {
      const sourceStartDateKey = formatInTimeZone(workStart, JST_TIMEZONE, 'yyyy-MM-dd')

      if (sourceStartDateKey !== selectedDateKey) {
        const sourceEndDateKey = formatInTimeZone(workEnd, JST_TIMEZONE, 'yyyy-MM-dd')
        const startMinute =
          Number(formatInTimeZone(workStart, JST_TIMEZONE, 'HH')) * 60 +
          Number(formatInTimeZone(workStart, JST_TIMEZONE, 'mm'))
        const endMinuteOfDay =
          Number(formatInTimeZone(workEnd, JST_TIMEZONE, 'HH')) * 60 +
          Number(formatInTimeZone(workEnd, JST_TIMEZONE, 'mm'))
        const crossesMidnight =
          sourceEndDateKey > sourceStartDateKey || endMinuteOfDay <= startMinute

        workStart = minutesToUtcDate(startMinute)
        workEnd = minutesToUtcDate(endMinuteOfDay + (crossesMidnight ? MINUTES_IN_DAY : 0))
      }
    }

    return {
      ...member,
      appointments: filteredAppointments,
      workStart,
      workEnd,
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

      const workStartMinute = Math.max(getMinutesFromDate(staff.workStart), startMinutes)
      const workEndMinute = Math.min(getMinutesFromDate(staff.workEnd), endMinutes)
      const timeLimitMinute = nowMinutes

      if (workEndMinute <= workStartMinute) {
        return []
      }

      const slots: AvailableSlot[] = []
      const sortedAppointments = safeMap(staff.appointments, (app) => app).sort(
        (a, b) => a.startTime.getTime() - b.startTime.getTime()
      )

      let currentMinute = workStartMinute

      if (timeLimitMinute !== null) {
        currentMinute = Math.max(currentMinute, timeLimitMinute)
      }

      currentMinute = snapToStep(currentMinute)

      if (currentMinute >= workEndMinute) {
        return []
      }

      for (const appointment of sortedAppointments) {
        const appointmentStartMinute = Math.max(
          getMinutesFromDate(appointment.startTime),
          startMinutes
        )
        const appointmentEndMinute = Math.min(getMinutesFromDate(appointment.endTime), endMinutes)

        if (appointmentEndMinute <= currentMinute) {
          continue
        }

        const gapEndMinute = Math.min(appointmentStartMinute, workEndMinute)
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

        if (currentMinute >= workEndMinute) {
          break
        }
      }

      if (workEndMinute - currentMinute >= MIN_DISPLAY_SLOT_MINUTES) {
        slots.push({
          startTime: minutesToUtcDate(currentMinute),
          endTime: minutesToUtcDate(workEndMinute),
          duration: workEndMinute - currentMinute,
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

  // 現在時刻の位置を計算
  const currentTime = now
  const currentTimePosition = (() => {
    const now = new Date()
    const nowMinutes = getMinutesFromDate(now)
    if (formatInTimeZone(now, JST_TIMEZONE, 'yyyy-MM-dd') !== selectedDateKey) {
      const diff = differenceInCalendarDays(
        parse(formatInTimeZone(now, JST_TIMEZONE, 'yyyy-MM-dd'), 'yyyy-MM-dd', new Date()),
        parse(selectedDateKey, 'yyyy-MM-dd', new Date())
      )
      if (diff !== 0) return null
    }
    const relative = nowMinutes - startMinutes
    if (relative < 0 || relative > totalMinutes) return null
    return (relative / 60) * HOUR_WIDTH
  })()

  const timelineMinWidth = hourSegments * HOUR_WIDTH + CAST_COLUMN_WIDTH
  const halfHourSegments = hourSegments * 2

  const syncHorizontalScroll = (source: 'body' | 'bar') => {
    const body = timelineBodyRef.current
    const bar = timelineHScrollRef.current
    if (!body || !bar) return
    if (source === 'body') {
      bar.scrollLeft = body.scrollLeft
    } else {
      body.scrollLeft = bar.scrollLeft
    }
  }

  return (
    <div className="relative bg-gray-50">
      <div className="flex items-center justify-end gap-1 border-b bg-white px-2 py-1">
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

      <div className="relative h-[calc(100vh-8rem)] min-h-[28rem] w-full">
        <div
          ref={timelineBodyRef}
          data-testid="reservation-timeline-scroll"
          className="absolute inset-x-0 bottom-4 top-0 overflow-auto"
          onScroll={() => syncHorizontalScroll('body')}
        >
          <div className="flex" style={{ minWidth: `${timelineMinWidth}px` }}>
            {/* キャスト列 */}
            <div
              className="sticky left-0 z-20 border-r bg-white shadow-sm"
              style={{ width: `${CAST_COLUMN_WIDTH}px` }}
            >
              <div className="sticky top-0 z-30 flex h-8 items-center border-b bg-gray-50 px-2">
                <User className="mr-1 h-3.5 w-3.5 text-gray-600" />
                <span className="text-xs font-medium">キャスト</span>
              </div>
              {safeMap(filteredStaff, (member) => (
                <button
                  key={member.id}
                  className={cn(
                    'flex h-14 w-full items-center gap-2 overflow-hidden border-b px-2 py-1 transition-colors',
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
                      className="flex min-w-0 items-center gap-1"
                    >
                      <span className="truncate text-sm font-medium">{member.name}</span>
                      {member.specialDesignationFee != null && member.specialDesignationFee > 0 ? (
                        <Badge
                          className="h-4 shrink-0 px-1 text-[10px]"
                          variant="outline"
                          aria-label={`特別指名料 ${member.specialDesignationFee.toLocaleString('ja-JP')}円`}
                        >
                          特別指名 {member.specialDesignationFee.toLocaleString('ja-JP')}円
                        </Badge>
                      ) : null}
                    </div>
                    {member.workStart && member.workEnd ? (
                      <div className="flex items-center gap-1 text-[11px] text-gray-600">
                        <Clock className="h-3 w-3" />
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
              ))}
            </div>

            {/* タイムグリッド */}
            <div className="relative flex-1">
              {/* 時間ヘッダー */}
              <div
                data-testid="timeline-time-header"
                className="sticky top-0 z-10 flex h-8 border-b bg-gray-50"
              >
                {Array.from({ length: halfHourSegments }).map((_, index) => {
                  const minute = startMinutes + index * TIMELINE_INTERVAL_MINUTES
                  const label = formatMinutesAsLabel(minute)
                  return (
                    <div
                      key={index}
                      className="flex items-center justify-center border-r text-[11px] font-medium text-gray-700"
                      style={{ width: `${HOUR_WIDTH / 2}px` }}
                    >
                      {label}
                    </div>
                  )
                })}
              </div>

              {/* スタッフ別タイムライン */}
              {safeMap(filteredStaff, (member) => (
                <div
                  key={member.id}
                  className={cn(
                    'relative h-14 border-b',
                    member.workStart && member.workEnd ? 'bg-slate-200' : 'bg-slate-300'
                  )}
                >
                  {/* 勤務時間の背景 */}
                  {member.workStart && member.workEnd && (
                    <div
                      className="absolute top-0 h-full bg-white"
                      style={getTimeBlockStyle(member.workStart, member.workEnd)}
                    />
                  )}

                  {/* 予約ブロック */}
                  {safeMap(member.appointments, (appointment) => {
                    const sourceReservation = reservationsById.get(appointment.id)
                    const displayStatus =
                      sourceReservation?.status ??
                      (appointment.status === 'provisional' ? 'pending' : appointment.status)
                    const statusLabel = getReservationStatusLabel(
                      displayStatus,
                      sourceReservation?.marketingChannel
                    )
                    const isTentative = displayStatus === 'pending' || displayStatus === 'tentative'
                    const durationMinutes = Math.round(
                      (appointment.endTime.getTime() - appointment.startTime.getTime()) / 60000
                    )
                    const startLabel = formatInTimeZone(
                      appointment.startTime,
                      JST_TIMEZONE,
                      'HH:mm'
                    )
                    const endLabel = formatInTimeZone(appointment.endTime, JST_TIMEZONE, 'HH:mm')
                    const serviceName =
                      appointment.serviceName ||
                      (appointment.serviceId ? getCourseById(appointment.serviceId)?.name : '')

                    return (
                      <button
                        key={appointment.id}
                        type="button"
                        aria-label={`${appointment.customerName} 様 ${startLabel}-${endLabel}`}
                        className={cn(
                          'absolute top-1 cursor-pointer overflow-hidden rounded-md text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md',
                          'flex flex-col px-1.5 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-1',
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
                          className="w-full min-w-0 shrink-0 truncate text-sm font-semibold leading-5 text-gray-900"
                          title={appointment.customerName}
                        >
                          {appointment.customerName}
                        </div>
                        <div className="mt-0.5 flex w-full shrink-0 items-center justify-between gap-1 leading-4">
                          <Badge
                            variant={isTentative ? 'secondary' : 'default'}
                            className={cn(
                              'shrink-0 px-1.5 py-0 text-xs',
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
                              className="shrink-0 border border-slate-300 bg-slate-200 px-1.5 py-0 text-[10px] text-slate-800"
                              aria-label="特別指名"
                            >
                              特別指名
                            </Badge>
                          )}
                          <span className="shrink-0 text-xs text-gray-600">
                            {durationMinutes}分
                          </span>
                        </div>
                        <div className="mt-0.5 flex w-full min-w-0 shrink-0 items-center gap-1 text-xs leading-4 text-gray-600">
                          <Clock className="h-3 w-3 shrink-0" />
                          <span className="shrink-0">
                            {startLabel}-{endLabel}
                          </span>
                          {serviceName && (
                            <span className="min-w-0 truncate text-gray-500" title={serviceName}>
                              ・{serviceName}
                            </span>
                          )}
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
                          const circleEnd = minutesToUtcDate(
                            startMinute + TIMELINE_INTERVAL_MINUTES
                          )

                          return (
                            <Button
                              key={startTime.toISOString()}
                              type="button"
                              size="sm"
                              variant="ghost"
                              className={cn(
                                'absolute top-1 z-10 flex h-[calc(100%-8px)] items-center justify-start rounded-none border-0 p-0 hover:bg-transparent',
                                disabled && 'cursor-not-allowed opacity-60'
                              )}
                              style={getTimeBlockStyle(startTime, circleEnd)}
                              aria-label={`${label}から予約`}
                              title={`${label}から予約`}
                              onClick={() => handleTimeSlotClick(slot, startTime)}
                              disabled={disabled}
                            >
                              <span
                                className={cn(
                                  'ml-0.5 flex h-5 w-5 items-center justify-center rounded-full border text-[9px] font-medium',
                                  disabled
                                    ? 'border-gray-300 bg-white text-gray-400'
                                    : 'border-emerald-500 bg-white text-emerald-700 hover:bg-emerald-50'
                                )}
                              >
                                ○
                              </span>
                            </Button>
                          )
                        })}
                      </div>
                    )
                  })}

                  {/* 時間グリッド線 */}
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

              {/* 現在時刻ライン */}
              {currentTimePosition !== null && (
                <div
                  className="pointer-events-none absolute top-0 z-30 h-full w-0.5 bg-red-500"
                  style={{ left: `${currentTimePosition}px` }}
                >
                  <div className="absolute -left-1 -top-2 h-3 w-3 rounded-full bg-red-500" />
                  <div className="absolute -left-8 -top-6 rounded bg-white px-1 text-xs font-medium text-red-600">
                    {formatInTimeZone(currentTime, JST_TIMEZONE, 'HH:mm')}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        <div
          ref={timelineHScrollRef}
          data-testid="timeline-horizontal-scrollbar"
          className="absolute inset-x-0 bottom-0 h-4 overflow-y-hidden overflow-x-scroll border-t bg-gray-100"
          onScroll={() => syncHorizontalScroll('bar')}
        >
          <div style={{ width: `${timelineMinWidth}px`, height: 1 }} />
        </div>
      </div>

      <QuickBookingDialog
        open={canCreateReservation && !!selectedSlot}
        onOpenChange={(open) => !open && setSelectedSlot(null)}
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
          onReservationCreated?.(reservationId)
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
