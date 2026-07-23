/**
 * @design_doc   docs/LEGACY_DATA_MIGRATION_RUNBOOK.md production readiness gate
 * @related_to   next.config.mjs - Next.js production build configuration
 * @known_issues None currently
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('Next.js production quality gates', () => {
  const config = readFileSync(join(process.cwd(), 'next.config.mjs'), 'utf8')

  it('does not bypass ESLint or TypeScript errors during production builds', () => {
    expect(config).not.toContain('ignoreDuringBuilds: true')
    expect(config).not.toContain('ignoreBuildErrors: true')
  })

  it('does not manufacture a localhost authentication origin', () => {
    expect(config).not.toContain("process.env.NEXTAUTH_URL = 'http://localhost:3000'")
  })
})
