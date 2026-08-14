/**
 * @design_doc   Customer profile to customer-chat navigation contract
 * @related_to   CustomerProfile, ChatPage
 * @known_issues None
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('customer profile chat navigation', () => {
  it('opens the selected customer chat with an encoded customerId', () => {
    const source = readFileSync(join(__dirname, 'page.tsx'), 'utf8')

    expect(source).toContain('router.push(`/admin/chat?customerId=${encodeURIComponent(id)}`)')
    expect(source).toMatch(/<MessageSquare[^>]*\/>\s*チャット\s*<\/Button>/)
  })

  it('starts a new order for the selected customer with an encoded customerId', () => {
    const source = readFileSync(join(__dirname, 'page.tsx'), 'utf8')

    expect(source).toContain(
      'router.push(`/admin/reservation?customerId=${encodeURIComponent(id)}`)'
    )
    expect(source).toMatch(/>\s*オーダー新規作成\s*<\/Button>/)
  })

  it('renders a retryable customer-load error rather than spinning forever', () => {
    const source = readFileSync(join(__dirname, 'page.tsx'), 'utf8')

    expect(source).toContain("setLoadError('顧客情報を取得できませんでした')")
    expect(source).toContain('role="alert"')
    expect(source).toContain('setLoadAttempt((attempt) => attempt + 1)')
  })
})
