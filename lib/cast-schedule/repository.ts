/**
 * @design_doc   https://github.com/pon-1234/salon-management/issues/9
 * @related_to   Schedule, Shift, SchedulePattern, LeaveRequest (lib/cast-schedule/types.ts) - ドメインモデル
 * @known_issues None
 */

import type { Schedule, Shift, SchedulePattern, LeaveRequest } from './types'

export interface CastScheduleRepository {
  // Schedule operations
  findScheduleById(id: string): Promise<Schedule | null>
  findSchedulesByCastId(castId: string, startDate: Date, endDate: Date): Promise<Schedule[]>
  findSchedulesByDateRange(startDate: Date, endDate: Date): Promise<Schedule[]>
  createSchedule(schedule: Omit<Schedule, 'id' | 'createdAt' | 'updatedAt'>): Promise<Schedule>
  updateSchedule(id: string, schedule: Partial<Schedule>): Promise<Schedule>
  deleteSchedule(id: string): Promise<void>

  // Shift operations
  createShift(
    scheduleId: string,
    shift: Omit<Shift, 'id' | 'scheduleId' | 'createdAt' | 'updatedAt'>
  ): Promise<Shift>
  updateShift(id: string, shift: Partial<Shift>): Promise<Shift>
  deleteShift(id: string): Promise<void>

  // Pattern operations
  findPatternsByCastId(castId: string): Promise<SchedulePattern[]>
  createPattern(
    pattern: Omit<SchedulePattern, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<SchedulePattern>
  updatePattern(id: string, pattern: Partial<SchedulePattern>): Promise<SchedulePattern>
  deletePattern(id: string): Promise<void>
  applyPatternToDateRange(patternId: string, startDate: Date, endDate: Date): Promise<Schedule[]>

  // Leave request operations
  findLeaveRequestsByCastId(castId: string): Promise<LeaveRequest[]>
  findPendingLeaveRequests(): Promise<LeaveRequest[]>
  createLeaveRequest(
    request: Omit<LeaveRequest, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<LeaveRequest>
  updateLeaveRequest(id: string, request: Partial<LeaveRequest>): Promise<LeaveRequest>
  approveLeaveRequest(id: string, approvedBy: string): Promise<LeaveRequest>
  rejectLeaveRequest(id: string, rejectedBy: string): Promise<LeaveRequest>
}
