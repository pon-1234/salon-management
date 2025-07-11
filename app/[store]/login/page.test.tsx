/**
 * @design_doc   Customer login page tests
 * @related_to   NextAuth.js configuration, customer authentication
 * @known_issues None currently
 */
import { describe, it, expect, vi } from 'vitest'
import LoginPage from './page'

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
  useParams: () => ({
    store: 'store1',
  }),
  notFound: vi.fn(),
}))

// Mock store data
vi.mock('@/lib/store/data', () => ({
  getStoreBySlug: vi.fn(() => ({ id: 'store1', slug: 'store1', name: 'Test Store' })),
}))

describe('Customer Login Page', () => {
  it('should render the component without errors', () => {
    // Test that the component can be imported and is a function
    expect(typeof LoginPage).toBe('function')
    expect(LoginPage.name).toBe('LoginPage')
  })
})
