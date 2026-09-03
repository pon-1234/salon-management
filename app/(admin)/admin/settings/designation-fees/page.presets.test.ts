/**
 * @design_doc   Notion #282 discoverable designation fee rank presets
 * @related_to   DesignationFeesPage and CastForm special designation selector
 * @known_issues None
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('designation fee presets', () => {
  it('offers the requested bronze through black rank ladder', () => {
    const source = readFileSync(join(__dirname, 'page.tsx'), 'utf8')
    for (const [name, price] of [
      ['ブロンズ', '1000'],
      ['シルバー', '2000'],
      ['ゴールド', '3000'],
      ['プラチナ', '4000'],
      ['ブラック', '5000'],
    ]) {
      expect(source).toContain(`name: '${name}'`)
      expect(source).toContain(`price: ${price}`)
    }
    expect(source).toContain('標準ランクを一括追加')
  })
})
