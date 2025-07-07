/**
 * @design_doc   Tests for custom authentication hooks
 * @related_to   NextAuth.js configuration, custom auth hooks
 * @known_issues None currently
 */
import { describe, it, expect, vi } from 'vitest'
import { useAuth, useAdminAuth, useCustomerAuth } from './use-auth'

// Mock NextAuth
vi.mock('next-auth/react', () => ({
  useSession: vi.fn(() => ({
    data: {
      user: {
        id: 'user1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'customer',
      }
    },
    status: 'authenticated'
  })),
  signIn: vi.fn(),
  signOut: vi.fn(),
}))

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
}))

describe('useAuth hook', () => {
  it('should be defined', () => {
    expect(useAuth).toBeDefined()
    expect(typeof useAuth).toBe('function')
  })

  it('should provide authentication utilities', () => {
    // Test that the hook exports the expected functions
    expect(useAuth).toBeDefined()
    expect(useAdminAuth).toBeDefined()
    expect(useCustomerAuth).toBeDefined()
  })
})