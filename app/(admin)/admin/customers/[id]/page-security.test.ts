/**
 * @design_doc   Customer administration browser-side privacy boundary
 * @related_to   app/(admin)/admin/customers/[id]/page.tsx
 * @known_issues Customer profile fields are still constrained by the migration policy
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('customer profile browser logging', () => {
  it('does not write submitted customer PII or passwords to the browser console', () => {
    const source = readFileSync(join(__dirname, 'page.tsx'), 'utf8')

    expect(source).not.toContain("console.log('Updating customer with:'")
  })

  it('does not require or resend the hidden existing password for ordinary edits', () => {
    const source = readFileSync(join(__dirname, 'page.tsx'), 'utf8')

    expect(source).toContain('password.length === 0')
    expect(source).not.toContain('password: data.password,')
  })

  it('persists SMS consent and does not display the non-persisted notes field', () => {
    const source = readFileSync(join(__dirname, 'page.tsx'), 'utf8')

    expect(source).toContain('smsEnabled: data.smsEnabled')
    expect(source).not.toContain('name="notes"')
  })
})
