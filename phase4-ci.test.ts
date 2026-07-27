/**
 * @design_doc   docs/SYSTEM_AUDIT_2026-07-26.md G-1 and G-2
 * @related_to   vitest.config.ts, playwright.config.ts, package.json, scripts/ci.sh
 * @known_issues Browser binaries are installed by the deployment/CI environment
 */
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()

describe('phase 4 CI gates', () => {
  it('keeps unit coverage thresholds near the measured baseline', () => {
    const config = readFileSync(join(root, 'vitest.config.ts'), 'utf8')

    for (const metric of ['branches', 'functions', 'lines', 'statements']) {
      expect(config).toMatch(new RegExp(`${metric}:\\s*5[5-9]`))
    }
    expect(config).toContain("'e2e/**'")
  })

  it('runs Playwright journeys from the main CI script', () => {
    const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
      scripts?: Record<string, string>
      devDependencies?: Record<string, string>
    }
    const ciScript = readFileSync(join(root, 'scripts/ci.sh'), 'utf8')

    expect(existsSync(join(root, 'playwright.config.ts'))).toBe(true)
    expect(packageJson.scripts?.['test:e2e']).toContain('playwright test')
    expect(packageJson.devDependencies?.['@playwright/test']).toBeTruthy()
    expect(ciScript).toContain('pnpm test:e2e')
  })

  it('does not retain Vercel runtime or upload dependencies', () => {
    const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as {
      dependencies?: Record<string, string>
      devDependencies?: Record<string, string>
    }
    const envConfig = readFileSync(join(root, 'lib/config/env.ts'), 'utf8')
    const baseUrl = readFileSync(join(root, 'lib/http/base-url.ts'), 'utf8')

    expect(envConfig).not.toContain('VERCEL_URL')
    expect(baseUrl).not.toContain('VERCEL_URL')
    expect({
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    }).not.toHaveProperty('@vercel/blob')
    expect(existsSync(join(root, 'vercel.json'))).toBe(false)
    expect(existsSync(join(root, 'docs/specs/IMAGE_UPLOAD_IMPLEMENTATION_PLAN.md'))).toBe(false)
    expect(existsSync(join(root, 'docs/specs/IMAGE_UPLOAD_MIGRATION_CHECKLIST.md'))).toBe(false)
  })
})
