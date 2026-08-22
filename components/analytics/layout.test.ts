/**
 * @design_doc   ui-improvement-instructions.md U-6 admin analytics navigation
 * @related_to   AnalyticsLayout and the canonical daily-report screen
 * @known_issues None
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const layoutSource = readFileSync(join(__dirname, 'layout.tsx'), 'utf8')
const dailySalesPageSource = readFileSync(
  join(__dirname, '../../app/(admin)/admin/analytics/daily-sales/page.tsx'),
  'utf8'
)

describe('analytics daily navigation', () => {
  it('keeps a single 当日売上 sidebar entry pointing at daily-report', () => {
    expect(layoutSource).toContain("href: '/admin/analytics/daily-report'")
    expect(layoutSource).toContain("name: '当日売上'")
    expect(layoutSource).not.toContain("href: '/admin/analytics/daily-sales'")
    expect(layoutSource).not.toContain("name: '日次レポート'")
  })

  it('redirects the former daily-sales screen to daily-report', () => {
    expect(dailySalesPageSource).toContain("redirect('/admin/analytics/daily-report')")
  })
})
