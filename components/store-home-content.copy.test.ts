/**
 * @design_doc   docs/PREVIEW_UAT_CHECKLIST.md field-review store identity consistency
 * @related_to   store-home-content.tsx renders the public store hero
 * @known_issues Source-level copy regression; store-specific identity is covered by browser UAT
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

describe('StoreHomeContent hero copy', () => {
  it('uses location-neutral premium copy instead of grouping every store under Tokyo', () => {
    const source = readFileSync(join(process.cwd(), 'components/store-home-content.tsx'), 'utf8')

    expect(source).toContain('Premium Salon')
    expect(source).not.toContain('Tokyo Premium')
  })
})
