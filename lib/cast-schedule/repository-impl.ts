/**
 * @design_doc   https://github.com/pon-1234/salon-management/issues/9
 * @related_to   CastScheduleRepository (lib/cast-schedule/repository.ts) - インターフェース実装
 * @known_issues None
 */

import type { CastScheduleRepository } from './repository'
import type { Schedule, Shift, SchedulePattern, LeaveRequest } from './types'
import { generateId } from '../shared'

export class CastScheduleRepositoryImpl implements CastScheduleRepository {
  private schedules: Map<string, Schedule> = new Map()
  private shifts: Map<string, Shift> = new Map()
  private patterns: Map<string, SchedulePattern> = new Map()
  private leaveRequests: Map<string, LeaveRequest> = new Map()

  // Schedule operations
  async findScheduleById(id: string): Promise<Schedule | null> {
    return this.schedules.get(id) || null
  }

  async findSchedulesByCastId(castId: string, startDate: Date, endDate: Date): Promise<Schedule[]> {
    const schedules = Array.from(this.schedules.values())
      .filter((s) => s.castId === castId && s.date >= startDate && s.date <= endDate)
      .sort((a, b) => a.date.getTime() - b.date.getTime())
    return schedules
  }

  async findSchedulesByDateRange(startDate: Date, endDate: Date): Promise<Schedule[]> {
    const schedules = Array.from(this.schedules.values())
      .filter((s) => s.date >= startDate && s.date <= endDate)
      .sort((a, b) => a.date.getTime() - b.date.getTime())
    return schedules
  }

  async createSchedule(
    schedule: Omit<Schedule, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Schedule> {
    const now = new Date()
    const newSchedule: Schedule = {
      ...schedule,
      id: generateId(),
      createdAt: now,
      updatedAt: now,
    }
    this.schedules.set(newSchedule.id, newSchedule)
    return newSchedule
  }

  async updateSchedule(id: string, schedule: Partial<Schedule>): Promise<Schedule> {
    const existing = this.schedules.get(id)
    if (!existing) {
      throw new Error(`Schedule with id ${id} not found`)
    }

    const updated: Schedule = {
      ...existing,
      ...schedule,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: new Date(),
    }
    this.schedules.set(id, updated)
    return updated
  }

  async deleteSchedule(id: string): Promise<void> {
    const schedule = this.schedules.get(id)
    if (schedule) {
      // Delete associated shifts
      schedule.shifts.forEach((shift) => {
        this.shifts.delete(shift.id)
      })
      this.schedules.delete(id)
    }
  }

  // Shift operations
  async createShift(
    scheduleId: string,
    shift: Omit<Shift, 'id' | 'scheduleId' | 'createdAt' | 'updatedAt'>
  ): Promise<Shift> {
    const schedule = this.schedules.get(scheduleId)
    if (!schedule) {
      throw new Error(`Schedule with id ${scheduleId} not found`)
    }

    const now = new Date()
    const newShift: Shift = {
      ...shift,
      id: generateId(),
      scheduleId,
      createdAt: now,
      updatedAt: now,
    }

    this.shifts.set(newShift.id, newShift)

    // Add shift to schedule
    schedule.shifts.push(newShift)
    schedule.updatedAt = now
    this.schedules.set(scheduleId, schedule)

    return newShift
  }

  async updateShift(id: string, shift: Partial<Shift>): Promise<Shift> {
    const existing = this.shifts.get(id)
    if (!existing) {
      throw new Error(`Shift with id ${id} not found`)
    }

    const updated: Shift = {
      ...existing,
      ...shift,
      id: existing.id,
      scheduleId: existing.scheduleId,
      createdAt: existing.createdAt,
      updatedAt: new Date(),
    }
    this.shifts.set(id, updated)

    // Update shift in schedule
    const schedule = this.schedules.get(existing.scheduleId)
    if (schedule) {
      const shiftIndex = schedule.shifts.findIndex((s) => s.id === id)
      if (shiftIndex !== -1) {
        schedule.shifts[shiftIndex] = updated
        schedule.updatedAt = new Date()
        this.schedules.set(schedule.id, schedule)
      }
    }

    return updated
  }

  async deleteShift(id: string): Promise<void> {
    const shift = this.shifts.get(id)
    if (shift) {
      // Remove from schedule
      const schedule = this.schedules.get(shift.scheduleId)
      if (schedule) {
        schedule.shifts = schedule.shifts.filter((s) => s.id !== id)
        schedule.updatedAt = new Date()
        this.schedules.set(schedule.id, schedule)
      }
      this.shifts.delete(id)
    }
  }

  // Pattern operations
  async findPatternsByCastId(castId: string): Promise<SchedulePattern[]> {
    return Array.from(this.patterns.values())
      .filter((p) => p.castId === castId)
      .sort((a, b) => a.dayOfWeek - b.dayOfWeek)
  }

  async createPattern(
    pattern: Omit<SchedulePattern, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<SchedulePattern> {
    const now = new Date()
    const newPattern: SchedulePattern = {
      ...pattern,
      id: generateId(),
      createdAt: now,
      updatedAt: now,
    }
    this.patterns.set(newPattern.id, newPattern)
    return newPattern
  }

  async updatePattern(id: string, pattern: Partial<SchedulePattern>): Promise<SchedulePattern> {
    const existing = this.patterns.get(id)
    if (!existing) {
      throw new Error(`Pattern with id ${id} not found`)
    }

    const updated: SchedulePattern = {
      ...existing,
      ...pattern,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: new Date(),
    }
    this.patterns.set(id, updated)
    return updated
  }

  async deletePattern(id: string): Promise<void> {
    this.patterns.delete(id)
  }

  async applyPatternToDateRange(
    patternId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Schedule[]> {
    const pattern = this.patterns.get(patternId)
    if (!pattern) {
      throw new Error(`Pattern with id ${patternId} not found`)
    }

    const schedules: Schedule[] = []
    const currentDate = new Date(startDate)

    while (currentDate <= endDate) {
      if (currentDate.getDay() === pattern.dayOfWeek) {
        // Check if schedule already exists for this date
        const existingSchedule = Array.from(this.schedules.values()).find(
          (s) => s.castId === pattern.castId && s.date.toDateString() === currentDate.toDateString()
        )

        if (!existingSchedule) {
          const schedule = await this.createSchedule({
            castId: pattern.castId,
            date: new Date(currentDate),
            shifts: [],
            isHoliday: false,
            notes: `Applied from pattern: ${pattern.name}`,
          })

          const shift = await this.createShift(schedule.id, {
            startTime: pattern.startTime,
            endTime: pattern.endTime,
            breakStartTime: pattern.breakStartTime,
            breakEndTime: pattern.breakEndTime,
            status: 'confirmed',
          })

          schedules.push((await this.findScheduleById(schedule.id)) as Schedule)
        }
      }
      currentDate.setDate(currentDate.getDate() + 1)
    }

    return schedules
  }

  // Leave request operations
  async findLeaveRequestsByCastId(castId: string): Promise<LeaveRequest[]> {
    return Array.from(this.leaveRequests.values())
      .filter((r) => r.castId === castId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  }

  async findPendingLeaveRequests(): Promise<LeaveRequest[]> {
    return Array.from(this.leaveRequests.values())
      .filter((r) => r.status === 'pending')
      .sort((a, b) => a.startDate.getTime() - b.startDate.getTime())
  }

  async createLeaveRequest(
    request: Omit<LeaveRequest, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<LeaveRequest> {
    const now = new Date()
    const newRequest: LeaveRequest = {
      ...request,
      id: generateId(),
      createdAt: now,
      updatedAt: now,
    }
    this.leaveRequests.set(newRequest.id, newRequest)
    return newRequest
  }

  async updateLeaveRequest(id: string, request: Partial<LeaveRequest>): Promise<LeaveRequest> {
    const existing = this.leaveRequests.get(id)
    if (!existing) {
      throw new Error(`Leave request with id ${id} not found`)
    }

    const updated: LeaveRequest = {
      ...existing,
      ...request,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: new Date(),
    }
    this.leaveRequests.set(id, updated)
    return updated
  }

  async approveLeaveRequest(id: string, approvedBy: string): Promise<LeaveRequest> {
    return this.updateLeaveRequest(id, {
      status: 'approved',
      approvedBy,
      approvedAt: new Date(),
    })
  }

  async rejectLeaveRequest(id: string, rejectedBy: string): Promise<LeaveRequest> {
    return this.updateLeaveRequest(id, {
      status: 'rejected',
      approvedBy: rejectedBy,
      approvedAt: new Date(),
    })
  }
}
