/**
 * @design_doc   Production storefront pricing must never fabricate bookable services
 * @related_to   public-pricing.ts and the store booking page
 * @known_issues Additional fees remain static configuration until a persisted model is approved
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  courseFindMany: vi.fn(),
  optionFindMany: vi.fn(),
  mockFallbacks: false,
}))

vi.mock('@/lib/db', () => ({
  db: {
    coursePrice: { findMany: mocks.courseFindMany },
    optionPrice: { findMany: mocks.optionFindMany },
  },
}))
vi.mock('@/lib/config/feature-flags', () => ({
  shouldUseMockFallbacks: () => mocks.mockFallbacks,
}))

import { getPublicStorePricing } from './public-pricing'

describe('getPublicStorePricing', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.mockFallbacks = false
    mocks.courseFindMany.mockResolvedValue([])
    mocks.optionFindMany.mockResolvedValue([])
  })

  it('returns empty persisted collections instead of mock services in production mode', async () => {
    const pricing = await getPublicStorePricing('ginza')

    expect(pricing.courses).toEqual([])
    expect(pricing.options).toEqual([])
    expect(pricing.additionalFees).toEqual([])
    expect(pricing.notes).toEqual([])
    expect(mocks.courseFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          storeId: 'ginza',
          isActive: true,
          archivedAt: null,
        },
      })
    )
    expect(mocks.optionFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          storeId: 'ginza',
          isActive: true,
          archivedAt: null,
          visibility: 'public',
        },
      })
    )
  })

  it('propagates database failures when mock fallbacks are disabled', async () => {
    mocks.courseFindMany.mockRejectedValue(new Error('database unavailable'))

    await expect(getPublicStorePricing('ginza')).rejects.toThrow('database unavailable')
  })

  it('uses development fixtures only when the mock fallback flag is enabled', async () => {
    mocks.mockFallbacks = true

    const pricing = await getPublicStorePricing('ginza')

    expect(pricing.courses.length).toBeGreaterThan(0)
    expect(pricing.options.length).toBeGreaterThan(0)
  })
})
