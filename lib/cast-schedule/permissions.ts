/**
 * @design_doc   https://github.com/pon-1234/salon-management/issues/9
 * @related_to   ScheduleUser, SchedulePermissions - 権限管理
 * @known_issues None
 */

import type { ScheduleUser, SchedulePermissions, Schedule } from './types'

export const schedulePermissions: SchedulePermissions = {
  canApproveLeaveRequest: (user: ScheduleUser): boolean => {
    // Admin and Manager can approve leave requests
    if (user.role === 'admin' || user.role === 'manager') {
      return true
    }

    // Check specific permissions
    if (user.permissions?.includes('approve_leave_request')) {
      return true
    }

    return false
  },

  canCreateSchedule: (user: ScheduleUser): boolean => {
    // Admin and Manager can create schedules
    if (user.role === 'admin' || user.role === 'manager') {
      return true
    }

    // Check specific permissions
    if (user.permissions?.includes('create_schedule')) {
      return true
    }

    return false
  },

  canEditSchedule: (user: ScheduleUser, schedule: Schedule): boolean => {
    // Admin can edit any schedule
    if (user.role === 'admin') {
      return true
    }

    // Manager can edit schedules
    if (user.role === 'manager') {
      return true
    }

    // Cast can edit their own schedule if they have permission
    if (user.role === 'cast' && schedule.castId === user.id) {
      return user.permissions?.includes('edit_own_schedule') || false
    }

    // Check specific permissions
    if (user.permissions?.includes('edit_schedule')) {
      return true
    }

    return false
  },

  canDeleteSchedule: (user: ScheduleUser): boolean => {
    // Only Admin can delete schedules
    if (user.role === 'admin') {
      return true
    }

    // Check specific permissions
    if (user.permissions?.includes('delete_schedule')) {
      return true
    }

    return false
  },
}

export function checkPermission(
  user: ScheduleUser,
  permission: keyof SchedulePermissions,
  ...args: any[]
): boolean {
  const permissionCheck = schedulePermissions[permission]
  // Type-safe call based on the permission type
  if (permission === 'canEditSchedule' && args.length > 0) {
    return (permissionCheck as (user: ScheduleUser, schedule: Schedule) => boolean)(user, args[0])
  }
  return (permissionCheck as (user: ScheduleUser) => boolean)(user)
}
