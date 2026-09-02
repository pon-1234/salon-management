/**
 * @design_doc   Notion task #282 special designation rank storefront sync
 * @related_to   Public cast projection and storefront cast cards
 * @known_issues None
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const source = readFileSync(join(__dirname, 'page.tsx'), 'utf8')

describe('public cast special designation fee', () => {
  it('shows the selected special designation amount beside the cast identity', () => {
    expect(source).toContain('cast.specialDesignationFee')
    expect(source).toContain('特別指名料')
  })
})
