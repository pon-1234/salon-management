'use client'

import { useState, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area'
import { ReservationDialog } from './reservation-dialog'
import { QuickBookingDialog } from './quick-booking-dialog'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Calendar, Clock, MapPin, User, AlertCircle } from 'lucide-react'
import { Cast, Appointment } from '@/lib/cast'
import { logError } from '@/lib/error-utils'
import { StaffDialog } from '@/components/cast/cast-dialog'
import { format } from 'date-fns'
import { getCourseById } from '@/lib/course-option/utils'
import { customers as customerList, Customer } from '@/lib/customer/data'
import { ReservationData } from '@/components/reservation/reservation-table'

// safeMapを安全に実装（undefinedやnullでも空配列を返す）
function safeMap<T, U>(arr: T[] | undefined | null, callback: (item: T) => U): U[] {
  return Array.isArray(arr) ? arr.map(callback) : []
}

interface TimelineProps {
  staff: (Cast & { appointments: Appointment[] })[] | undefined
  selectedDate: Date
  selectedCustomer: Customer | null
  setSelectedAppointment: (appointment: any) => void
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
}: TimelineProps) {
  const [selectedAppointment, setSelectedAppointmentState] = useState<Appointment | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null)
  const [selectedStaff, setSelectedStaff] = useState<Cast | null>(null)
  const [viewMode, setViewMode] = useState<'day' | 'week'>('day')
  const [zoomLevel, setZoomLevel] = useState(1)

  const startHour = 9
  const endHour = 24
  const totalHours = endHour - startHour
  const SLOT_DURATION = 30 // 30分単位
  const HOUR_WIDTH = 120 * zoomLevel // ズームに応じた幅

  // staffが存在しない場合、早期return
  if (!staff || staff.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-gray-500">
        <div className="text-center">
          <AlertCircle className="mx-auto mb-2 h-12 w-12 text-gray-400" />
          <p>スタッフ情報を読み込んでいます...</p>
        </div>
      </div>
    )
  }

  const getTimeBlockStyle = (startTime: Date, endTime: Date) => {
    const start = startTime.getHours() + startTime.getMinutes() / 60
    const end = endTime.getHours() + endTime.getMinutes() / 60
    const left = (start - startHour) * HOUR_WIDTH
    const width = (end - start) * HOUR_WIDTH
    return { left: `${left}px`, width: `${width}px` }
  }

  const isSameDay = (date1: Date, date2: Date) => {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    )
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
      (app) => (isSameDay(app.startTime, selectedDate) ? app : null) // selectedDateに基づいてフィルタリング
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

  const getAvailableSlots = (staff: Cast): AvailableSlot[] => {
    try {
      if (!staff.workStart || !staff.workEnd) return []

      const slots: AvailableSlot[] = []
      const sortedAppointments = safeMap(staff.appointments, (app) => app).sort(
        (a, b) => a.startTime.getTime() - b.startTime.getTime()
      )

      let currentTime = new Date(staff.workStart)

      sortedAppointments.forEach((appointment) => {
        if (currentTime < appointment.startTime) {
          const duration = Math.round(
            (appointment.startTime.getTime() - currentTime.getTime()) / (1000 * 60)
          )
          slots.push({
            startTime: new Date(currentTime),
            endTime: new Date(appointment.startTime),
            duration,
            staffId: staff.id,
            staffName: staff.name,
          })
        }
        currentTime = new Date(appointment.endTime)
      })

      if (currentTime < staff.workEnd) {
        const duration = Math.round((staff.workEnd.getTime() - currentTime.getTime()) / (1000 * 60))
        slots.push({
          startTime: new Date(currentTime),
          endTime: new Date(staff.workEnd),
          duration,
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

  const convertToReservationData = (appointment: Appointment, staff: Cast): ReservationData => {
    const customer = customerList.find((c) => c.id === String(appointment.customerId))
    return {
      ...appointment,
      id: appointment.id.toString(),
      customerName: customer?.name || '顧客が見つかりません',
      customerType: 'regular',
      phoneNumber: customer?.phone || '',
      email: customer?.email || '',
      points: customer?.points || 0,
      bookingStatus: appointment.status === 'confirmed' ? '確定済' : '仮予約',
      staffConfirmation: '確認済',
      customerConfirmation: '確認済',
      prefecture: '東京都',
      district: '豊島区',
      location: '池袋（北口・西口）(0円)',
      locationType: 'ホテル利用',
      specificLocation: 'location details placeholder',
      staff: staff.name,
      marketingChannel: 'Replace me',
      date: format(new Date(appointment.startTime), 'yyyy-MM-dd'),
      time: format(new Date(appointment.startTime), 'HH:mm'),
      inOutTime: `${format(new Date(appointment.startTime), 'HH:mm')} - ${format(new Date(appointment.endTime), 'HH:mm')}`,
      course: getCourseById(appointment.serviceId)?.name || 'N/A',
      freeExtension: '0',
      designation: 'N/A',
      designationFee: '0円',
      options: {},
      transportationFee: 0,
      paymentMethod: '現金',
      discount: 'なし',
      additionalFee: 0,
      totalPayment: appointment.price,
      storeRevenue: 0,
      staffRevenue: 0,
      staffBonusFee: 0,
      startTime: new Date(appointment.startTime),
      endTime: new Date(appointment.endTime),
      staffImage: staff.image,
      customerId: String(appointment.customerId),
    }
  }

  // 現在時刻の位置を計算
  const currentTime = new Date()
  const currentTimePosition = (() => {
    const now = new Date()
    if (!isSameDay(now, selectedDate)) return null
    const hours = now.getHours() + now.getMinutes() / 60
    if (hours < startHour || hours > endHour) return null
    return (hours - startHour) * HOUR_WIDTH
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
        <div className="text-sm text-gray-600">{format(selectedDate, 'yyyy年MM月dd日(E)')}</div>
      </div>

      <ScrollArea className="w-full">
        <div className="flex" style={{ minWidth: `${totalHours * HOUR_WIDTH + 240}px` }}>
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
                      {member.workStart.toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                      {' - '}
                      {member.workEnd.toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
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
              {Array.from({ length: totalHours }).map((_, index) => (
                <div
                  key={index}
                  className="flex flex-col items-center justify-center border-r"
                  style={{ width: `${HOUR_WIDTH}px` }}
                >
                  <div className="font-medium">{index + startHour}:00</div>
                  <div className="text-xs text-gray-500">
                    {index + startHour < 12 ? '午前' : '午後'}
                  </div>
                </div>
              ))}
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
                    onClick={() =>
                      setSelectedAppointmentState(convertToReservationData(appointment, member))
                    }
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
                      {appointment.startTime.toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                      -
                      {appointment.endTime.toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                    {appointment.serviceId && (
                      <div className="mt-1 truncate text-xs text-gray-500">
                        {getCourseById(appointment.serviceId)?.name || ''}
                      </div>
                    )}
                  </div>
                ))}

                {/* 利用可能スロット */}
                {selectedCustomer &&
                  safeMap(getAvailableSlots(member), (slot, index) => {
                    if (slot.duration < 30) return null // 30分未満は表示しない

                    return (
                      <button
                        key={`${member.id}-${index}`}
                        className={cn(
                          'absolute top-2 rounded-lg border-2 border-dashed border-gray-300',
                          'transition-all hover:border-emerald-500 hover:bg-emerald-50',
                          'group flex items-center justify-center'
                        )}
                        style={{
                          ...getTimeBlockStyle(slot.startTime, slot.endTime),
                          height: 'calc(100% - 16px)',
                        }}
                        onClick={() => handleTimeSlotClick(slot, slot.startTime)}
                      >
                        <div className="text-center">
                          <div className="text-xs text-gray-500 group-hover:text-emerald-700">
                            {slot.startTime.toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                          <div className="text-sm font-medium text-gray-600 group-hover:text-emerald-700">
                            {slot.duration}分可
                          </div>
                        </div>
                      </button>
                    )
                  })}

                {/* 時間グリッド線 */}
                {Array.from({ length: totalHours }).map((_, index) => (
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
                  {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            )}
          </div>
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      <ReservationDialog
        open={!!selectedAppointment}
        onOpenChange={(open) => !open && setSelectedAppointmentState(null)}
        reservation={selectedAppointment as ReservationData}
      />

      <QuickBookingDialog
        open={!!selectedSlot}
        onOpenChange={(open) => !open && setSelectedSlot(null)}
        selectedStaff={{
          id: selectedSlot?.staffId || '',
          name: selectedSlot?.staffName || '',
        }}
        selectedTime={selectedSlot?.startTime}
        selectedCustomer={selectedCustomer}
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
