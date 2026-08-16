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

  it('shows imported account status and membership stage without relabeling them as member type', () => {
    const source = readFileSync(join(__dirname, 'page.tsx'), 'utf8')

    expect(source).toContain('accountStatusLabels')
    expect(source).toContain('membershipStageLabels')
    expect(source).toContain("blocked: 'ブラック'")
    expect(source).toContain("platinum: 'プラチナ'")
  })

  it('labels unavailable store-scoped chat totals instead of rendering null as a count', () => {
    const source = readFileSync(join(__dirname, 'page.tsx'), 'utf8')

    expect(source).toContain('function formatStoreScopedChatCount')
    expect(source).toContain("'店舗別集計未対応'")
    expect(source).toContain('value: formatStoreScopedChatCount(insights.chatCountToday)')
    expect(source).toContain('value: formatStoreScopedChatCount(insights.chatCountYesterday)')
    expect(source).toContain('value: formatStoreScopedChatCount(insights.chatCountTotal)')
    expect(source).not.toContain('`${insights.chatCountToday}回`')
    expect(source).not.toContain('`${insights.chatCountYesterday}回`')
    expect(source).not.toContain('`${insights.chatCountTotal}回`')
  })
})
