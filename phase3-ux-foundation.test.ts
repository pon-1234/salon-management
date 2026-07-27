/**
 * @design_doc   docs/SYSTEM_AUDIT_2026-07-26.md C-1 through C-14, J-5 through J-13
 * @related_to   StoreNavigation, Header, PageLoading, ConfirmDialog: shared UX foundations
 * @known_issues Visual breakpoint behavior is additionally covered by Playwright in phase 4
 */
import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const read = (path: string) => readFile(resolve(process.cwd(), path), 'utf8')

describe('phase 3 UX foundation contracts', () => {
  it('keeps public navigation labels intact and exposes mobile phone actions', async () => {
    const navigation = await read('components/store-navigation.tsx')

    expect(navigation).toContain('whitespace-nowrap')
    expect(navigation).toContain('sm:hidden')
    expect(navigation).toContain(`href={\`tel:\${store.phone}\`}`)
    expect(navigation).toContain('min-h-11')
  })

  it('uses normal-flow admin navigation and exposes primary mobile actions', async () => {
    const header = await read('components/header.tsx')
    const layout = await read('app/(admin)/admin-layout-client.tsx')

    expect(header).toContain('sticky')
    expect(header).not.toContain('fixed left-0 right-0 top-0')
    expect(header).toContain('モバイル予約作成')
    expect(header).toContain('モバイル顧客検索')
    expect(layout).not.toContain('pt-[83px]')
    expect(layout).toContain('<PageLoading')
    expect(layout).not.toContain('Loading...')
  })

  it.each([
    'app/(admin)/admin/customers/page.tsx',
    'app/(admin)/admin/reservation-list/page.tsx',
    'app/(admin)/admin/cast/list/page.tsx',
    'app/(admin)/admin/reviews/page.tsx',
  ])('uses the shared table loading state in %s', async (path) => {
    expect(await read(path)).toContain('<TableSkeleton')
  })

  it('provides horizontally scrollable data tables', async () => {
    const paths = [
      'components/analytics/cast-performance-table.tsx',
      'components/analytics/daily-report-table.tsx',
      'components/analytics/staff-attendance-table.tsx',
      'components/store-schedule-content.tsx',
    ]

    for (const path of paths) {
      expect(await read(path)).toContain('overflow-x-auto')
    }
  })

  it('removes native browser dialogs from product interactions', async () => {
    const paths = [
      'components/cast-schedule/schedule-edit-dialog.tsx',
      'components/cast/schedule-edit-dialog.tsx',
      'components/cast/cast-line-registration-panel.tsx',
    ]

    for (const path of paths) {
      const source = await read(path)
      expect(source).not.toMatch(/\b(?:window\.)?(?:alert|confirm)\s*\(/)
    }
    const legacyEditor = await read('components/cast-schedule/schedule-edit-dialog.tsx')
    const currentEditor = await read('components/cast/schedule-edit-dialog.tsx')
    expect(legacyEditor).toContain('findScheduleValidationError')
    expect(currentEditor).toContain('findScheduleValidationError')
  })

  it('uses one explicit theme strategy and print foundation', async () => {
    const packageJson = await read('package.json')
    const globalStyles = await read('styles/globals.css')
    const tailwindConfig = await read('tailwind.config.ts')
    const authError = await read('app/auth/error/page.tsx')
    const alert = await read('components/ui/alert.tsx')

    expect(packageJson).not.toContain('"next-themes"')
    expect(existsSync(resolve(process.cwd(), 'components/theme-provider.tsx'))).toBe(false)
    expect(globalStyles).not.toContain('.dark {')
    expect(tailwindConfig).not.toContain('darkMode')
    expect(authError).not.toContain('dark:')
    expect(alert).not.toContain('dark:')
    expect(globalStyles).toContain('@media print')
    expect(globalStyles).toContain('.print-hidden')
  })

  it('does not duplicate customer login headings and improves admin login access', async () => {
    const customerLogin = await read('app/[store]/login/page.tsx')
    const adminLogin = await read('app/admin/login/admin-login-client.tsx')

    expect(customerLogin).not.toContain('<h1')
    expect(adminLogin).toContain('autoFocus')
    expect(adminLogin).toContain('current-password')
    expect(adminLogin).toContain('パスワードをお忘れの方')
    expect(adminLogin).toContain('パスワードを表示')
  })

  it('keeps an underage visitor on an explanatory first-party screen', async () => {
    const gate = await read('components/age-verification-client.tsx')

    expect(gate).not.toContain('google.com')
    expect(gate).toContain('18歳未満および高校生の方はご利用いただけません')
  })

  it.each([
    ['services', 'プレイ内容'],
    ['ranking', 'ランキング'],
    ['recruitment', '入店情報'],
    ['forgot-password', 'パスワード再設定'],
    ['mypage', 'マイページ'],
    ['verify-phone', '電話番号認証'],
  ])('uses the store title template for %s', async (route, title) => {
    const source = await read(`app/[store]/${route}/page.tsx`)

    expect(source).toContain(`title: '${title}'`)
  })

  it('keeps fallback storefront data plausible for demos', async () => {
    const source = await read('lib/store/public-fallbacks.ts')
    const newcomers = source.match(/const FALLBACK_NEWCOMERS = \[[\s\S]*?\n\]/)?.[0] ?? ''
    const reviews = source.match(/const FALLBACK_REVIEWS:[\s\S]*?\n\]/)?.[0] ?? ''

    expect(newcomers).not.toContain("name: 'ことね'")
    expect(reviews.match(/castName: 'すずか'/g)).toHaveLength(1)
    expect(reviews).toContain('rating: 4')
  })

  it('shares semantic print actions instead of repeating palette utilities', async () => {
    const printButton = await read('components/analytics/print-button.tsx')
    const routes = [
      'annual-sales',
      'area-sales',
      'cast-performance',
      'course-sales',
      'district-sales',
      'hourly-sales',
      'marketing-channels',
      'monthly-sales',
      'option-sales',
      'staff-attendance',
    ]

    expect(printButton).toContain('variant="default"')
    expect(printButton).toContain('print-hidden')
    for (const route of routes) {
      const source = await read(`app/(admin)/admin/analytics/${route}/page.tsx`)
      expect(source).toContain('<PrintButton')
      expect(source).not.toContain('bg-emerald-600 text-white hover:bg-emerald-700')
    }
  })

  it('protects the primary long form from accidental loss and establishes focus', async () => {
    const hook = await read('hooks/use-unsaved-changes-warning.ts')
    const castForm = await read('components/cast/cast-form.tsx')

    expect(hook).toContain("addEventListener('beforeunload'")
    expect(hook).toContain('event.preventDefault()')
    expect(castForm).toContain('useUnsavedChangesWarning')
    expect(castForm).toContain('autoFocus')
  })
})
