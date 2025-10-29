'use client'

import { useState, useMemo, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { QuickBookingDialog } from './quick-booking-dialog'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Clock, User, AlertCircle, Plus } from 'lucide-react'
import { Cast, Appointment } from '@/lib/cast/types'
import { logError } from '@/lib/error-utils'
import { StaffDialog } from '@/components/cast/cast-dialog'
import tz from 'date-fns-tz'
import { differenceInCalendarDays, parse } from 'date-fns'
import { getCourseById } from '@/lib/course-option/utils'
import { Customer } from '@/lib/customer/types'
import { ReservationData } from '@/lib/types/reservation'
import {
  BusinessHoursRange,
  formatMinutesAsLabel,
  minutesToIsoInJst,
} from '@/lib/settings/business-hours'

const JST_TIMEZONE = 'Asia/Tokyo'
const { formatInTimeZone, zonedTimeToUtc } = tz
const MINUTES_IN_DAY = 24 * 60

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
}

interface AvailableSlot {
  startTime: Date
  endTime: Date
  duration: number
  staffId: string
  staffName: string
}

interface TimeSlot {
  time: Date
  isStart: boolean
}

export function Timeline({
  staff,
  selectedDate,
  selectedCustomer,
  setSelectedAppointment,
  reservations,
  onReservationCreated,
  businessHours,
}: TimelineProps) {
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null)
  const [selectedStaff, setSelectedStaff] = useState<Cast | null>(null)
  const [zoomLevel, setZoomLevel] = useState(1)
  const SLOT_DURATION = 30 // 30分単位
  const HOUR_WIDTH = 120 * zoomLevel // ズームに応じた幅
  const startMinutes = businessHours.startMinutes
  const endMinutes = businessHours.endMinutes
  const totalMinutes = endMinutes - startMinutes
  const hourSegments = Math.ceil(totalMinutes / 60)
  const selectedDateKey = formatInTimeZone(selectedDate, JST_TIMEZONE, 'yyyy-MM-dd')

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

  if (!staff) {
    return (
      <div className="flex h-64 items-center justify-center text-gray-500">
        <div className="text-center">
          <AlertCircle className="mx-auto mb-2 h-12 w-12 text-gray-400" />
          <p>スタッフ情報を読み込んでいます...</p>
        </div>
      </div>
    )
  }

  if (staff.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-gray-500">
        <div className="text-center">
          <AlertCircle className="mx-auto mb-2 h-12 w-12 text-gray-400" />
          <p>本日出勤予定のスタッフはいません。</p>
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

  const generateTimeSlots = (startTime: Date, endTime: Date): TimeSlot[] => {
    const slots: TimeSlot[] = []
    const current = new Date(startTime)
    const end = new Date(endTime)

    while (current < end) {
      slots.push({
        time: new Date(current),
        isStart: current.getTime() === startTime.getTime(),
      })
      current.setMinutes(current.getMinutes() + SLOT_DURATION)
    }

    return slots
  }

  const filteredStaff = safeMap(staff, (member) => {
    const filteredAppointments = safeMap(
      member.appointments,
      (app) =>
        formatInTimeZone(app.startTime, JST_TIMEZONE, 'yyyy-MM-dd') === selectedDateKey
          ? app
          : null
    ).filter((app): app is Appointment => app !== null)

    return {
      ...member,
      appointments: filteredAppointments,
      workStart:
        member.workStart &&
        new Date(
          selectedDate.getFullYear(),
          selectedDate.getMonth(),
          selectedDate.getDate(),
          member.workStart.getHours(),
          member.workStart.getMinutes()
        ),
      workEnd:
        member.workEnd &&
        new Date(
          selectedDate.getFullYear(),
          selectedDate.getMonth(),
          selectedDate.getDate(),
          member.workEnd.getHours(),
          member.workEnd.getMinutes()
        ),
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

  const minutesToUtcDate = useCallback(
    (minutes: number) =>
      new Date(zonedTimeToUtc(minutesToIsoInJst(selectedDateKey, minutes), JST_TIMEZONE)),
    [selectedDateKey]
  )

  const getAvailableSlots = (staff: Cast): AvailableSlot[] => {
    try {
      if (!staff.workStart || !staff.workEnd) return []

      const workStartMinute = Math.max(getMinutesFromDate(staff.workStart), startMinutes)
      const workEndMinute = Math.min(getMinutesFromDate(staff.workEnd), endMinutes)

      if (workEndMinute <= workStartMinute) {
        return []
      }

      const slots: AvailableSlot[] = []
      const sortedAppointments = safeMap(staff.appointments, (app) => app).sort(
        (a, b) => a.startTime.getTime() - b.startTime.getTime()
      )

      let currentMinute = workStartMinute

      sortedAppointments.forEach((appointment) => {
        const appointmentStartMinute = Math.max(
          getMinutesFromDate(appointment.startTime),
          startMinutes
        )
        const appointmentEndMinute = Math.min(
          getMinutesFromDate(appointment.endTime),
          endMinutes
        )

        if (appointmentStartMinute - currentMinute >= SLOT_DURATION) {
          slots.push({
            startTime: minutesToUtcDate(currentMinute),
            endTime: minutesToUtcDate(appointmentStartMinute),
            duration: appointmentStartMinute - currentMinute,
            staffId: staff.id,
            staffName: staff.name,
          })
        }

        currentMinute = Math.max(currentMinute, appointmentEndMinute)
      })

      if (workEndMinute - currentMinute >= SLOT_DURATION) {
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
    setSelectedSlot({
      ...slot,
      startTime: selectedTime,
      duration: SLOT_DURATION,
    })
  }

  // 現在時刻の位置を計算
  const currentTime = new Date()
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

  return (
    <div className="relative bg-gray-50">
      {/* コントロールバー */}
      <div className="flex items-center justify-between border-b bg-white px-4 py-2">
        <div className="flex items-center gap-2">
          <Button
            variant={zoomLevel === 0.75 ? 'default' : 'outline'}
            size="sm"
            onClick={() => setZoomLevel(0.75)}
          >
            75%
          </Button>
          <Button
            variant={zoomLevel === 1 ? 'default' : 'outline'}
            size="sm"
            onClick={() => setZoomLevel(1)}
          >
            100%
          </Button>
          <Button
            variant={zoomLevel === 1.25 ? 'default' : 'outline'}
            size="sm"
            onClick={() => setZoomLevel(1.25)}
          >
            125%
          </Button>
        </div>
        <div className="text-sm text-gray-600">
          {formatInTimeZone(selectedDate, JST_TIMEZONE, 'yyyy年MM月dd日(E)')}
        </div>
      </div>

      <ScrollArea className="w-full">
        <div className="flex" style={{ minWidth: `${hourSegments * HOUR_WIDTH + 240}px` }}>
          {/* スタッフ列 */}
          <div
            className="sticky left-0 z-20 border-r bg-white shadow-sm"
            style={{ width: '240px' }}
          >
            <div className="flex h-16 items-center border-b bg-gray-50 px-4">
              <User className="mr-2 h-4 w-4 text-gray-600" />
              <span className="font-medium">スタッフ</span>
            </div>
            {safeMap(filteredStaff, (member) => (
              <button
                key={member.id}
                className="flex h-24 w-full items-center gap-3 border-b px-4 py-3 transition-colors hover:bg-gray-50"
                onClick={() => setSelectedStaff(member)}
              >
                <Avatar className="h-12 w-12">
                  <AvatarImage src={member.image} alt={member.name} />
                  <AvatarFallback>{member.name.slice(0, 2)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 text-left">
                  <div className="font-medium">{member.name}</div>
                  {member.workStart && member.workEnd ? (
                    <div className="flex items-center gap-1 text-xs text-gray-600">
                      <Clock className="h-3 w-3" />
                      {formatInTimeZone(member.workStart, JST_TIMEZONE, 'HH:mm')}
                      {' - '}
                      {formatInTimeZone(member.workEnd, JST_TIMEZONE, 'HH:mm')}
                    </div>
                  ) : (
                    <Badge variant="secondary" className="text-xs">
                      休み
                    </Badge>
                  )}
                  <div className="mt-1 flex items-center gap-1">
                    <div className="text-xs text-gray-500">
                      予約 {member.appointments?.length || 0}件
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* タイムグリッド */}
          <div className="relative flex-1">
            {/* 時間ヘッダー */}
            <div className="sticky top-0 z-10 flex h-16 border-b bg-gray-50">
              {Array.from({ length: hourSegments }).map((_, index) => {
                const minute = startMinutes + index * 60
                const minuteOfDay = ((minute % MINUTES_IN_DAY) + MINUTES_IN_DAY) % MINUTES_IN_DAY
                const label = formatMinutesAsLabel(minute)
                const period = minuteOfDay < 12 * 60 ? '午前' : '午後'
                return (
                  <div
                    key={index}
                    className="flex flex-col items-center justify-center border-r"
                    style={{ width: `${HOUR_WIDTH}px` }}
                  >
                    <div className="font-medium">{label}</div>
                    <div className="text-xs text-gray-500">{period}</div>
                  </div>
                )
              })}
            </div>

            {/* スタッフ別タイムライン */}
            {safeMap(filteredStaff, (member) => (
              <div key={member.id} className="relative h-24 border-b bg-white">
                {/* 勤務時間の背景 */}
                {member.workStart && member.workEnd && (
                  <div
                    className="absolute top-0 h-full bg-blue-50 opacity-30"
                    style={getTimeBlockStyle(member.workStart, member.workEnd)}
                  />
                )}

                {/* 予約ブロック */}
                {safeMap(member.appointments, (appointment) => (
                  <div
                    key={appointment.id}
                    className={cn(
                      'absolute top-2 cursor-pointer rounded-lg shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md',
                      'flex flex-col p-3',
                      appointment.status === 'provisional'
                        ? 'border-2 border-orange-300 bg-orange-100'
                        : 'border-2 border-emerald-400 bg-white'
                    )}
                    style={{
                      ...getTimeBlockStyle(appointment.startTime, appointment.endTime),
                      height: 'calc(100% - 16px)',
                    }}
                    onClick={() => handleAppointmentClick(appointment)}
                  >
                    <div className="mb-1 flex items-center justify-between">
                      <Badge
                        variant={appointment.status === 'provisional' ? 'secondary' : 'default'}
                        className={cn(
                          'px-1.5 py-0 text-xs',
                          appointment.status === 'provisional'
                            ? 'bg-orange-500 text-white'
                            : 'bg-emerald-600 text-white'
                        )}
                      >
                        {appointment.status === 'provisional' ? '仮予約' : '確定'}
                      </Badge>
                      <span className="text-xs text-gray-600">
                        {Math.round(
                          (appointment.endTime.getTime() - appointment.startTime.getTime()) / 60000
                        )}
                        分
                      </span>
                    </div>
                    <div className="mb-1 truncate text-sm font-medium">
                      {appointment.customerName}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-600">
                      <Clock className="h-3 w-3" />
                      {formatInTimeZone(appointment.startTime, JST_TIMEZONE, 'HH:mm')}
                      -
                      {formatInTimeZone(appointment.endTime, JST_TIMEZONE, 'HH:mm')}
                    </div>
                    {appointment.serviceId && (
                      <div className="mt-1 truncate text-xs text-gray-500">
                        {getCourseById(appointment.serviceId)?.name || ''}
                      </div>
                    )}
                  </div>
                ))}

                {safeMap(getAvailableSlots(member), (slot, index) => {
                  if (slot.duration < 30) return null

                  const disabled = !selectedCustomer

                  return (
                    <div
                      key={`${member.id}-${index}`}
                      className="absolute top-2 flex h-[calc(100%-16px)] w-full items-center justify-center"
                      style={getTimeBlockStyle(slot.startTime, slot.endTime)}
                    >
                      <div
                        className={cn(
                          'flex h-full w-full flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 p-2 text-center',
                          disabled
                            ? 'bg-gray-50/80 text-gray-400'
                            : 'bg-white/60 text-gray-500 transition-all hover:border-emerald-500 hover:bg-emerald-50'
                        )}
                      >
                        <span className={cn('text-xs', disabled ? 'text-gray-400' : 'text-gray-500')}>
                          {formatInTimeZone(slot.startTime, JST_TIMEZONE, 'HH:mm')}
                        </span>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className={cn(
                            'mt-1 h-10 w-10 rounded-full border-emerald-500 text-emerald-600',
                            disabled ? 'cursor-not-allowed opacity-60' : 'hover:bg-emerald-500 hover:text-white'
                          )}
                          onClick={() => handleTimeSlotClick(slot, slot.startTime)}
                          disabled={disabled}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                        <span className={cn('mt-1 text-xs', disabled ? 'text-gray-400' : 'text-gray-500')}>
                          {slot.duration}分可
                        </span>
                        {disabled && (
                          <span className="mt-1 text-[10px] text-gray-400">顧客を選択してください</span>
                        )}
                      </div>
                    </div>
                  )
                })}

                {/* 時間グリッド線 */}
                {Array.from({ length: hourSegments }).map((_, index) => (
                  <div
                    key={index}
                    className="absolute top-0 h-full border-r border-gray-200"
                    style={{ left: `${index * HOUR_WIDTH}px` }}
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
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      <QuickBookingDialog
        open={!!selectedSlot}
        onOpenChange={(open) => !open && setSelectedSlot(null)}
        selectedStaff={
          selectedSlot
            ? ({
                id: selectedSlot.staffId,
                name: selectedSlot.staffName,
              } as any)
            : null
        }
        selectedTime={selectedSlot?.startTime}
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
      />
    </div>
  )
}
