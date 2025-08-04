/**
 * @design_doc   https://github.com/pon-1234/salon-management/issues/9
 * @related_to   Schedule, Shift, SchedulePattern (lib/cast-schedule/types.ts) - モックデータ生成
 * @known_issues None
 */

import type { Schedule, Shift, SchedulePattern, LeaveRequest } from './types'
import { generateId } from '../shared'
import { addDays, startOfWeek } from 'date-fns'

export function generateMockSchedule(castId: string, date: Date): Schedule {
  const now = new Date()

  return {
    id: generateId(),
    castId,
    date,
    shifts: [],
    isHoliday: false,
    createdAt: now,
    updatedAt: now,
  }
}

export function generateMockShift(scheduleId: string): Shift {
  const now = new Date()

  return {
    id: generateId(),
    scheduleId,
    startTime: '10:00',
    endTime: '18:00',
    breakStartTime: '14:00',
    breakEndTime: '15:00',
    status: 'confirmed',
    createdAt: now,
    updatedAt: now,
  }
}

export function generateMockWeeklySchedules(castId: string, weekStart: Date): Schedule[] {
  const schedules: Schedule[] = []

  // Create schedules for Monday, Wednesday, Friday
  const workDays = [1, 3, 5] // Monday = 1, Wednesday = 3, Friday = 5

  for (let i = 0; i < 7; i++) {
    const currentDate = addDays(weekStart, i)
    const dayOfWeek = currentDate.getDay()

    if (workDays.includes(dayOfWeek === 0 ? 7 : dayOfWeek)) {
      const schedule = generateMockSchedule(castId, currentDate)
      const shift = generateMockShift(schedule.id)
      schedule.shifts = [shift]
      schedules.push(schedule)
    }
  }

  return schedules
}

export function generateMockSchedulePattern(castId: string, dayOfWeek: number): SchedulePattern {
  const now = new Date()

  return {
    id: generateId(),
    castId,
    name: `${['日', '月', '火', '水', '木', '金', '土'][dayOfWeek]}曜日シフト`,
    dayOfWeek,
    startTime: '10:00',
    endTime: '18:00',
    breakStartTime: '14:00',
    breakEndTime: '15:00',
    isActive: true,
    createdAt: now,
    updatedAt: now,
  }
}

export function generateMockLeaveRequest(castId: string): LeaveRequest {
  const now = new Date()
  const startDate = addDays(now, 7)
  const endDate = addDays(now, 9)

  return {
    id: generateId(),
    castId,
    startDate,
    endDate,
    reason: '私用のため',
    status: 'pending',
    approvedBy: null,
    approvedAt: null,
    createdAt: now,
    updatedAt: now,
  }
}
