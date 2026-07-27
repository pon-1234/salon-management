/**
 * @design_doc   Production designation-fee data integrity
 * @related_to   designation-fee API and feature flags
 * @known_issues Development defaults remain opt-in
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getDesignationFees } from './data'

const fallbackFlag = vi.hoisted(() => ({ enabled: false }))

vi.mock('@/lib/config/feature-flags', () => ({
  shouldUseMockFallbacks: () => fallbackFlag.enabled,
}))

vi.mock('@/lib/http/base-url', () => ({
  resolveApiUrl: (path: string) => path,
}))

describe('getDesignationFees fallback policy', () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
    fallbackFlag.enabled = false
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network unavailable')))
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  })

  it('does not fabricate fees when fallbacks are disabled', async () => {
    await expect(getDesignationFees({ storeId: 'store-a' })).resolves.toEqual([])
  })

  it('retains explicit development defaults when fallbacks are enabled', async () => {
    fallbackFlag.enabled = true

    const result = await getDesignationFees({ storeId: 'store-a' })

    expect(result.length).toBeGreaterThan(0)
  })
})
