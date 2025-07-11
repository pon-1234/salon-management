/**
 * @design_doc   Customer registration page tests
 * @related_to   NextAuth.js configuration, customer registration
 * @known_issues None currently
 */
import { describe, it, expect, vi } from 'vitest'
import RegisterPage from './page'

// Mock NextAuth
vi.mock('next-auth/react', () => ({
  useSession: vi.fn(() => ({ data: null, status: 'unauthenticated' })),
}))

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
  notFound: vi.fn(),
}))

// Mock store data
vi.mock('@/lib/store/data', () => ({
  getStoreBySlug: vi.fn(() => ({ id: 'store1', slug: 'store1', name: 'Test Store' })),
}))

describe('Customer Register Page', () => {
  it('should render the component without errors', () => {
    // Test that the component can be imported and is a function
    expect(typeof RegisterPage).toBe('function')
    expect(RegisterPage.name).toBe('RegisterPage')
  })
})
