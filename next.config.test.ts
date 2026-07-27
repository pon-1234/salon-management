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

  it('sets the browser security headers required by the production edge', async () => {
    for (const header of [
      'Content-Security-Policy',
      'Strict-Transport-Security',
      'X-Frame-Options',
      'X-Content-Type-Options',
      'Referrer-Policy',
      'Permissions-Policy',
    ]) {
      expect(config).toContain(header)
    }
    const { default: nextConfig } = await import('./next.config.mjs')
    const configuredHeaders = await nextConfig.headers?.()
    const contentSecurityPolicy = configuredHeaders?.[0]?.headers.find(
      (header) => header.key === 'Content-Security-Policy'
    )?.value

    expect(contentSecurityPolicy).toContain("script-src 'self'")
    expect(contentSecurityPolicy).not.toContain("'unsafe-eval'")
  })

  it('keeps Next.js image optimization enabled', () => {
    expect(config).not.toContain('unoptimized: true')
    expect(config).toContain('remotePatterns')
  })
})
