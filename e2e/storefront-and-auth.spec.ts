/**
 * @design_doc   docs/SYSTEM_AUDIT_2026-07-26.md G-2 browser journey coverage
 * @related_to   middleware age gate, storefront booking, and administrator login
 * @known_issues Authenticated payment completion requires provider sandbox credentials
 */
import { expect, test } from '@playwright/test'

test('protects every storefront route with age verification and preserves the destination', async ({
  context,
  page,
}) => {
  await context.clearCookies()

  const response = await page.goto('/ikebukuro/services')

  await expect(page).toHaveURL(/\/ikebukuro\/age-verification/)
  await expect(page.getByText('年齢確認', { exact: true })).toBeVisible()
  expect(response?.headers()['content-security-policy']).toContain("script-src 'self'")

  await page.getByRole('button', { name: '18歳以上です' }).click()

  await expect(page).toHaveURL(/\/ikebukuro\/services$/)
  await expect(page.getByRole('heading', { name: 'プレイ内容' })).toBeVisible()
})

test('renders the reservation journey and administrator authentication form', async ({
  context,
  page,
}) => {
  await context.addCookies([
    {
      name: 'salon_age_verified',
      value: '1',
      url: 'http://localhost:3100',
    },
  ])

  await page.goto('/ikebukuro/booking')
  await expect(page.getByRole('heading', { name: /オンライン予約/ })).toBeVisible()
  await expect(page.getByText('STEP 1', { exact: true })).toBeVisible()
  await expect(page.getByText('STEP 2', { exact: true })).toBeVisible()

  await page.goto('/admin/dashboard')
  await expect(page).toHaveURL(/\/admin\/login/)
  await expect(page.getByLabel('メールアドレス')).toHaveAttribute('autocomplete', 'email')
  await expect(page.locator('#password')).toHaveAttribute('autocomplete', 'current-password')
  await expect(page.getByRole('button', { name: 'ログイン' })).toBeVisible()
})
