/**
 * @design_doc   Time slot picker component with availability checking
 * @related_to   quick-booking-dialog.tsx, use-availability.ts
 * @known_issues None currently
 */
'use client'

import { useState, useEffect, useMemo } from 'react'
import { formatInTimeZone } from 'date-fns-tz'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Clock, Loader2, AlertCircle } from 'lucide-react'
import { useAvailability } from '@/hooks/use-availability'
import { cn } from '@/lib/utils'
import { BusinessHoursRange } from '@/lib/settings/business-hours'

interface TimeSlotPickerProps {
  castId: string
  date: string
  duration: number
  selectedTime?: string
  onTimeSelect: (time: string) => void
  businessHours: BusinessHoursRange
  windowStart?: Date
  windowEnd?: Date
  stepMinutes?: number
}

export function TimeSlotPicker({
  castId,
  date,
  duration,
  selectedTime,
  onTimeSelect,
  businessHours,
  windowStart,
  windowEnd,
  stepMinutes = 30,
}: TimeSlotPickerProps) {
  const { loading, error, availableSlots, getAvailableSlots, generateTimeSlots, isSlotAvailable } =
    useAvailability()

  const [allSlots, setAllSlots] = useState<
    Array<{ startTime: string; endTime: string; available: boolean }>
  >([])

  useEffect(() => {
    if (castId && date && duration) {
      const slots = generateTimeSlots(date, duration, businessHours, stepMinutes)
      setAllSlots(slots.map((slot) => ({ ...slot, available: false })))

      getAvailableSlots(castId, date, duration, businessHours)
    }
  }, [castId, date, duration, businessHours, stepMinutes, generateTimeSlots, getAvailableSlots])

  useEffect(() => {
    setAllSlots((prev) =>
      prev.map((slot) => ({
        ...slot,
        available:
          availableSlots.length > 0 ? isSlotAvailable(slot, availableSlots) : false,
      }))
    )
  }, [availableSlots, isSlotAvailable])

  const windowStartMs = useMemo(() => windowStart?.getTime() ?? null, [windowStart])
  const windowEndMs = useMemo(() => windowEnd?.getTime() ?? null, [windowEnd])

  const visibleSlots = useMemo(() => {
    if (windowStartMs === null && windowEndMs === null) {
      return allSlots
    }
    return allSlots.filter((slot) => {
      const slotStart = new Date(slot.startTime).getTime()
      if (windowStartMs !== null && slotStart < windowStartMs) {
        return false
      }
      if (windowEndMs !== null && slotStart >= windowEndMs) {
        return false
      }
      return true
    })
  }, [allSlots, windowStartMs, windowEndMs])

  const formatTime = (isoString: string) => {
    return formatInTimeZone(new Date(isoString), 'Asia/Tokyo', 'HH:mm')
  }

  const availableCount = useMemo(
    () => visibleSlots.filter((slot) => slot.available).length,
    [visibleSlots]
  )

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
        <span className="ml-2 text-gray-500">空き時間を確認中...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg bg-red-50 p-4">
        <div className="flex items-center">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <span className="ml-2 text-red-600">空き時間の取得に失敗しました: {error}</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="flex items-center text-sm font-medium">
          <Clock className="mr-2 h-4 w-4" />
          時間を選択
        </h4>
        <Badge variant="outline">{availableCount} 枠空き</Badge>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
        {visibleSlots.map((slot, index) => {
          const timeStr = formatTime(slot.startTime)
          const isSelected = selectedTime === slot.startTime
          const isAvailable = slot.available

          return (
            <Button
              key={index}
              variant={isSelected ? 'default' : 'outline'}
              size="sm"
              disabled={!isAvailable}
              onClick={() => onTimeSelect(slot.startTime)}
              className={cn(
                'relative',
                !isAvailable && 'cursor-not-allowed opacity-50',
                isSelected && 'ring-2 ring-gray-900 ring-offset-2'
              )}
            >
              {timeStr}
              {!isAvailable && (
                <span className="absolute inset-0 flex items-center justify-center">
                  <span className="h-px w-full rotate-45 bg-gray-400" />
                </span>
              )}
            </Button>
          )
        })}
      </div>

      {visibleSlots.length === 0 && (
        <div className="rounded-lg bg-gray-50 p-4 text-center text-gray-500">
          この日は予約可能な時間がありません
        </div>
      )}

      <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center gap-4">
          <div className="flex items-center">
            <div className="mr-1 h-3 w-3 rounded border border-gray-300 bg-white" />
            <span>予約可能</span>
          </div>
          <div className="flex items-center">
            <div className="mr-1 h-3 w-3 rounded border border-gray-300 bg-gray-100" />
            <span>予約不可</span>
          </div>
        </div>
      </div>
    </div>
  )
}
