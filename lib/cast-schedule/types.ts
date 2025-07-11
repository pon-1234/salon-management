/**
 * @design_doc   https://github.com/pon-1234/salon-management/issues/9
 * @related_to   Cast (lib/cast/types.ts) - キャスト基本情報との連携
 * @known_issues None
 */

import { BaseEntity } from '../shared'

export type ShiftStatus = 'draft' | 'confirmed' | 'cancelled'

export interface Shift extends BaseEntity {
  scheduleId: string
  startTime: string // HH:mm format
  endTime: string // HH:mm format
  breakStartTime?: string // HH:mm format
  breakEndTime?: string // HH:mm format
  status: ShiftStatus
}

export interface Schedule extends BaseEntity {
  castId: string
  date: Date
  shifts: Shift[]
  isHoliday: boolean
  notes?: string
}

export interface SchedulePattern extends BaseEntity {
  castId: string
  name: string
  dayOfWeek: number // 0-6 (Sunday to Saturday)
  startTime: string // HH:mm format
  endTime: string // HH:mm format
  breakStartTime?: string // HH:mm format
  breakEndTime?: string // HH:mm format
  isActive: boolean
}

export type LeaveRequestStatus = 'pending' | 'approved' | 'rejected'

export interface LeaveRequest extends BaseEntity {
  castId: string
  startDate: Date
  endDate: Date
  reason: string
  status: LeaveRequestStatus
  approvedBy: string | null
  approvedAt: Date | null
}

// For UI display
export interface WeeklyScheduleView {
  weekStartDate: Date
  schedules: {
    castId: string
    castName: string
    dailySchedules: {
      date: Date
      shifts: Shift[]
      isHoliday: boolean
    }[]
  }[]
}

// For statistics
export interface ScheduleStats {
  castId: string
  period: {
    from: Date
    to: Date
  }
  totalWorkDays: number
  totalWorkHours: number
  averageWorkHoursPerDay: number
  holidayCount: number
}
