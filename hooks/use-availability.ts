/**
 * @design_doc   Custom hook for checking reservation availability
 * @related_to   reservation/availability/route.ts, quick-booking-dialog.tsx
 * @known_issues None currently
 */
import { useState, useEffect, useCallback } from 'react'
import { format } from 'date-fns'

interface TimeSlot {
  startTime: string
  endTime: string
  available?: boolean
}

interface AvailabilityState {
  loading: boolean
  error: string | null
  availableSlots: TimeSlot[]
  conflicts: any[]
}

export function useAvailability() {
  const [state, setState] = useState<AvailabilityState>({
    loading: false,
    error: null,
    availableSlots: [],
    conflicts: [],
  })

  const checkAvailability = useCallback(async (castId: string, startTime: Date, endTime: Date) => {
    setState((prev) => ({ ...prev, loading: true, error: null }))

    try {
      const params = new URLSearchParams({
        castId,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
      })

      const response = await fetch(`/api/reservation/availability/check?${params}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to check availability')
      }

      setState({
        loading: false,
        error: null,
        availableSlots: [],
        conflicts: data.conflicts || [],
      })

      return data
    } catch (error) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }))
      return { available: false, conflicts: [] }
    }
  }, [])

  const getAvailableSlots = useCallback(async (castId: string, date: Date, duration: number) => {
    setState((prev) => ({ ...prev, loading: true, error: null }))

    try {
      const params = new URLSearchParams({
        castId,
        date: format(date, 'yyyy-MM-dd'),
        duration: duration.toString(),
      })

      const response = await fetch(`/api/reservation/availability?${params}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get available slots')
      }

      // Process slots to add availability status
      const slots = data.availableSlots || []
      const processedSlots = slots.map((slot: TimeSlot) => ({
        ...slot,
        available: true,
      }))

      setState({
        loading: false,
        error: null,
        availableSlots: processedSlots,
        conflicts: [],
      })

      return processedSlots
    } catch (error) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }))
      return []
    }
  }, [])

  const generateTimeSlots = useCallback(
    (date: Date, duration: number, workingHours = { start: '09:00', end: '18:00' }) => {
      const slots: TimeSlot[] = []
      const [startHour, startMinute] = workingHours.start.split(':').map(Number)
      const [endHour, endMinute] = workingHours.end.split(':').map(Number)

      const slotStart = new Date(date)
      slotStart.setHours(startHour, startMinute, 0, 0)

      const dayEnd = new Date(date)
      dayEnd.setHours(endHour, endMinute, 0, 0)

      const slotDurationMs = duration * 60 * 1000

      while (slotStart.getTime() + slotDurationMs <= dayEnd.getTime()) {
        const slotEnd = new Date(slotStart.getTime() + slotDurationMs)

        slots.push({
          startTime: slotStart.toISOString(),
          endTime: slotEnd.toISOString(),
        })

        // Move to next slot (30-minute intervals)
        slotStart.setMinutes(slotStart.getMinutes() + 30)
      }

      return slots
    },
    []
  )

  const isSlotAvailable = useCallback((slot: TimeSlot, availableSlots: TimeSlot[]) => {
    const slotStart = new Date(slot.startTime).getTime()
    const slotEnd = new Date(slot.endTime).getTime()

    return availableSlots.some((available) => {
      const availableStart = new Date(available.startTime).getTime()
      const availableEnd = new Date(available.endTime).getTime()

      // Check if the slot fits within an available time range
      return slotStart >= availableStart && slotEnd <= availableEnd
    })
  }, [])

  const reset = useCallback(() => {
    setState({
      loading: false,
      error: null,
      availableSlots: [],
      conflicts: [],
    })
  }, [])

  return {
    ...state,
    checkAvailability,
    getAvailableSlots,
    generateTimeSlots,
    isSlotAvailable,
    reset,
  }
}
