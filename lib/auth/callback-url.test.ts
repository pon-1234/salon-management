/**
 * @design_doc   ui-improvement-instructions.md U-8 login redirect consistency
 * @related_to   sanitizeCallbackUrl: protects customer login redirects
 * @known_issues Only relative path validation is covered; route existence is not checked
 */
import { describe, expect, it } from 'vitest'

import { sanitizeCallbackUrl } from './callback-url'

describe('sanitizeCallbackUrl', () => {
  it('allows same-site relative paths', () => {
    expect(
      sanitizeCallbackUrl('/ikebukuro/booking?cast=cast-1&slot=2026-07-04T12%3A00%3A00.000Z', {
        fallback: '/ikebukuro/mypage',
      })
    ).toBe('/ikebukuro/booking?cast=cast-1&slot=2026-07-04T12%3A00%3A00.000Z')
  })

  it('rejects external and protocol-relative URLs', () => {
    expect(
      sanitizeCallbackUrl('https://example.com/phish', { fallback: '/ikebukuro/mypage' })
    ).toBe('/ikebukuro/mypage')
    expect(sanitizeCallbackUrl('//example.com/phish', { fallback: '/ikebukuro/mypage' })).toBe(
      '/ikebukuro/mypage'
    )
  })

  it('rejects missing or non-path values', () => {
    expect(sanitizeCallbackUrl(null, { fallback: '/ikebukuro/mypage' })).toBe('/ikebukuro/mypage')
    expect(sanitizeCallbackUrl('admin/dashboard', { fallback: '/ikebukuro/mypage' })).toBe(
      '/ikebukuro/mypage'
    )
  })
})
