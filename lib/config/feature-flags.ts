const DEFAULT_DEV_FLAG = () => process.env.NODE_ENV !== 'production'

let serverFlagCache: boolean | null = null

function readPublicFlag(): boolean | null {
  const raw = process.env.NEXT_PUBLIC_USE_MOCK_FALLBACK
  if (!raw) {
    return null
  }
  const normalized = raw.trim().toLowerCase()
  if (normalized === 'true') return true
  if (normalized === 'false') return false
  return null
}

function readServerFlag(): boolean {
  if (serverFlagCache !== null) {
    return serverFlagCache
  }
  try {
    const { env } = require('@/lib/config/env') as {
      env: { featureFlags: { useMockFallbacks: boolean } }
    }
    serverFlagCache = env.featureFlags.useMockFallbacks
    return serverFlagCache
  } catch (error) {
    // Fallback to dev heuristic if env module unavailable (e.g., client bundle)
    serverFlagCache = DEFAULT_DEV_FLAG()
    return serverFlagCache
  }
}

/**
 * Determine whether mock data fallbacks should be used.
 * This helper is safe to import from both server and client modules
 * without exposing server-only environment variables.
 */
export function shouldUseMockFallbacks(): boolean {
  if (typeof window === 'undefined') {
    return readServerFlag()
  }

  const publicFlag = readPublicFlag()
  if (publicFlag !== null) {
    return publicFlag
  }
  return DEFAULT_DEV_FLAG()
}

// Test helper to reset server flag cache between test cases
export function __resetMockFallbackCacheForTests() {
  serverFlagCache = null
}
