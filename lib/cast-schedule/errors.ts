/**
 * @design_doc   https://github.com/pon-1234/salon-management/issues/9
 * @related_to   Schedule, Shift, SchedulePattern, LeaveRequest - ドメイン固有のエラー定義
 * @known_issues None
 */

export class ScheduleError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ScheduleError'
  }
}

export class ScheduleNotFoundError extends ScheduleError {
  constructor(public readonly scheduleId: string) {
    super(`Schedule with id ${scheduleId} not found`)
    this.name = 'ScheduleNotFoundError'
  }
}

export class ShiftNotFoundError extends ScheduleError {
  constructor(public readonly shiftId: string) {
    super(`Shift with id ${shiftId} not found`)
    this.name = 'ShiftNotFoundError'
  }
}

export class PatternNotFoundError extends ScheduleError {
  constructor(public readonly patternId: string) {
    super(`Pattern with id ${patternId} not found`)
    this.name = 'PatternNotFoundError'
  }
}

export class LeaveRequestNotFoundError extends ScheduleError {
  constructor(public readonly leaveRequestId: string) {
    super(`Leave request with id ${leaveRequestId} not found`)
    this.name = 'LeaveRequestNotFoundError'
  }
}

export class ShiftConflictError extends ScheduleError {
  constructor(
    public readonly castId: string,
    public readonly date: Date,
    public readonly conflictingTimes: { start: string; end: string }
  ) {
    super(
      `Shift conflict for cast ${castId} on ${date.toISOString()}: ${conflictingTimes.start} - ${conflictingTimes.end}`
    )
    this.name = 'ShiftConflictError'
  }
}

export class InvalidTimeFormatError extends ScheduleError {
  constructor(public readonly time: string) {
    super(`Invalid time format: ${time}. Expected HH:mm format`)
    this.name = 'InvalidTimeFormatError'
  }
}

export class InvalidDateRangeError extends ScheduleError {
  constructor(
    public readonly startDate: Date,
    public readonly endDate: Date
  ) {
    super(
      `Invalid date range: start date ${startDate.toISOString()} is after end date ${endDate.toISOString()}`
    )
    this.name = 'InvalidDateRangeError'
  }
}

export class UnauthorizedScheduleOperationError extends ScheduleError {
  constructor(
    public readonly operation: string,
    public readonly reason?: string
  ) {
    super(`Unauthorized operation: ${operation}${reason ? ` - ${reason}` : ''}`)
    this.name = 'UnauthorizedScheduleOperationError'
  }
}
