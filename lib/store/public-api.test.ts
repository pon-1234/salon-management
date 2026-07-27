/**
 * @design_doc   Production public storefront data integrity
 * @related_to   app/api/public/stores/[slug]/route.ts and public-fallbacks.ts
 * @known_issues Development fallback data remains opt-in for local demos
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { db } from '@/lib/db'
import { fetchPublicStoreHomeData, fetchStoreBySlug } from './public-api'

const envMock = vi.hoisted(() => ({ useMockFallbacks: false }))

vi.mock('@/lib/config/env', () => ({
  env: {
    isProduction: true,
    runtimeMode: 'preview',
    featureFlags: envMock,
  },
}))

vi.mock('@/lib/db', () => ({
  db: {
    store: {
      findFirst: vi.fn(),
    },
    cast: {
      findMany: vi.fn(),
    },
    castSchedule: {
      findMany: vi.fn(),
    },
    review: {
      findMany: vi.fn(),
    },
    storeEventBanner: {
      findMany: vi.fn(),
    },
  },
}))

describe('public store API fallbacks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.unstubAllGlobals()
    envMock.useMockFallbacks = false
    vi.mocked(db.store.findFirst).mockResolvedValue(null)
    vi.mocked(db.cast.findMany).mockResolvedValue([])
    vi.mocked(db.castSchedule.findMany).mockResolvedValue([])
    vi.mocked(db.review.findMany).mockResolvedValue([])
    vi.mocked(db.storeEventBanner.findMany).mockResolvedValue([])
  })

  it('returns null only for an unknown database store when production fallbacks are disabled', async () => {
    const globalFetch = vi.fn().mockRejectedValue(new Error('Basic Auth gateway returned 404'))
    vi.stubGlobal('fetch', globalFetch)

    await expect(fetchPublicStoreHomeData('ikebukuro')).resolves.toBeNull()
    await expect(fetchStoreBySlug('ikebukuro')).resolves.toBeNull()
    expect(globalFetch).not.toHaveBeenCalled()
  })

  it('propagates a database failure instead of turning it into a store 404', async () => {
    const databaseError = new Error('database unavailable')
    vi.mocked(db.store.findFirst).mockRejectedValue(databaseError)
    const globalFetch = vi.fn().mockRejectedValue(new Error('Basic Auth gateway returned 404'))
    vi.stubGlobal('fetch', globalFetch)

    await expect(fetchPublicStoreHomeData('ikebukuro')).rejects.toBe(databaseError)
    expect(globalFetch).not.toHaveBeenCalled()
  })

  it('uses demo fallback data only when the feature flag is explicitly enabled', async () => {
    envMock.useMockFallbacks = true
    vi.mocked(db.store.findFirst).mockRejectedValue(new Error('database unavailable'))
    const globalFetch = vi.fn().mockRejectedValue(new Error('Basic Auth gateway returned 404'))
    vi.stubGlobal('fetch', globalFetch)

    const result = await fetchPublicStoreHomeData('ikebukuro')

    expect(result?.store.slug).toBe('ikebukuro')
    expect(globalFetch).not.toHaveBeenCalled()
  })
})
