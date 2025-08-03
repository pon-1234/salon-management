/**
 * @design_doc   Tests for custom authentication hooks
 * @related_to   NextAuth.js configuration, custom auth hooks
 * @known_issues None currently
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAuth, useAdminAuth, useCustomerAuth } from './use-auth'

// Mock NextAuth
vi.mock('next-auth/react', () => ({
  useSession: vi.fn(),
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
  beforeEach(() => {
    vi.clearAllMocks()
    // Mock window.location
    Object.defineProperty(window, 'location', {
      value: { pathname: '/test' },
      writable: true,
    })
  })

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

  it('should return authenticated state when user is logged in', async () => {
    const { useSession } = await import('next-auth/react')
    vi.mocked(useSession).mockReturnValue({
      data: {
        user: {
          id: 'user1',
          email: 'test@example.com',
          name: 'Test User',
          role: 'customer',
        },
        expires: new Date(Date.now() + 86400000).toISOString(),
      },
      status: 'authenticated',
      update: vi.fn(),
    })

    const { result } = renderHook(() => useAuth())

    expect(result.current.isAuthenticated).toBe(true)
    expect(result.current.isLoading).toBe(false)
    expect(result.current.user?.email).toBe('test@example.com')
  })

  it('should return loading state', async () => {
    const { useSession } = await import('next-auth/react')
    vi.mocked(useSession).mockReturnValue({
      data: null,
      status: 'loading',
      update: vi.fn(),
    })

    const { result } = renderHook(() => useAuth())

    expect(result.current.isLoading).toBe(true)
    expect(result.current.isAuthenticated).toBe(false)
  })

  it('should call signIn with correct parameters', async () => {
    const { useSession, signIn } = await import('next-auth/react')
    vi.mocked(useSession).mockReturnValue({
      data: null,
      status: 'unauthenticated',
      update: vi.fn(),
    })

    vi.mocked(signIn).mockResolvedValue({
      ok: true,
      error: null,
      status: 200,
      url: null,
    })

    const { result } = renderHook(() => useAuth())

    await act(async () => {
      await result.current.login({ email: 'test@example.com', password: 'password' })
    })

    expect(vi.mocked(signIn)).toHaveBeenCalledWith('customer-credentials', {
      email: 'test@example.com',
      password: 'password',
      redirect: false,
    })
  })
})

describe('useAdminAuth hook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should identify admin users correctly', async () => {
    const { useSession } = await import('next-auth/react')
    vi.mocked(useSession).mockReturnValue({
      data: {
        user: {
          id: 'admin1',
          email: 'admin@example.com',
          name: 'Admin User',
          role: 'admin',
        },
        expires: new Date(Date.now() + 86400000).toISOString(),
      },
      status: 'authenticated',
      update: vi.fn(),
    })

    const { result } = renderHook(() => useAdminAuth())

    expect(result.current.isAdmin).toBe(true)
    expect(result.current.isAuthenticated).toBe(true)
  })

  it('should not identify non-admin users as admin', async () => {
    const { useSession } = await import('next-auth/react')
    vi.mocked(useSession).mockReturnValue({
      data: {
        user: {
          id: 'user1',
          email: 'user@example.com',
          name: 'Regular User',
          role: 'customer',
        },
        expires: new Date(Date.now() + 86400000).toISOString(),
      },
      status: 'authenticated',
      update: vi.fn(),
    })

    const { result } = renderHook(() => useAdminAuth())

    expect(result.current.isAdmin).toBe(false)
    expect(result.current.isAuthenticated).toBe(true)
  })
})

describe('useCustomerAuth hook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should identify customer users correctly', async () => {
    const { useSession } = await import('next-auth/react')
    vi.mocked(useSession).mockReturnValue({
      data: {
        user: {
          id: 'customer1',
          email: 'customer@example.com',
          name: 'Customer User',
          role: 'customer',
        },
        expires: new Date(Date.now() + 86400000).toISOString(),
      },
      status: 'authenticated',
      update: vi.fn(),
    })

    const { result } = renderHook(() => useCustomerAuth())

    expect(result.current.isCustomer).toBe(true)
    expect(result.current.isAuthenticated).toBe(true)
  })

  it('should not identify non-customer users as customer', async () => {
    const { useSession } = await import('next-auth/react')
    vi.mocked(useSession).mockReturnValue({
      data: {
        user: {
          id: 'admin1',
          email: 'admin@example.com',
          name: 'Admin User',
          role: 'admin',
        },
        expires: new Date(Date.now() + 86400000).toISOString(),
      },
      status: 'authenticated',
      update: vi.fn(),
    })

    const { result } = renderHook(() => useCustomerAuth())

    expect(result.current.isCustomer).toBe(false)
    expect(result.current.isAuthenticated).toBe(true)
  })
})
