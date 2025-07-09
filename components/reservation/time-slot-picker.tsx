/**
 * @design_doc   Time slot picker component with availability checking
 * @related_to   quick-booking-dialog.tsx, use-availability.ts
 * @known_issues None currently
 */
'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Clock, Loader2, AlertCircle } from 'lucide-react'
import { useAvailability } from '@/hooks/use-availability'
import { cn } from '@/lib/utils'

interface TimeSlotPickerProps {
  castId: string
  date: Date
  duration: number
  selectedTime?: string
  onTimeSelect: (time: string) => void
}

export function TimeSlotPicker({
  castId,
  date,
  duration,
  selectedTime,
  onTimeSelect,
}: TimeSlotPickerProps) {
  const { loading, error, availableSlots, getAvailableSlots, generateTimeSlots, isSlotAvailable } =
    useAvailability()

  const [allSlots, setAllSlots] = useState<
    Array<{ startTime: string; endTime: string; available: boolean }>
  >([])

  useEffect(() => {
    if (castId && date && duration) {
      // Generate all possible time slots
      const slots = generateTimeSlots(date, duration)
      setAllSlots(slots.map((slot) => ({ ...slot, available: false })))

      // Fetch available slots
      getAvailableSlots(castId, date, duration)
    }
  }, [castId, date, duration, generateTimeSlots, getAvailableSlots])

  useEffect(() => {
    // Update slot availability based on fetched data
    if (availableSlots.length > 0) {
      const updatedSlots = allSlots.map((slot) => ({
        ...slot,
        available: isSlotAvailable(slot, availableSlots),
      }))
      setAllSlots(updatedSlots)
    }
  }, [availableSlots, allSlots, isSlotAvailable])

  const formatTime = (isoString: string) => {
    return format(new Date(isoString), 'HH:mm')
  }

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
        <Badge variant="outline">{availableSlots.filter((s) => s.available).length} 枠空き</Badge>
      </div>

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
        {allSlots.map((slot, index) => {
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

      {allSlots.length === 0 && (
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
