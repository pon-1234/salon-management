/**
 * @design_doc   Customer phone verification UI excludes unapproved anonymous account claiming
 * @related_to   verify-phone-form.tsx and authenticated verify-phone API routes
 * @known_issues Legacy account recovery requires a separately approved identity migration flow
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('VerifyPhoneForm account-claim boundary', () => {
  it('does not collect replacement credentials or enable claim mode', () => {
    const source = readFileSync(join(__dirname, 'verify-phone-form.tsx'), 'utf8')
    const registrationSource = readFileSync(join(__dirname, 'register-form.tsx'), 'utf8')

    expect(source).not.toContain("mode === 'claim'")
    expect(source).not.toContain('name="email"')
    expect(source).not.toContain('name="password"')
    expect(source).not.toContain('nickname')
    expect(registrationSource).not.toContain('verify-phone?mode=claim')
    expect(registrationSource).toContain('旧会員データの引継ぎは店舗へお問い合わせください')
  })
})
