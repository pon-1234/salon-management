/**
 * @design_doc   Production environment fail-closed build policy
 * @related_to   ci.sh, lib/config/env.ts, deploy/xserver-vps/Dockerfile
 * @known_issues These non-secret values validate compilation only and cannot validate runtime dependencies
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('CI production build environment', () => {
  it('supplies explicit non-secret placeholders only to the compilation step', () => {
    const script = readFileSync(join(process.cwd(), 'scripts', 'ci.sh'), 'utf8')
    const buildSection = script.slice(script.indexOf('🏗️'))

    expect(buildSection).toContain('DATABASE_URL=postgresql://build:build@127.0.0.1:5432/build')
    expect(buildSection).toContain('NEXTAUTH_URL=https://build.invalid')
    expect(buildSection).toContain('NEXTAUTH_SECRET=build-time-placeholder-at-least-32-characters')
    expect(buildSection).toContain('STORAGE_ROOT=/tmp/salon-build-storage')
    expect(buildSection).toContain('STORAGE_PUBLIC_BASE_URL=https://build.invalid/salon-uploads')
    expect(buildSection).toContain('pnpm build')
  })

  it('runs isolated browser journeys before creating the final production build', () => {
    const script = readFileSync(join(process.cwd(), 'scripts', 'ci.sh'), 'utf8')
    const playwrightConfig = readFileSync(join(process.cwd(), 'playwright.config.ts'), 'utf8')
    const globalSetup = readFileSync(join(process.cwd(), 'e2e', 'global-setup.ts'), 'utf8')
    const browserJourneyIndex = script.indexOf('pnpm test:e2e')
    const productionBuildIndex = script.indexOf('pnpm build')

    expect(browserJourneyIndex).toBeGreaterThan(-1)
    expect(productionBuildIndex).toBeGreaterThan(browserJourneyIndex)
    expect(playwrightConfig).toContain('pnpm exec next dev')
    expect(playwrightConfig).toContain("globalSetup: './e2e/global-setup.ts'")
    expect(globalSetup).toContain('/ikebukuro/age-verification')
  })
})
