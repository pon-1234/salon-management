"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { ReservationDialog } from "./reservation-dialog"
import { QuickBookingDialog } from "./quick-booking-dialog"
import Link from "next/link"
import { Circle } from 'lucide-react'
import { Cast, Appointment } from "@/lib/staff"
import { logError } from "@/lib/error-utils"
import { StaffDialog } from "@/components/staff/staff-dialog"
import { format } from 'date-fns';
import { getCourseById } from '@/lib/course-option/utils';
import { customers as customerList } from "@/lib/customer/data";
import { ReservationData } from "@/components/reservation/reservation-table";

// safeMapを安全に実装（undefinedやnullでも空配列を返す）
function safeMap<T, U>(arr: T[] | undefined | null, callback: (item: T) => U): U[] {
  return Array.isArray(arr) ? arr.map(callback) : []
}

interface TimelineProps {
  staff: (Cast & { appointments: Appointment[] })[] | undefined;
  selectedDate: Date;
  selectedCustomer: { id: string; name: string } | null;
  setSelectedAppointment: (appointment: any) => void;
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

export function Timeline({ staff, selectedDate, selectedCustomer, setSelectedAppointment }: TimelineProps) {
  const [selectedAppointment, setSelectedAppointmentState] = useState<Appointment | null>(null)
  const [selectedSlot, setSelectedSlot] = useState<AvailableSlot | null>(null)
  const [selectedStaff, setSelectedStaff] = useState<Cast | null>(null)
  const startHour = 9;
  const endHour = 24;
  const totalHours = endHour - startHour;
  const SLOT_DURATION = 30; // 30分単位

  // staffが存在しない場合、早期return
  if (!staff || staff.length === 0) {
    return <div>スタッフ情報を読み込んでいます...</div>
  }

  const getTimeBlockStyle = (startTime: Date, endTime: Date) => {
    const start = startTime.getHours() + startTime.getMinutes() / 60;
    const end = endTime.getHours() + endTime.getMinutes() / 60;
    const left = ((start - startHour) / totalHours) * 100;
    const width = ((end - start) / totalHours) * 100;
    return { left: `${left}%`, width: `${width}%` };
  };

  const isSameDay = (date1: Date, date2: Date) => {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  };

  const generateTimeSlots = (startTime: Date, endTime: Date): TimeSlot[] => {
    const slots: TimeSlot[] = [];
    const current = new Date(startTime);
    const end = new Date(endTime);

    while (current < end) {
      slots.push({ 
        time: new Date(current),
        isStart: current.getTime() === startTime.getTime()
      });
      current.setMinutes(current.getMinutes() + SLOT_DURATION);
    }

    return slots;
  };

  const filteredStaff = safeMap(staff, member => {
    const filteredAppointments = safeMap(member.appointments, app =>
      isSameDay(app.startTime, selectedDate) ? app : null // selectedDateに基づいてフィルタリング
    ).filter((app): app is Appointment => app !== null);

    return {
      ...member,
      appointments: filteredAppointments,
      workStart: member.workStart && new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), member.workStart.getHours(), member.workStart.getMinutes()),
      workEnd: member.workEnd && new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), member.workEnd.getHours(), member.workEnd.getMinutes()),
    };
  });

  const getAvailableSlots = (staff: Cast): AvailableSlot[] => {
    try {
      if (!staff.workStart || !staff.workEnd) return []

      const slots: AvailableSlot[] = []
      const sortedAppointments = safeMap(staff.appointments, app => app).sort((a, b) => 
        a.startTime.getTime() - b.startTime.getTime()
      )

      let currentTime = new Date(staff.workStart)

      sortedAppointments.forEach(appointment => {
        if (currentTime < appointment.startTime) {
          const duration = Math.round((appointment.startTime.getTime() - currentTime.getTime()) / (1000 * 60))
          slots.push({
            startTime: new Date(currentTime),
            endTime: new Date(appointment.startTime),
            duration,
            staffId: staff.id,
            staffName: staff.name
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
          staffName: staff.name
        })
      }

      return slots
    } catch (error) {
      logError(error, `getAvailableSlots for staff ${staff.id}`);
      return [];
    }
  }

  const handleTimeSlotClick = (slot: AvailableSlot, selectedTime: Date) => {
    setSelectedSlot({
      ...slot,
      startTime: selectedTime,
      duration: SLOT_DURATION
    });
  };

  const convertToReservationData = (appointment: Appointment, staff: Cast): ReservationData => {
    const customer = customerList.find(c => c.id === String(appointment.customerId));
    return {
      ...appointment,
      id: appointment.id.toString(),
      customerName: customer?.name || "顧客が見つかりません",
      customerType: "regular",
      phoneNumber: customer?.phone || "",
      email: customer?.email || "",
      points: customer?.points || 0,
      bookingStatus: appointment.status === "confirmed" ? "確定済" : "仮予約",
      staffConfirmation: "確認済",
      customerConfirmation: "確認済",
      prefecture: "東京都",
      district: "豊島区",
      location: "池袋（北口・西口）(0円)",
      locationType: "ホテル利用",
      specificLocation: "location details placeholder",
      staff: staff.name,
      marketingChannel: "Replace me",
      date: format(new Date(appointment.startTime), "yyyy-MM-dd"),
      time: format(new Date(appointment.startTime), "HH:mm"),
      inOutTime: `${format(new Date(appointment.startTime), "HH:mm")} - ${format(new Date(appointment.endTime), "HH:mm")}`,
      course: getCourseById(appointment.serviceId)?.name || "N/A",
      freeExtension: "0",
      designation: "N/A",
      designationFee: "0円",
      options: {},
      transportationFee: 0,
      paymentMethod: "現金",
      discount: "なし",
      additionalFee: 0,
      totalPayment: appointment.price,
      storeRevenue: 0,
      staffRevenue: 0,
      staffBonusFee: 0,
      startTime: new Date(appointment.startTime),
      endTime: new Date(appointment.endTime),
      staffImage: staff.image,
      customerId: String(appointment.customerId)
    };
  };

  return (
    <div className="relative border-t">
      <ScrollArea className="w-full overflow-auto">
        <div className="flex">
          <div className="sticky left-0 z-10 bg-white border-r">
            <div className="w-[200px] h-12 border-b flex items-center px-4 font-bold">
              スタッフ名
            </div>
            {safeMap(filteredStaff, (member) => (
              <button
                key={member.id}
                className="w-[200px] h-20 border-b px-4 flex items-center group hover:opacity-75 transition-opacity"
                onClick={() => setSelectedStaff(member)}
              >
                {member.image && (
                  <img 
                    src={member.image}
                    alt={`${member.name}の写真`} 
                    className="max-h-12 max-w-12 object-contain"
                  />
                )}
                <div className="ml-2 flex flex-col justify-center">
                  <div className="font-medium whitespace-nowrap overflow-hidden text-ellipsis">
                    {member.name}
                  </div>
                  {member.workStart && member.workEnd ? (
                    <div className="text-sm text-gray-500 whitespace-nowrap">
                      {member.workStart.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      {" - "}
                      {member.workEnd.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </div>
                  ) : (
                    <div className="text-sm text-gray-500">休み</div>
                  )}
                </div>
              </button>
            ))}
          </div>

          <div className="flex-grow relative">
            <div className="flex h-12">
              {Array.from({ length: totalHours + 1 }).map((_, index) => (
                <div key={index} className="w-[100px] border-b border-r flex items-center justify-center">
                  {`${index + startHour}:00`}
                </div>
              ))}
            </div>

            {safeMap(filteredStaff, (member) => (
              <div key={member.id} className="flex h-20 border-b relative bg-gray-100">
                {safeMap(member.appointments, (appointment) => (
                  <div
                    key={appointment.id}
                    className={cn(
                      "absolute top-0 m-1 p-2 rounded cursor-pointer transition-colors z-0",
                      appointment.status === "provisional"
                        ? "bg-orange-100 border border-orange-200 hover:bg-orange-200"
                        : "bg-emerald-50 border border-emerald-200 hover:bg-emerald-100"
                    )}
                    style={{
                      ...getTimeBlockStyle(appointment.startTime, appointment.endTime),
                      height: "calc(100% - 8px)",
                    }}
                    onClick={() => setSelectedAppointmentState(convertToReservationData(appointment, member))}
                  >
                    <div className="flex flex-col justify-between h-full overflow-hidden">
                      <div>
                        <div className="font-medium text-xs truncate">{appointment.customerName}</div>
                        <div className="text-xs text-gray-500 truncate">
                          {appointment.startTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          -
                          {appointment.endTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </div>
                      </div>
                      <div className="flex justify-between items-end">
                        <div className="text-xs text-gray-500 truncate">
                          受付：{appointment.reservationTime}
                        </div>
                        {appointment.status === "provisional" ? (
                          <span className="inline-flex items-center justify-center bg-orange-600 text-white text-xs px-1 py-0 h-6 rounded-md">
                            仮予約
                          </span>
                        ) : (
                          <Button
                            variant="default"
                            size="sm"
                            className={cn(
                              "bg-emerald-600 text-white text-xs px-1 py-0 h-6"
                            )}
                          >
                            確定
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {safeMap(getAvailableSlots(member), (slot, index) => {
                  const timeSlots = generateTimeSlots(slot.startTime, slot.endTime);
                  const slotStyle = getTimeBlockStyle(slot.startTime, slot.endTime);
                  
                  return (
                    <div
                      key={`${member.id}-${index}`}
                      className={cn(
                        "absolute top-0 rounded",
                        "bg-emerald-100 transition-colors",
                        "flex items-stretch z-0"
                      )}
                      style={{
                        ...slotStyle,
                        height: "calc(100% - 2px)",
                        marginTop: "1px",
                        marginBottom: "1px",
                      }}
                    >
                      {safeMap(timeSlots, (timeSlot, timeIndex) => (
                        <button
                          key={timeIndex}
                          className={cn(
                            "relative flex flex-col items-center justify-center", 
                            "transition-colors",
                            selectedCustomer
                              ? "hover:bg-emerald-200"
                              : "opacity-50 cursor-not-allowed"
                          )}
                          style={{ 
                            width: `${100 / timeSlots.length}%`,
                            height: '100%'
                          }}
                          onClick={() => handleTimeSlotClick(slot, timeSlot.time)}
                          disabled={!selectedCustomer}
                          title={selectedCustomer ? undefined : "顧客を選択すると利用できます"}
                        >
                          <Circle className={cn(
                            "w-6 h-6 stroke-[3] absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2",
                            selectedCustomer ? "text-white" : "text-gray-300"
                          )} />
                          {timeSlot.isStart && (
                            <div className="absolute top-1 left-1 text-xs text-emerald-700 text-left whitespace-nowrap">
                              {timeSlot.time.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}-
                              <br />
                              {slot.duration}分
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  );
                })}

                {Array.from({ length: totalHours }).map((_, index) => (
                  <div key={index} className="w-[100px] border-r" />
                ))}
              </div>
            ))}
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
          id: selectedSlot?.staffId || "",
          name: selectedSlot?.staffName || ""
        }}
        selectedTime={selectedSlot?.startTime}
        selectedCustomer={selectedCustomer} // 追加
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
