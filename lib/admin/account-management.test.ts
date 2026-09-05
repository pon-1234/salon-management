/**
 * @design_doc https://app.notion.com/p/3ccdda8d8bde80ec928cc17adff35cde
 * @related_to account-management - store manager account boundaries
 * @known_issues Synthetic authorization fixtures only
 */
import { expect, it } from 'vitest'
import {
  canCreateStaffAccount,
  canEditAdminAccount,
  canChangeAdminAccess,
} from './account-management'
const manager = { id: 'manager', role: 'admin', adminRole: 'manager', storeIds: ['store-a'] }
const staff = { id: 'staff', role: 'staff', storeIds: ['store-a'] }
it('allows managers to create and manage only staff entirely within their stores', () => {
  expect(canCreateStaffAccount(manager, ['store-a'])).toBe(true)
  expect(canEditAdminAccount(manager, staff)).toBe(true)
  expect(canChangeAdminAccess(manager, staff)).toBe(true)
  for (const storeIds of [[], ['store-b'], ['store-a', 'store-b']]) {
    expect(canCreateStaffAccount(manager, storeIds)).toBe(false)
    expect(canEditAdminAccount(manager, { ...staff, storeIds })).toBe(false)
  }
  expect(canEditAdminAccount(manager, { ...staff, role: 'manager' })).toBe(false)
  expect(canEditAdminAccount(manager, { ...staff, role: 'super_admin' })).toBe(false)
})
it('allows self profile edits without granting self role or store changes', () => {
  const self = { id: manager.id, role: 'manager', storeIds: manager.storeIds }
  expect(canEditAdminAccount(manager, self)).toBe(true)
  expect(canChangeAdminAccess(manager, self)).toBe(false)
  expect(canCreateStaffAccount({ ...manager, adminRole: 'staff' }, ['store-a'])).toBe(false)
  expect(canEditAdminAccount({ ...manager, role: 'customer' }, self)).toBe(false)
})
