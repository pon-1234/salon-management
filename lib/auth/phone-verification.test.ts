/**
 * @design_doc   Cryptographically strong one-time phone verification codes
 * @related_to   phone-verification.ts and authenticated phone verification routes
 * @known_issues Cross-instance send throttling still requires a persistent limiter before horizontal scaling
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { generateVerificationCode, hashPhoneVerificationCode } from './phone-verification'

describe('phone verification codes', () => {
  it('generates six-digit codes without Math.random', () => {
    const source = readFileSync(join(__dirname, 'phone-verification.ts'), 'utf8')

    expect(source).not.toContain('Math.random')
    for (let index = 0; index < 100; index += 1) {
      expect(generateVerificationCode()).toMatch(/^\d{6}$/)
    }
  })

  it('stores a customer-bound keyed digest instead of the bearer code', () => {
    const digest = hashPhoneVerificationCode('customer-1', '123456', 'test-secret')

    expect(digest).toMatch(/^[a-f0-9]{64}$/)
    expect(digest).not.toContain('123456')
    expect(hashPhoneVerificationCode('customer-1', '123456', 'test-secret')).toBe(digest)
    expect(hashPhoneVerificationCode('customer-2', '123456', 'test-secret')).not.toBe(digest)
  })
})
