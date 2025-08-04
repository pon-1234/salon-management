/**
 * @design_doc   https://github.com/pon-1234/salon-management/issues/9
 * @related_to   Schedule, Shift, SchedulePattern (lib/cast-schedule/types.ts) - モックデータ生成
 * @known_issues None
 * @no-test-required reason: This file contains no exports and is not used anywhere in the codebase
 */

import type { Schedule, Shift, SchedulePattern, LeaveRequest } from './types'
import { generateId } from '../shared'
import { addDays, startOfWeek } from 'date-fns'

/** @no-test-required reason: Unused internal function - not exported or referenced */
function generateMockSchedule(castId: string, date: Date): Schedule {
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

/** @no-test-required reason: Unused internal function - not exported or referenced */
function generateMockShift(scheduleId: string): Shift {
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
