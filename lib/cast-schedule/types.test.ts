import { describe, it, expect } from 'vitest'
import type { Schedule, Shift, ShiftStatus, SchedulePattern, LeaveRequest } from './types'

describe('CastSchedule types', () => {
  it('should create a valid Schedule', () => {
    const schedule: Schedule = {
      id: 'schedule-1',
      castId: 'cast-1',
      date: new Date('2024-01-15'),
      shifts: [
        {
          id: 'shift-1',
          scheduleId: 'schedule-1',
          startTime: '10:00',
          endTime: '18:00',
          breakStartTime: '14:00',
          breakEndTime: '15:00',
          status: 'confirmed',
          createdAt: new Date('2024-01-01T00:00:00Z'),
          updatedAt: new Date('2024-01-01T00:00:00Z'),
        },
      ],
      isHoliday: false,
      notes: '通常シフト',
      createdAt: new Date('2024-01-01T00:00:00Z'),
      updatedAt: new Date('2024-01-01T00:00:00Z'),
    }

    expect(schedule.id).toBe('schedule-1')
    expect(schedule.castId).toBe('cast-1')
    expect(schedule.date).toEqual(new Date('2024-01-15'))
    expect(schedule.shifts).toHaveLength(1)
    expect(schedule.shifts[0].startTime).toBe('10:00')
    expect(schedule.isHoliday).toBe(false)
  })

  it('should create a valid Shift', () => {
    const shift: Shift = {
      id: 'shift-1',
      scheduleId: 'schedule-1',
      startTime: '10:00',
      endTime: '18:00',
      breakStartTime: '14:00',
      breakEndTime: '15:00',
      status: 'confirmed',
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    expect(shift.id).toBe('shift-1')
    expect(shift.startTime).toBe('10:00')
    expect(shift.endTime).toBe('18:00')
    expect(shift.breakStartTime).toBe('14:00')
    expect(shift.breakEndTime).toBe('15:00')
    expect(shift.status).toBe('confirmed')
  })

  it('should handle schedule without breaks', () => {
    const shift: Shift = {
      id: 'shift-2',
      scheduleId: 'schedule-1',
      startTime: '18:00',
      endTime: '23:00',
      status: 'confirmed',
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    expect(shift.breakStartTime).toBeUndefined()
    expect(shift.breakEndTime).toBeUndefined()
  })

  it('should support different shift statuses', () => {
    const statuses: ShiftStatus[] = ['draft', 'confirmed', 'cancelled']

    statuses.forEach((status) => {
      const shift: Shift = {
        id: 'shift-1',
        scheduleId: 'schedule-1',
        startTime: '10:00',
        endTime: '18:00',
        status,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      expect(shift.status).toBe(status)
    })
  })

  it('should create a valid SchedulePattern for regular patterns', () => {
    const pattern: SchedulePattern = {
      id: 'pattern-1',
      castId: 'cast-1',
      name: '通常シフト',
      dayOfWeek: 1, // Monday
      startTime: '10:00',
      endTime: '18:00',
      breakStartTime: '14:00',
      breakEndTime: '15:00',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    expect(pattern.dayOfWeek).toBe(1)
    expect(pattern.startTime).toBe('10:00')
    expect(pattern.isActive).toBe(true)
  })

  it('should create a valid LeaveRequest', () => {
    const leaveRequest: LeaveRequest = {
      id: 'leave-1',
      castId: 'cast-1',
      startDate: new Date('2024-01-20'),
      endDate: new Date('2024-01-22'),
      reason: '私用のため',
      status: 'pending',
      approvedBy: null,
      approvedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    expect(leaveRequest.startDate).toEqual(new Date('2024-01-20'))
    expect(leaveRequest.endDate).toEqual(new Date('2024-01-22'))
    expect(leaveRequest.status).toBe('pending')
    expect(leaveRequest.approvedBy).toBeNull()
  })
})
