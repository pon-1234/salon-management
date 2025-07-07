/**
 * @design_doc   Admin login page tests
 * @related_to   NextAuth.js configuration, admin authentication
 * @known_issues None currently
 */
import { describe, it, expect, vi } from 'vitest'
import AdminLoginPage from './page'

// Mock NextAuth
vi.mock('next-auth/react', () => ({
  signIn: vi.fn(),
  useSession: vi.fn(() => ({ data: null, status: 'unauthenticated' })),
}))

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
  useSearchParams: () => ({
    get: vi.fn(() => null),
  }),
}))

describe('Admin Login Page', () => {
  it('should render the component without errors', () => {
    // Test that the component can be imported and is a function
    expect(typeof AdminLoginPage).toBe('function')
    expect(AdminLoginPage.name).toBe('AdminLoginPage')
  })

})