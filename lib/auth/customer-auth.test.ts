/**
 * @design_doc   Customer email identity and store-scoped authentication navigation
 * @related_to   Customer registration, verification, and password-recovery routes
 * @known_issues Store existence is verified by server routes before links are issued
 */
import { describe, expect, it } from 'vitest'
import { buildStoreLoginPath, normalizeCustomerEmail, parseSafeStoreSlug } from './customer-auth'

describe('customer authentication identity helpers', () => {
  it('normalizes email identity with trim and lowercase', () => {
    expect(normalizeCustomerEmail('  Customer.Name+Tag@Example.COM  ')).toBe(
      'customer.name+tag@example.com'
    )
  })

  it.each(['ikebukuro', 'shinjuku-east', 'store2026'])('accepts a safe store slug: %s', (slug) => {
    expect(parseSafeStoreSlug(slug)).toBe(slug)
    expect(buildStoreLoginPath(slug)).toBe(`/${slug}/login`)
  })

  it.each([
    null,
    undefined,
    '',
    '  ',
    '../admin',
    '//evil.example',
    'https://evil.example',
    'IKEBUKURO',
    'store/name',
    'store?next=//evil.example',
  ])('falls back to the store chooser for an unsafe store slug: %s', (slug) => {
    expect(parseSafeStoreSlug(slug)).toBeNull()
    expect(buildStoreLoginPath(slug)).toBe('/')
  })
})
