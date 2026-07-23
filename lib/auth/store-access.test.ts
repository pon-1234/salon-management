/**
 * @design_doc   Multi-store administrator authorization boundary
 * @related_to   auth/config.ts, auth/utils.ts, AdminStoreAssignment
 * @known_issues Customer cross-store membership is a separate migration decision
 */
import { describe, expect, it } from 'vitest'
import { canAdminAccessStore } from './store-access'

describe('canAdminAccessStore', () => {
  it('allows a super administrator to access every store', () => {
    expect(
      canAdminAccessStore(
        { role: 'admin', adminRole: 'super_admin', permissions: ['*'], storeIds: [] },
        'shinjuku'
      )
    ).toBe(true)
  })

  it('allows a manager to access an assigned store', () => {
    expect(
      canAdminAccessStore(
        {
          role: 'admin',
          adminRole: 'manager',
          permissions: ['reservation:*'],
          storeIds: ['ginza'],
        },
        'ginza'
      )
    ).toBe(true)
  })

  it('denies a manager access to an unassigned store', () => {
    expect(
      canAdminAccessStore(
        {
          role: 'admin',
          adminRole: 'manager',
          permissions: ['reservation:*'],
          storeIds: ['ginza'],
        },
        'shinjuku'
      )
    ).toBe(false)
  })

  it('fails closed for missing or malformed assignments', () => {
    expect(
      canAdminAccessStore(
        { role: 'admin', adminRole: 'staff', permissions: ['reservation:read'] },
        'ikebukuro'
      )
    ).toBe(false)
    expect(canAdminAccessStore({ role: 'customer' }, 'ikebukuro')).toBe(false)
  })
})
