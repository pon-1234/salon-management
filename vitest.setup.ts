import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Set up test environment variables
process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/salon_test?schema=public"

// Mock the database module
vi.mock('./lib/db', () => ({
  db: {
    cast: {
      findMany: vi.fn(() => Promise.resolve([])),
      findUnique: vi.fn(() => Promise.resolve(null)),
      create: vi.fn(() => Promise.resolve({ id: 'test-id' })),
      update: vi.fn(() => Promise.resolve({ id: 'test-id' })),
      delete: vi.fn(() => Promise.resolve()),
    },
    customer: {
      findMany: vi.fn(() => Promise.resolve([])),
      findUnique: vi.fn(() => Promise.resolve(null)),
      create: vi.fn(() => Promise.resolve({ id: 'test-id' })),
      update: vi.fn(() => Promise.resolve({ id: 'test-id' })),
      delete: vi.fn(() => Promise.resolve()),
    },
    reservation: {
      findMany: vi.fn(() => Promise.resolve([])),
      findUnique: vi.fn(() => Promise.resolve(null)),
      create: vi.fn(() => Promise.resolve({ id: 'test-id' })),
      update: vi.fn(() => Promise.resolve({ id: 'test-id' })),
      delete: vi.fn(() => Promise.resolve()),
    },
    coursePrice: {
      findMany: vi.fn(() => Promise.resolve([])),
      findUnique: vi.fn(() => Promise.resolve(null)),
      create: vi.fn(() => Promise.resolve({ id: 'test-id' })),
      update: vi.fn(() => Promise.resolve({ id: 'test-id' })),
      delete: vi.fn(() => Promise.resolve()),
    },
    optionPrice: {
      findMany: vi.fn(() => Promise.resolve([])),
      findUnique: vi.fn(() => Promise.resolve(null)),
      create: vi.fn(() => Promise.resolve({ id: 'test-id' })),
      update: vi.fn(() => Promise.resolve({ id: 'test-id' })),
      delete: vi.fn(() => Promise.resolve()),
    },
    review: {
      findMany: vi.fn(() => Promise.resolve([])),
      findUnique: vi.fn(() => Promise.resolve(null)),
      create: vi.fn(() => Promise.resolve({ id: 'test-id' })),
      update: vi.fn(() => Promise.resolve({ id: 'test-id' })),
      delete: vi.fn(() => Promise.resolve()),
    },
    castSchedule: {
      findMany: vi.fn(() => Promise.resolve([])),
      findUnique: vi.fn(() => Promise.resolve(null)),
      create: vi.fn(() => Promise.resolve({ id: 'test-id' })),
      update: vi.fn(() => Promise.resolve({ id: 'test-id' })),
      delete: vi.fn(() => Promise.resolve()),
    },
    reservationOption: {
      deleteMany: vi.fn(() => Promise.resolve()),
    },
    $transaction: vi.fn((fn) => fn({
      reservationOption: {
        deleteMany: vi.fn(() => Promise.resolve()),
      },
      reservation: {
        update: vi.fn(() => Promise.resolve({ id: 'test-id' })),
      },
    })),
  },
}))

// Mock fetch for tests that don't need actual API calls
global.fetch = vi.fn(() =>
  Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve([]),
  })
) as any

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
