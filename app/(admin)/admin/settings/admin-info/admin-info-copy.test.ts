/**
 * @design_doc   docs/VPS_DEPLOYMENT.md
 * @related_to   app/api/admin/route.ts - Administrator deactivation endpoint
 * @known_issues None
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('administrator deactivation copy', () => {
  it('describes the reversible soft-delete behavior accurately', () => {
    const source = readFileSync(join(__dirname, 'page.tsx'), 'utf8')

    expect(source).toContain('管理者を停止しますか？')
    expect(source).toContain('監査データは保持され')
    expect(source).toContain('再有効化できます')
    expect(source).not.toContain('管理者を削除しますか？')
    expect(source).not.toContain('この操作は取り消せません')
  })

  it('enforces the 16-character administrator password policy in the form', () => {
    const source = readFileSync(join(__dirname, 'page.tsx'), 'utf8')

    expect(source).toContain('ADMIN_PASSWORD_MIN_LENGTH')
    expect(source).toContain('minLength={ADMIN_PASSWORD_MIN_LENGTH}')
    expect(source).toContain('16文字以上')
  })

  it('does not send administrator API errors that may contain PII to the browser console', () => {
    const source = readFileSync(join(__dirname, 'page.tsx'), 'utf8')

    expect(source).not.toContain("console.error('Failed to load admins:', error)")
    expect(source).not.toContain("console.error('Failed to save admin:', error)")
    expect(source).not.toContain("console.error('Failed to deactivate admin:', error)")
  })
})
