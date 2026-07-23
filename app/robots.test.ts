/**
 * @design_doc   docs/VPS_DEPLOYMENT.md
 * @related_to   app/layout.tsx - Applies page-level noindex metadata; app/robots.ts - Blocks crawler access
 * @known_issues The test-domain restriction must be reviewed before any production-domain launch
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import robots from './robots'

describe('test-domain crawler protection', () => {
  it('blocks all crawlers through robots.txt', () => {
    expect(robots()).toEqual({
      rules: [{ userAgent: '*', disallow: '/' }],
    })
  })

  it('adds noindex and nofollow metadata to every route through the root layout', () => {
    const layout = readFileSync(join(process.cwd(), 'app', 'layout.tsx'), 'utf8')

    expect(layout).toContain('index: false')
    expect(layout).toContain('follow: false')
  })
})
