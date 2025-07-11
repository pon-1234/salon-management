/**
 * @design_doc   https://github.com/pon-1234/salon-management/issues/9
 * @related_to   CastScheduleRepository (lib/cast-schedule/repository.ts) - データアクセス層
 * @related_to   CastRepository (lib/cast/repository.ts) - キャスト情報取得
 * @known_issues None
 */

import type { CastScheduleRepository } from './repository'
import type { CastRepository } from '../cast/repository'
import type { WeeklyScheduleView, ScheduleStats, Schedule, LeaveRequest } from './types'
import type { WeeklySchedule, ScheduleFilters } from './old-types'
import { generateMockWeeklySchedule } from './old-data'
import { addDays, startOfWeek, endOfWeek } from 'date-fns'

export class CastScheduleUseCases {
  constructor(
    private scheduleRepository?: CastScheduleRepository,
    private castRepository?: CastRepository
  ) {}

  // Old API compatibility method
  async getWeeklySchedule(filters: ScheduleFilters): Promise<WeeklySchedule> {
    // In a real application, this would fetch from an API
    // Ensure we always start from Monday
    const weekStart = startOfWeek(filters.date, { weekStartsOn: 1 })
    return generateMockWeeklySchedule(weekStart)
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
    handledBy: string
  ): Promise<LeaveRequest> {
    if (!this.scheduleRepository) {
      throw new Error('Schedule repository is required for this method')
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

      const [startHour, startMin] = shift.startTime.split(':').map(Number)
      const [endHour, endMin] = shift.endTime.split(':').map(Number)
      const startMinutes = startHour * 60 + startMin
      const endMinutes = endHour * 60 + endMin

      // Check for overlap
      if (
        (newStartMinutes >= startMinutes && newStartMinutes < endMinutes) ||
        (newEndMinutes > startMinutes && newEndMinutes <= endMinutes) ||
        (newStartMinutes <= startMinutes && newEndMinutes >= endMinutes)
      ) {
        return true
      }
    }

    return false
  }
}
