import { describe, it, expect } from 'vitest'
import {
  formatScheduleDate,
  formatDisplayDate,
  formatDayOfWeek,
  getWeekDates,
  validateTimeFormat,
  parseTime,
  timeToMinutes,
  minutesToTime,
  isTimeOverlapping,
} from './utils'
import { InvalidTimeFormatError } from './errors'

describe('Schedule Utils', () => {
  describe('formatScheduleDate', () => {
    it('should format date as yyyy-MM-dd', () => {
      const date = new Date('2024-01-15T10:30:00')
      expect(formatScheduleDate(date)).toBe('2024-01-15')
    })
  })

  describe('formatDisplayDate', () => {
    it('should format date as MM/dd', () => {
      const date = new Date('2024-01-15')
      expect(formatDisplayDate(date)).toBe('01/15')
    })
  })

  describe('formatDayOfWeek', () => {
    it('should format day of week in Japanese', () => {
      const monday = new Date('2024-01-15') // Monday
      expect(formatDayOfWeek(monday)).toBe('(月)')
    })
  })

  describe('getWeekDates', () => {
    it('should return 7 consecutive dates starting from given date', () => {
      const startDate = new Date('2024-01-15')
      const dates = getWeekDates(startDate)

      expect(dates).toHaveLength(7)
      expect(dates[0]).toEqual(new Date('2024-01-15'))
      expect(dates[6]).toEqual(new Date('2024-01-21'))
    })
  })

  describe('validateTimeFormat', () => {
    it('should validate correct time formats', () => {
      expect(validateTimeFormat('09:00')).toBe(true)
      expect(validateTimeFormat('23:59')).toBe(true)
      expect(validateTimeFormat('0:00')).toBe(true)
      expect(validateTimeFormat('12:30')).toBe(true)
    })

    it('should reject invalid time formats', () => {
      expect(validateTimeFormat('25:00')).toBe(false)
      expect(validateTimeFormat('12:60')).toBe(false)
      expect(validateTimeFormat('12:5')).toBe(false)
      expect(validateTimeFormat('12')).toBe(false)
      expect(validateTimeFormat('abc:def')).toBe(false)
    })
  })

  describe('parseTime', () => {
    it('should parse valid time string', () => {
      expect(parseTime('10:30')).toEqual({ hours: 10, minutes: 30 })
      expect(parseTime('00:00')).toEqual({ hours: 0, minutes: 0 })
      expect(parseTime('23:59')).toEqual({ hours: 23, minutes: 59 })
    })

    it('should throw error for invalid time format', () => {
      expect(() => parseTime('25:00')).toThrow(InvalidTimeFormatError)
      expect(() => parseTime('invalid')).toThrow(InvalidTimeFormatError)
    })
  })

  describe('timeToMinutes', () => {
    it('should convert time to minutes', () => {
      expect(timeToMinutes('00:00')).toBe(0)
      expect(timeToMinutes('01:00')).toBe(60)
      expect(timeToMinutes('10:30')).toBe(630)
      expect(timeToMinutes('23:59')).toBe(1439)
    })
  })

  describe('minutesToTime', () => {
    it('should convert minutes to time format', () => {
      expect(minutesToTime(0)).toBe('00:00')
      expect(minutesToTime(60)).toBe('01:00')
      expect(minutesToTime(630)).toBe('10:30')
      expect(minutesToTime(1439)).toBe('23:59')
    })
  })

  describe('isTimeOverlapping', () => {
    it('should detect overlapping time ranges', () => {
      // Complete overlap
      expect(isTimeOverlapping('10:00', '12:00', '10:00', '12:00')).toBe(true)

      // Partial overlap
      expect(isTimeOverlapping('10:00', '12:00', '11:00', '13:00')).toBe(true)
      expect(isTimeOverlapping('11:00', '13:00', '10:00', '12:00')).toBe(true)

      // One contains the other
      expect(isTimeOverlapping('10:00', '14:00', '11:00', '13:00')).toBe(true)
      expect(isTimeOverlapping('11:00', '13:00', '10:00', '14:00')).toBe(true)
    })

    it('should detect non-overlapping time ranges', () => {
      expect(isTimeOverlapping('10:00', '12:00', '13:00', '15:00')).toBe(false)
      expect(isTimeOverlapping('13:00', '15:00', '10:00', '12:00')).toBe(false)
    })

    it('should handle overnight shifts', () => {
      // Overnight shift overlapping with morning shift
      expect(isTimeOverlapping('23:00', '02:00', '01:00', '03:00')).toBe(true)

      // Overnight shift overlapping with evening shift
      expect(isTimeOverlapping('22:00', '02:00', '23:00', '01:00')).toBe(true)

      // Non-overlapping overnight shifts
      expect(isTimeOverlapping('23:00', '02:00', '03:00', '05:00')).toBe(false)
      expect(isTimeOverlapping('23:00', '01:00', '02:00', '04:00')).toBe(false)
    })
  })
})
