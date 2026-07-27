/**
 * @design_doc   docs/SYSTEM_AUDIT_2026-07-26.md G-2 browser journey coverage
 * @related_to   e2e/storefront-and-auth.spec.ts and scripts/ci.sh
 * @known_issues CI installs Chromium before running the suite
 */
import { defineConfig, devices } from '@playwright/test'

const port = 3100
const baseURL = `http://localhost:${port}`
const databaseURL =
  process.env.E2E_DATABASE_URL ??
  'postgresql://salon:salon_local_password@127.0.0.1:5432/salon_management?schema=public'

export default defineConfig({
  testDir: './e2e',
  outputDir: '/tmp/salon-management-playwright-results',
  expect: {
    timeout: 20_000,
  },
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI
    ? [
        ['html', { open: 'never', outputFolder: '/tmp/salon-management-playwright-report' }],
        ['line'],
      ]
    : 'list',
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: `pnpm exec next dev --hostname 127.0.0.1 --port ${port}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      DATABASE_URL: databaseURL,
      NEXTAUTH_SECRET: 'e2e-placeholder-secret-at-least-32-characters',
      NEXTAUTH_URL: baseURL,
      STORAGE_PUBLIC_BASE_URL: `${baseURL}/salon-uploads`,
      STORAGE_ROOT: '/tmp/salon-e2e-storage',
      USE_MOCK_FALLBACK: 'true',
    },
  },
})
