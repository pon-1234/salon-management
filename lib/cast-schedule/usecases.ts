/**
 * @design_doc   https://github.com/pon-1234/salon-management/issues/9
 * @related_to   CastScheduleRepository (lib/cast-schedule/repository.ts) - データアクセス層
 * @related_to   CastRepository (lib/cast/repository.ts) - キャスト情報取得
 * @known_issues None
 */

import type { CastScheduleRepository } from './repository'
import type { CastRepository } from '../cast/repository'
import type {
  WeeklyScheduleView,
  ScheduleStats,
  Schedule,
  LeaveRequest,
  ScheduleUser,
} from './types'
import type { WeeklySchedule, ScheduleFilters, CastScheduleEntry } from './old-types'
import { generateMockWeeklySchedule } from './old-data'
import { addDays, startOfWeek, endOfWeek } from 'date-fns'
import { formatInTimeZone, utcToZonedTime, zonedTimeToUtc } from 'date-fns-tz'
import { isTimeOverlapping } from './utils'
import { UnauthorizedScheduleOperationError } from './errors'
import { schedulePermissions } from './permissions'

const DEFAULT_TIME_ZONE = 'Asia/Tokyo'

// Utility function for parsing time from ISO string
function parseTimeFromISO(isoString: string): string {
  try {
    const date = new Date(isoString)
    if (Number.isNaN(date.getTime())) {
      return '00:00'
    }
    return formatInTimeZone(date, DEFAULT_TIME_ZONE, 'HH:mm')
  } catch {
    return '00:00'
  }
}

export class CastScheduleUseCases {
  constructor(
    private scheduleRepository?: CastScheduleRepository,
    private castRepository?: CastRepository
  ) {}

  // Old API compatibility method
  async getWeeklySchedule(filters: ScheduleFilters): Promise<WeeklySchedule> {
    // Ensure we always start from Monday
    const baseDate = utcToZonedTime(filters.date, DEFAULT_TIME_ZONE)
    const weekStartLocal = startOfWeek(baseDate, { weekStartsOn: 1 })
    const weekEndLocal = endOfWeek(baseDate, { weekStartsOn: 1 })
    const weekStartUtc = zonedTimeToUtc(weekStartLocal, DEFAULT_TIME_ZONE)
    const weekEndUtc = zonedTimeToUtc(weekEndLocal, DEFAULT_TIME_ZONE)

    try {
      const requestOptions: RequestInit = {
        credentials: 'include',
        cache: 'no-store',
      }

      // Fetch cast data
      const castResponse = await fetch('/api/cast', requestOptions)
      if (!castResponse.ok) {
        throw new Error('Failed to fetch cast data')
      }
      const castPayload = await castResponse.json()
      const casts = Array.isArray(castPayload?.data) ? castPayload.data : castPayload

      // Fetch schedule data for the week
      const scheduleResponse = await fetch(
        `/api/cast-schedule?startDate=${weekStartUtc.toISOString()}&endDate=${weekEndUtc.toISOString()}`,
        requestOptions
      )
      if (!scheduleResponse.ok) {
        throw new Error('Failed to fetch schedule data')
      }
      const schedulePayload = await scheduleResponse.json()
      const schedules = Array.isArray(schedulePayload?.data)
        ? schedulePayload.data
        : schedulePayload

      // Transform data to match the expected format
      const entries = this.transformToWeeklyScheduleEntries(casts, schedules, weekStartLocal)

      // Calculate statistics
      const stats = this.calculateWeeklyStats(entries)

      return {
        startDate: weekStartLocal,
        endDate: weekEndLocal,
        entries,
        stats,
      }
    } catch (error) {
      console.error('Error fetching weekly schedule:', error)
      // Fallback to mock data in case of error
      return generateMockWeeklySchedule(weekStartLocal)
    }
  }

  // Old API compatibility method
  async updateSchedule(
    castId: string,
    date: string,
    status: string,
    time?: { start: string; end: string }
  ): Promise<void> {
    // In a real application, this would update via an API
    console.log('Updating schedule:', { castId, date, status, time })
  }

  async getWeeklyScheduleView(weekStartDate: Date): Promise<WeeklyScheduleView> {
    if (!this.scheduleRepository || !this.castRepository) {
      throw new Error('Repositories are required for this method')
    }
    const weekStart = startOfWeek(weekStartDate, { weekStartsOn: 1 }) // Monday
    const weekEnd = endOfWeek(weekStartDate, { weekStartsOn: 1 })

    // Get all schedules for the week
    const schedules = await this.scheduleRepository!.findSchedulesByDateRange(weekStart, weekEnd)

    // Get all casts (to show all in the view)
    const allCasts = await this.castRepository!.getAll()

    // Build weekly view
    const weeklyView: WeeklyScheduleView = {
      weekStartDate: weekStart,
      schedules: allCasts.map((cast) => {
        const castSchedules = schedules.filter((s) => s.castId === cast.id)

        // Create daily schedules for all 7 days
        const dailySchedules = []
        for (let i = 0; i < 7; i++) {
          const currentDate = addDays(weekStart, i)
          const daySchedule = castSchedules.find(
            (s) => s.date.toDateString() === currentDate.toDateString()
          )

          dailySchedules.push({
            date: currentDate,
            shifts: daySchedule?.shifts || [],
            isHoliday: daySchedule?.isHoliday || false,
          })
        }

        return {
          castId: cast.id,
          castName: cast.name,
          dailySchedules,
        }
      }),
    }

    return weeklyView
  }

  async createScheduleFromPattern(
    patternId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Schedule[]> {
    if (!this.scheduleRepository) {
      throw new Error('Schedule repository is required for this method')
    }
    return this.scheduleRepository.applyPatternToDateRange(patternId, startDate, endDate)
  }

  async getScheduleStats(castId: string, startDate: Date, endDate: Date): Promise<ScheduleStats> {
    if (!this.scheduleRepository) {
      throw new Error('Schedule repository is required for this method')
    }
    const schedules = await this.scheduleRepository.findSchedulesByCastId(
      castId,
      startDate,
      endDate
    )

    let totalWorkHours = 0
    let workDays = 0
    let holidays = 0

    schedules.forEach((schedule) => {
      if (schedule.isHoliday) {
        holidays++
      } else if (schedule.shifts.length > 0) {
        workDays++

        // Calculate work hours for this day
        schedule.shifts.forEach((shift) => {
          const [startHour, startMin] = shift.startTime.split(':').map(Number)
          const [endHour, endMin] = shift.endTime.split(':').map(Number)

          const startMinutes = startHour * 60 + startMin
          const endMinutes = endHour * 60 + endMin
          const workMinutes = endMinutes - startMinutes

          // Subtract break time if exists
          if (shift.breakStartTime && shift.breakEndTime) {
            const [breakStartHour, breakStartMin] = shift.breakStartTime.split(':').map(Number)
            const [breakEndHour, breakEndMin] = shift.breakEndTime.split(':').map(Number)

            const breakStartMinutes = breakStartHour * 60 + breakStartMin
            const breakEndMinutes = breakEndHour * 60 + breakEndMin
            const breakMinutes = breakEndMinutes - breakStartMinutes

            totalWorkHours += (workMinutes - breakMinutes) / 60
          } else {
            totalWorkHours += workMinutes / 60
          }
        })
      }
    })

    return {
      castId,
      period: {
        from: startDate,
        to: endDate,
      },
      totalWorkDays: workDays,
      totalWorkHours,
      averageWorkHoursPerDay: workDays > 0 ? totalWorkHours / workDays : 0,
      holidayCount: holidays,
    }
  }

  async handleLeaveRequest(
    leaveRequestId: string,
    action: 'approved' | 'rejected',
    handledBy: string,
    user?: ScheduleUser
  ): Promise<LeaveRequest> {
    if (!this.scheduleRepository) {
      throw new Error('Schedule repository is required for this method')
    }

    // Check permissions if user is provided
    if (user && !schedulePermissions.canApproveLeaveRequest(user)) {
      throw new UnauthorizedScheduleOperationError(
        'handleLeaveRequest',
        'User does not have permission to approve/reject leave requests'
      )
    }

    let result: LeaveRequest

    if (action === 'approved') {
      result = await this.scheduleRepository.approveLeaveRequest(leaveRequestId, handledBy)

      // Update schedules to mark as holiday
      const schedules = await this.scheduleRepository.findSchedulesByCastId(
        result.castId,
        result.startDate,
        result.endDate
      )

      for (const schedule of schedules) {
        // Clear shifts and mark as holiday
        for (const shift of schedule.shifts) {
          await this.scheduleRepository.deleteShift(shift.id)
        }
        await this.scheduleRepository.updateSchedule(schedule.id, {
          isHoliday: true,
          notes: `休暇: ${result.reason}`,
        })
      }
    } else {
      result = await this.scheduleRepository.rejectLeaveRequest(leaveRequestId, handledBy)
    }

    return result
  }

  async checkScheduleConflicts(
    castId: string,
    date: Date,
    startTime: string,
    endTime: string
  ): Promise<boolean> {
    if (!this.scheduleRepository) {
      throw new Error('Schedule repository is required for this method')
    }
    const schedules = await this.scheduleRepository.findSchedulesByCastId(castId, date, date)

    if (schedules.length === 0) {
      return false
    }

    const schedule = schedules[0]

    const [newStartHour, newStartMin] = startTime.split(':').map(Number)
    const [newEndHour, newEndMin] = endTime.split(':').map(Number)
    const newStartMinutes = newStartHour * 60 + newStartMin
    const newEndMinutes = newEndHour * 60 + newEndMin

    for (const shift of schedule.shifts) {
      if (shift.status === 'cancelled') continue

      // Use utility function to handle overnight shifts
      if (isTimeOverlapping(startTime, endTime, shift.startTime, shift.endTime)) {
        return true
      }
    }

    return false
  }

  private transformToWeeklyScheduleEntries(
    casts: any[],
    schedules: any[],
    weekStart: Date
  ): CastScheduleEntry[] {
    return casts.map((cast) => {
      // Find all schedules for this cast
      const castSchedules = schedules.filter((s: any) => s.castId === cast.id)

      // Create schedule object for the week
      const weekSchedule: any = {}

      // Initialize all days of the week
      for (let i = 0; i < 7; i++) {
        const date = addDays(weekStart, i)
        const dateStr = formatInTimeZone(date, DEFAULT_TIME_ZONE, 'yyyy-MM-dd')

        // Find schedule for this specific date
        const daySchedule = castSchedules.find((s: any) => {
          const scheduleDate = new Date(s.date)
          return formatInTimeZone(scheduleDate, DEFAULT_TIME_ZONE, 'yyyy-MM-dd') === dateStr
        })

        if (daySchedule) {
          // Parse times using utility function
          const startTimeStr = parseTimeFromISO(daySchedule.startTime)
          const endTimeStr = parseTimeFromISO(daySchedule.endTime)

          weekSchedule[dateStr] = {
            type: '出勤予定',
            startTime: startTimeStr,
            endTime: endTimeStr,
          }
        } else {
          // No schedule means holiday
          weekSchedule[dateStr] = { type: '休日' }
        }
      }

      return {
        castId: cast.id,
        name: cast.name,
        nameKana: cast.nameKana || cast.name,
        age: cast.age,
        image: cast.image,
        hasPhone: true,
        hasBusinessContact: true,
        schedule: weekSchedule,
      }
    })
  }

  private calculateWeeklyStats(entries: CastScheduleEntry[]): {
    totalCast: number
    workingCast: number
    averageWorkingHours: number
    averageWorkingCast: number
  } {
    const totalCast = entries.length
    let totalWorkingDays = 0
    let totalWorkingHours = 0
    const dailyWorkingCasts: number[] = Array(7).fill(0)

    entries.forEach((entry) => {
      Object.entries(entry.schedule).forEach(([dateStr, schedule], dayIndex) => {
        if (schedule.type === '出勤予定' && schedule.startTime && schedule.endTime) {
          // Count working day
          totalWorkingDays++
          dailyWorkingCasts[dayIndex]++

          // Calculate hours
          const [startHour, startMin] = schedule.startTime.split(':').map(Number)
          const [endHour, endMin] = schedule.endTime.split(':').map(Number)

          let hours = endHour - startHour + (endMin - startMin) / 60
          // Handle overnight shifts
          if (hours <= 0) {
            hours += 24
          }

          totalWorkingHours += hours
        }
      })
    })

    const workingCast = entries.filter((entry) =>
      Object.values(entry.schedule).some((s) => s.type === '出勤予定')
    ).length

    const averageWorkingCast = dailyWorkingCasts.reduce((a, b) => a + b, 0) / 7
    const averageWorkingHours = workingCast > 0 ? totalWorkingHours / workingCast : 0

    return {
      totalCast,
      workingCast,
      averageWorkingHours: Math.round(averageWorkingHours * 10) / 10,
      averageWorkingCast: Math.round(averageWorkingCast * 10) / 10,
    }
  }
}
