/**
 * @design_doc   Multi-store reservation request routing
 * @related_to   components/reservation/quick-booking-dialog.tsx
 * @known_issues None
 */
import { describe, expect, it } from 'vitest'
import { buildStoreCastEndpoint, buildStoreReservationEndpoint } from './endpoints'

describe('buildStoreReservationEndpoint', () => {
  it('includes an encoded explicit store identifier', () => {
    expect(buildStoreReservationEndpoint('shinjuku west')).toBe(
      '/api/reservation?storeId=shinjuku%20west'
    )
  })

  it('rejects an empty store identifier', () => {
    expect(() => buildStoreReservationEndpoint('   ')).toThrow('Store ID is required')
  })
})

describe('buildStoreCastEndpoint', () => {
  it('includes both the cast and explicit store identifiers', () => {
    expect(buildStoreCastEndpoint('shinjuku west', 'cast/1')).toBe(
      '/api/cast?id=cast%2F1&storeId=shinjuku%20west'
    )
  })

  it('rejects an empty store or cast identifier', () => {
    expect(() => buildStoreCastEndpoint('', 'cast-1')).toThrow('Store ID is required')
    expect(() => buildStoreCastEndpoint('ikebukuro', ' ')).toThrow('Cast ID is required')
  })
})
