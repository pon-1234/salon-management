/**
 * @design_doc   docs/SYSTEM_AUDIT_2026-07-26.md A-4, A-7, A-8, B-3, B-5, C-10, C-11
 * @related_to   CTI, push, analytics, metadata, and settings truthfulness contracts
 * @known_issues None
 */
import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFile(resolve(process.cwd(), path), 'utf8')

describe('phase 2 truthfulness contracts', () => {
  it('uses the persisted customer lookup for CTI and exposes no fake telephony actions', async () => {
    const source = await read('hooks/use-cti.ts')

    expect(source).toContain('/api/customer/by-phone/')
    expect(source).not.toContain('@/lib/customer/data')
    expect(source).not.toContain('console.log')
  })

  it('removes or explicitly rejects silent write no-ops', async () => {
    const schedule = await read('lib/cast-schedule/usecases.ts')
    const dailySales = await read('lib/daily-sales/repository-impl.ts')

    expect(schedule).not.toContain('async updateSchedule(')
    expect(dailySales).toContain("throw new Error('Daily sales reports are derived")
    expect(dailySales).not.toContain('console.info')
  })

  it('does not report mock push delivery as successful', async () => {
    const source = await read('lib/push/client.ts')

    expect(source).not.toContain('setTimeout')
    expect(source).not.toContain('Math.random')
    expect(source).toContain('Push delivery provider is not configured.')
  })

  it('removes unused mock analytics and unavailable synchronization actions', async () => {
    const designationFees = await read('app/(admin)/admin/settings/designation-fees/page.tsx')
    const dashboard = await read('app/(admin)/admin/dashboard/page.tsx')

    expect(existsSync(resolve(process.cwd(), 'lib/analytics/repository-impl.ts'))).toBe(false)
    expect(designationFees).not.toContain('全店舗に同期')
    expect(designationFees).not.toContain('handleSync')
    expect(dashboard).not.toContain('recordModification')
    expect(dashboard).toContain("method: 'PUT'")
  })

  it('links HP pricing to persisted course and option management', async () => {
    const settings = await read('app/(admin)/admin/settings/page.tsx')
    const hpPricing = settings.match(/id: 'hp-pricing'[\s\S]*?\n    },/)?.[0]
    const page = await read('app/(admin)/admin/settings/hp-pricing/page.tsx')

    expect(hpPricing).toContain("status: 'available'")
    expect(hpPricing).toContain("href: '/admin/settings/hp-pricing'")
    expect(page).toContain("href: '/admin/settings/course-info'")
    expect(page).toContain("href: '/admin/settings/option-info'")
  })

  it.each(['mutual-links', 'templates'])(
    'omits the unavailable %s setting from the management menu',
    async (id) => {
      const source = await read('app/(admin)/admin/settings/page.tsx')

      expect(source).not.toContain(`id: '${id}'`)
    }
  )

  it('uses neutral root metadata and documents the robots release gate', async () => {
    const rootLayout = await read('app/layout.tsx')
    const adminLogin = await read('app/admin/login/page.tsx')
    const releaseChecklist = await read('docs/RELEASE_CHECKLIST.md')

    expect(rootLayout).not.toContain('金の玉クラブ')
    expect(rootLayout).toContain("default: 'GOLD ESTHE GROUP'")
    expect(adminLogin).toContain("title: '管理画面ログイン'")
    expect(releaseChecklist).toContain('x-robots-tag')
    expect(releaseChecklist).toContain('robots')
  })
})
