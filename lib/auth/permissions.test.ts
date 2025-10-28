import { describe, it, expect } from 'vitest'
import {
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  permissionMatches,
} from './permissions'

describe('Permission helpers', () => {
  describe('permissionMatches', () => {
    it('matches exact permission string', () => {
      expect(permissionMatches('analytics:read', 'analytics:read')).toBe(true)
      expect(permissionMatches('analytics:read', 'analytics:write')).toBe(false)
    })

    it('supports namespace wildcards', () => {
      expect(permissionMatches('analytics:*', 'analytics:read')).toBe(true)
      expect(permissionMatches('analytics:*', 'analytics')).toBe(true)
      expect(permissionMatches('analytics:*', 'reservation:read')).toBe(false)
    })

    it('respects global wildcard', () => {
      expect(permissionMatches('*', 'anything:goes')).toBe(true)
    })
  })

  describe('hasPermission', () => {
    it('returns true when the required permission is granted', () => {
      expect(hasPermission(['analytics:read'], 'analytics:read')).toBe(true)
    })

    it('returns false when no permissions are provided', () => {
      expect(hasPermission(undefined, 'analytics:read')).toBe(false)
      expect(hasPermission([], 'analytics:read')).toBe(false)
    })
  })

  describe('hasAnyPermission', () => {
    it('returns true if any of the permissions match', () => {
      expect(hasAnyPermission(['analytics:read'], ['reservation:read', 'analytics:read'])).toBe(
        true
      )
    })

    it('returns false when none match', () => {
      expect(hasAnyPermission(['reservation:read'], ['analytics:read', 'dashboard:view'])).toBe(
        false
      )
    })
  })

  describe('hasAllPermissions', () => {
    it('returns true only when all permissions are granted', () => {
      expect(
        hasAllPermissions(['analytics:*', 'dashboard:view'], ['analytics:read', 'dashboard:view'])
      ).toBe(true)
    })

    it('returns false when required permission is missing', () => {
      expect(
        hasAllPermissions(['analytics:read', 'dashboard:view'], ['analytics:read', 'cast:write'])
      ).toBe(false)
    })
  })
})
