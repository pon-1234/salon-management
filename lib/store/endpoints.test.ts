/**
 * @design_doc   docs/LEGACY_DATA_MIGRATION_RUNBOOK.md store isolation requirement
 * @related_to   Store-scoped client API requests
 * @known_issues None
 */
import { describe, expect, it } from 'vitest'
import { buildStoreScopedEndpoint } from './endpoints'

describe('buildStoreScopedEndpoint', () => {
  it('adds an encoded explicit store identifier', () => {
    expect(buildStoreScopedEndpoint('/api/settings/points', 'shinjuku west')).toBe(
      '/api/settings/points?storeId=shinjuku%20west'
    )
  })

  it('preserves existing query parameters', () => {
    expect(buildStoreScopedEndpoint('/api/review?id=review%2F1', ' ginza ')).toBe(
      '/api/review?id=review%2F1&storeId=ginza'
    )
  })

  it('rejects an empty store identifier', () => {
    expect(() => buildStoreScopedEndpoint('/api/settings/store', '   ')).toThrow(
      'Store ID is required'
    )
  })
})
