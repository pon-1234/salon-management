import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Set up test environment variables
process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/salon_test?schema=public"
process.env.NEXTAUTH_SECRET = "test-secret-key-for-testing"
process.env.NEXTAUTH_URL = "http://localhost:3000"

// Mock the database module
vi.mock('./lib/db', () => ({
  db: {
    customer: {
      findUnique: vi.fn(() => Promise.resolve(null)),
      findMany: vi.fn(() => Promise.resolve([])),
      create: vi.fn(() => Promise.resolve({ id: 'test-id' })),
      update: vi.fn(() => Promise.resolve({ id: 'test-id' })),
      delete: vi.fn(() => Promise.resolve()),
    },
  },
}))

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: vi.fn(),
      replace: vi.fn(),
      prefetch: vi.fn(),
      back: vi.fn(),
      pathname: '/',
      query: {},
      asPath: '/',
    }
  },
  useSearchParams() {
    return new URLSearchParams()
  },
  usePathname() {
    return '/'
  },
}))

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})
