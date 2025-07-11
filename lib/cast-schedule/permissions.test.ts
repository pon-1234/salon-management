import { describe, it, expect } from 'vitest'
import { schedulePermissions, checkPermission } from './permissions'
import type { ScheduleUser, Schedule } from './types'

describe('Schedule Permissions', () => {
  describe('canApproveLeaveRequest', () => {
    it('should allow admin to approve leave requests', () => {
      const admin: ScheduleUser = { id: 'admin-1', role: 'admin' }
      expect(schedulePermissions.canApproveLeaveRequest(admin)).toBe(true)
    })

    it('should allow manager to approve leave requests', () => {
      const manager: ScheduleUser = { id: 'manager-1', role: 'manager' }
      expect(schedulePermissions.canApproveLeaveRequest(manager)).toBe(true)
    })

    it('should deny cast without permission', () => {
      const cast: ScheduleUser = { id: 'cast-1', role: 'cast' }
      expect(schedulePermissions.canApproveLeaveRequest(cast)).toBe(false)
    })

    it('should allow staff with specific permission', () => {
      const staff: ScheduleUser = {
        id: 'staff-1',
        role: 'staff',
        permissions: ['approve_leave_request'],
      }
      expect(schedulePermissions.canApproveLeaveRequest(staff)).toBe(true)
    })
  })

  describe('canCreateSchedule', () => {
    it('should allow admin to create schedules', () => {
      const admin: ScheduleUser = { id: 'admin-1', role: 'admin' }
      expect(schedulePermissions.canCreateSchedule(admin)).toBe(true)
    })

    it('should allow manager to create schedules', () => {
      const manager: ScheduleUser = { id: 'manager-1', role: 'manager' }
      expect(schedulePermissions.canCreateSchedule(manager)).toBe(true)
    })

    it('should deny cast without permission', () => {
      const cast: ScheduleUser = { id: 'cast-1', role: 'cast' }
      expect(schedulePermissions.canCreateSchedule(cast)).toBe(false)
    })

    it('should allow cast with specific permission', () => {
      const cast: ScheduleUser = {
        id: 'cast-1',
        role: 'cast',
        permissions: ['create_schedule'],
      }
      expect(schedulePermissions.canCreateSchedule(cast)).toBe(true)
    })
  })

  describe('canEditSchedule', () => {
    const schedule: Schedule = {
      id: 'schedule-1',
      castId: 'cast-1',
      date: new Date('2024-01-15'),
      shifts: [],
      isHoliday: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    it('should allow admin to edit any schedule', () => {
      const admin: ScheduleUser = { id: 'admin-1', role: 'admin' }
      expect(schedulePermissions.canEditSchedule(admin, schedule)).toBe(true)
    })

    it('should allow manager to edit schedules', () => {
      const manager: ScheduleUser = { id: 'manager-1', role: 'manager' }
      expect(schedulePermissions.canEditSchedule(manager, schedule)).toBe(true)
    })

    it('should allow cast to edit own schedule with permission', () => {
      const cast: ScheduleUser = {
        id: 'cast-1',
        role: 'cast',
        permissions: ['edit_own_schedule'],
      }
      expect(schedulePermissions.canEditSchedule(cast, schedule)).toBe(true)
    })

    it('should deny cast to edit own schedule without permission', () => {
      const cast: ScheduleUser = { id: 'cast-1', role: 'cast' }
      expect(schedulePermissions.canEditSchedule(cast, schedule)).toBe(false)
    })

    it('should deny cast to edit other cast schedule', () => {
      const cast: ScheduleUser = {
        id: 'cast-2',
        role: 'cast',
        permissions: ['edit_own_schedule'],
      }
      expect(schedulePermissions.canEditSchedule(cast, schedule)).toBe(false)
    })
  })

  describe('canDeleteSchedule', () => {
    it('should allow only admin to delete schedules', () => {
      const admin: ScheduleUser = { id: 'admin-1', role: 'admin' }
      expect(schedulePermissions.canDeleteSchedule(admin)).toBe(true)
    })

    it('should deny manager to delete schedules', () => {
      const manager: ScheduleUser = { id: 'manager-1', role: 'manager' }
      expect(schedulePermissions.canDeleteSchedule(manager)).toBe(false)
    })

    it('should allow user with specific permission', () => {
      const staff: ScheduleUser = {
        id: 'staff-1',
        role: 'staff',
        permissions: ['delete_schedule'],
      }
      expect(schedulePermissions.canDeleteSchedule(staff)).toBe(true)
    })
  })

  describe('checkPermission helper', () => {
    it('should check permissions using helper function', () => {
      const admin: ScheduleUser = { id: 'admin-1', role: 'admin' }
      const cast: ScheduleUser = { id: 'cast-1', role: 'cast' }

      expect(checkPermission(admin, 'canApproveLeaveRequest')).toBe(true)
      expect(checkPermission(cast, 'canApproveLeaveRequest')).toBe(false)
      expect(checkPermission(admin, 'canCreateSchedule')).toBe(true)
      expect(checkPermission(admin, 'canDeleteSchedule')).toBe(true)
    })
  })
})
