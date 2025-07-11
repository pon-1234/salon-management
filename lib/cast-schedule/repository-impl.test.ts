import { describe, it, expect, beforeEach } from 'vitest'
import { CastScheduleRepositoryImpl } from './repository-impl'
import type { Schedule, Shift, SchedulePattern, LeaveRequest } from './types'

describe('CastScheduleRepositoryImpl', () => {
  let repository: CastScheduleRepositoryImpl

  beforeEach(() => {
    repository = new CastScheduleRepositoryImpl()
  })

  describe('Schedule operations', () => {
    it('should create and find a schedule', async () => {
      const newSchedule = {
        castId: 'cast-1',
        date: new Date('2024-01-15'),
        shifts: [],
        isHoliday: false,
        notes: 'Test schedule',
      }

      const created = await repository.createSchedule(newSchedule)
      expect(created.id).toBeDefined()
      expect(created.castId).toBe('cast-1')
      expect(created.date).toEqual(new Date('2024-01-15'))
      expect(created.createdAt).toBeInstanceOf(Date)
      expect(created.updatedAt).toBeInstanceOf(Date)

      const found = await repository.findScheduleById(created.id)
      expect(found).toEqual(created)
    })

    it('should find schedules by cast ID and date range', async () => {
      // Create multiple schedules
      await repository.createSchedule({
        castId: 'cast-1',
        date: new Date('2024-01-15'),
        shifts: [],
        isHoliday: false,
      })
      await repository.createSchedule({
        castId: 'cast-1',
        date: new Date('2024-01-16'),
        shifts: [],
        isHoliday: false,
      })
      await repository.createSchedule({
        castId: 'cast-2',
        date: new Date('2024-01-15'),
        shifts: [],
        isHoliday: false,
      })

      const schedules = await repository.findSchedulesByCastId(
        'cast-1',
        new Date('2024-01-14'),
        new Date('2024-01-17')
      )

      expect(schedules).toHaveLength(2)
      expect(schedules.every((s) => s.castId === 'cast-1')).toBe(true)
    })

    it('should update a schedule', async () => {
      const created = await repository.createSchedule({
        castId: 'cast-1',
        date: new Date('2024-01-15'),
        shifts: [],
        isHoliday: false,
        notes: 'Original note',
      })

      // Add small delay to ensure different timestamps
      await new Promise((resolve) => setTimeout(resolve, 10))

      const updated = await repository.updateSchedule(created.id, {
        notes: 'Updated note',
        isHoliday: true,
      })

      expect(updated.notes).toBe('Updated note')
      expect(updated.isHoliday).toBe(true)
      expect(updated.updatedAt.getTime()).toBeGreaterThan(created.updatedAt.getTime())
    })

    it('should delete a schedule', async () => {
      const created = await repository.createSchedule({
        castId: 'cast-1',
        date: new Date('2024-01-15'),
        shifts: [],
        isHoliday: false,
      })

      await repository.deleteSchedule(created.id)
      const found = await repository.findScheduleById(created.id)
      expect(found).toBeNull()
    })
  })

  describe('Shift operations', () => {
    it('should create and manage shifts', async () => {
      const schedule = await repository.createSchedule({
        castId: 'cast-1',
        date: new Date('2024-01-15'),
        shifts: [],
        isHoliday: false,
      })

      const shift = await repository.createShift(schedule.id, {
        startTime: '10:00',
        endTime: '18:00',
        breakStartTime: '14:00',
        breakEndTime: '15:00',
        status: 'confirmed',
      })

      expect(shift.id).toBeDefined()
      expect(shift.scheduleId).toBe(schedule.id)
      expect(shift.startTime).toBe('10:00')

      // Check that shift is added to schedule
      const updatedSchedule = await repository.findScheduleById(schedule.id)
      expect(updatedSchedule?.shifts).toHaveLength(1)
      expect(updatedSchedule?.shifts[0]).toEqual(shift)
    })

    it('should update a shift', async () => {
      const schedule = await repository.createSchedule({
        castId: 'cast-1',
        date: new Date('2024-01-15'),
        shifts: [],
        isHoliday: false,
      })

      const shift = await repository.createShift(schedule.id, {
        startTime: '10:00',
        endTime: '18:00',
        status: 'draft',
      })

      const updated = await repository.updateShift(shift.id, {
        status: 'confirmed',
        endTime: '19:00',
      })

      expect(updated.status).toBe('confirmed')
      expect(updated.endTime).toBe('19:00')
    })
  })

  describe('Pattern operations', () => {
    it('should create and find patterns', async () => {
      const pattern = await repository.createPattern({
        castId: 'cast-1',
        name: '通常シフト',
        dayOfWeek: 1,
        startTime: '10:00',
        endTime: '18:00',
        breakStartTime: '14:00',
        breakEndTime: '15:00',
        isActive: true,
      })

      expect(pattern.id).toBeDefined()
      expect(pattern.name).toBe('通常シフト')

      const patterns = await repository.findPatternsByCastId('cast-1')
      expect(patterns).toHaveLength(1)
      expect(patterns[0]).toEqual(pattern)
    })

    it('should apply pattern to date range', async () => {
      const pattern = await repository.createPattern({
        castId: 'cast-1',
        name: '月曜シフト',
        dayOfWeek: 1, // Monday
        startTime: '10:00',
        endTime: '18:00',
        isActive: true,
      })

      // Apply pattern to a week (Jan 15-21, 2024, where Jan 15 is Monday)
      const schedules = await repository.applyPatternToDateRange(
        pattern.id,
        new Date('2024-01-15'),
        new Date('2024-01-21')
      )

      // Should create schedules for Jan 15 (Monday)
      expect(schedules).toHaveLength(1)
      expect(schedules[0].date.getDay()).toBe(1) // Monday
      expect(schedules[0].shifts).toHaveLength(1)
      expect(schedules[0].shifts[0].startTime).toBe('10:00')
    })
  })

  describe('Leave request operations', () => {
    it('should create and manage leave requests', async () => {
      const request = await repository.createLeaveRequest({
        castId: 'cast-1',
        startDate: new Date('2024-01-20'),
        endDate: new Date('2024-01-22'),
        reason: '私用のため',
        status: 'pending',
        approvedBy: null,
        approvedAt: null,
      })

      expect(request.id).toBeDefined()
      expect(request.status).toBe('pending')

      const requests = await repository.findLeaveRequestsByCastId('cast-1')
      expect(requests).toHaveLength(1)
    })

    it('should approve leave request', async () => {
      const request = await repository.createLeaveRequest({
        castId: 'cast-1',
        startDate: new Date('2024-01-20'),
        endDate: new Date('2024-01-22'),
        reason: '私用のため',
        status: 'pending',
        approvedBy: null,
        approvedAt: null,
      })

      const approved = await repository.approveLeaveRequest(request.id, 'manager-1')
      expect(approved.status).toBe('approved')
      expect(approved.approvedBy).toBe('manager-1')
      expect(approved.approvedAt).toBeInstanceOf(Date)
    })

    it('should find pending leave requests', async () => {
      await repository.createLeaveRequest({
        castId: 'cast-1',
        startDate: new Date('2024-01-20'),
        endDate: new Date('2024-01-22'),
        reason: '私用のため',
        status: 'pending',
        approvedBy: null,
        approvedAt: null,
      })

      await repository.createLeaveRequest({
        castId: 'cast-2',
        startDate: new Date('2024-01-25'),
        endDate: new Date('2024-01-26'),
        reason: '体調不良',
        status: 'approved',
        approvedBy: 'manager-1',
        approvedAt: new Date(),
      })

      const pending = await repository.findPendingLeaveRequests()
      expect(pending).toHaveLength(1)
      expect(pending[0].status).toBe('pending')
    })
  })
})
