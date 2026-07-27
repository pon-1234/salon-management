/**
 * @design_doc   Bcrypt-safe customer password input policy
 * @related_to   Registration, password reset, and customer credential login
 * @known_issues Password strength beyond length is delegated to the product password policy
 */
import { describe, expect, it } from 'vitest'
import { isBcryptSafePassword } from './password-policy'

describe('isBcryptSafePassword', () => {
  it('accepts up to 72 UTF-8 bytes', () => {
    expect(isBcryptSafePassword('a'.repeat(72))).toBe(true)
    expect(isBcryptSafePassword('あ'.repeat(24))).toBe(true)
  })

  it('rejects input above the bcrypt 72-byte boundary', () => {
    expect(isBcryptSafePassword('a'.repeat(73))).toBe(false)
    expect(isBcryptSafePassword('あ'.repeat(25))).toBe(false)
  })

  it.each(['password\n123', 'password\r123', 'password\r\n123'])(
    'rejects line breaks: %j',
    (password) => {
      expect(isBcryptSafePassword(password)).toBe(false)
    }
  )
})
