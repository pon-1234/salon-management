import { describe, it, expect } from 'vitest'
import {
  ScheduleError,
  ScheduleNotFoundError,
  ShiftNotFoundError,
  PatternNotFoundError,
  LeaveRequestNotFoundError,
  ShiftConflictError,
  InvalidTimeFormatError,
  InvalidDateRangeError,
  UnauthorizedScheduleOperationError,
} from './errors'

describe('Schedule Errors', () => {
  it('should create ScheduleNotFoundError with correct properties', () => {
    const error = new ScheduleNotFoundError('schedule-123')

    expect(error).toBeInstanceOf(ScheduleError)
    expect(error).toBeInstanceOf(Error)
    expect(error.name).toBe('ScheduleNotFoundError')
    expect(error.scheduleId).toBe('schedule-123')
    expect(error.message).toBe('Schedule with id schedule-123 not found')
  })

  it('should create ShiftNotFoundError with correct properties', () => {
    const error = new ShiftNotFoundError('shift-456')

    expect(error).toBeInstanceOf(ScheduleError)
    expect(error.name).toBe('ShiftNotFoundError')
    expect(error.shiftId).toBe('shift-456')
    expect(error.message).toBe('Shift with id shift-456 not found')
  })

  it('should create PatternNotFoundError with correct properties', () => {
    const error = new PatternNotFoundError('pattern-789')

    expect(error).toBeInstanceOf(ScheduleError)
    expect(error.name).toBe('PatternNotFoundError')
    expect(error.patternId).toBe('pattern-789')
    expect(error.message).toBe('Pattern with id pattern-789 not found')
  })

  it('should create LeaveRequestNotFoundError with correct properties', () => {
    const error = new LeaveRequestNotFoundError('leave-101')

    expect(error).toBeInstanceOf(ScheduleError)
    expect(error.name).toBe('LeaveRequestNotFoundError')
    expect(error.leaveRequestId).toBe('leave-101')
    expect(error.message).toBe('Leave request with id leave-101 not found')
  })

  it('should create ShiftConflictError with correct properties', () => {
    const date = new Date('2024-01-15')
    const error = new ShiftConflictError('cast-1', date, { start: '10:00', end: '12:00' })

    expect(error).toBeInstanceOf(ScheduleError)
    expect(error.name).toBe('ShiftConflictError')
    expect(error.castId).toBe('cast-1')
    expect(error.date).toEqual(date)
    expect(error.conflictingTimes).toEqual({ start: '10:00', end: '12:00' })
    expect(error.message).toContain('Shift conflict for cast cast-1')
  })

  it('should create InvalidTimeFormatError with correct properties', () => {
    const error = new InvalidTimeFormatError('25:99')

    expect(error).toBeInstanceOf(ScheduleError)
    expect(error.name).toBe('InvalidTimeFormatError')
    expect(error.time).toBe('25:99')
    expect(error.message).toBe('Invalid time format: 25:99. Expected HH:mm format')
  })

  it('should create InvalidDateRangeError with correct properties', () => {
    const startDate = new Date('2024-01-20')
    const endDate = new Date('2024-01-15')
    const error = new InvalidDateRangeError(startDate, endDate)

    expect(error).toBeInstanceOf(ScheduleError)
    expect(error.name).toBe('InvalidDateRangeError')
    expect(error.startDate).toEqual(startDate)
    expect(error.endDate).toEqual(endDate)
    expect(error.message).toContain('Invalid date range')
  })

  it('should create UnauthorizedScheduleOperationError with reason', () => {
    const error = new UnauthorizedScheduleOperationError('approveLeave', 'Insufficient permissions')

    expect(error).toBeInstanceOf(ScheduleError)
    expect(error.name).toBe('UnauthorizedScheduleOperationError')
    expect(error.operation).toBe('approveLeave')
    expect(error.reason).toBe('Insufficient permissions')
    expect(error.message).toBe('Unauthorized operation: approveLeave - Insufficient permissions')
  })

  it('should create UnauthorizedScheduleOperationError without reason', () => {
    const error = new UnauthorizedScheduleOperationError('deleteSchedule')

    expect(error.message).toBe('Unauthorized operation: deleteSchedule')
    expect(error.reason).toBeUndefined()
  })
})
