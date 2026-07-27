/**
 * @design_doc   docs/SYSTEM_AUDIT_2026-07-26.md K-2
 * @related_to   Customer, reservation, cast, review, and cross-search admin lists
 * @known_issues None
 */
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const listPages = [
  'customers/page.tsx',
  'reservation-list/page.tsx',
  'cast/list/page.tsx',
  'reviews/page.tsx',
  'search/search-content.tsx',
] as const

describe('admin list pagination', () => {
  it.each(listPages)('%s requests bounded pages and renders navigation', async (file) => {
    const source = await readFile(resolve(process.cwd(), `app/(admin)/admin/${file}`), 'utf8')

    expect(source).toContain('PAGE_SIZE')
    expect(source).toContain('offset')
    expect(source).toContain('前へ')
    expect(source).toContain('次へ')
  })

  it('keeps the global cast picker bounded', async () => {
    const source = await readFile(resolve(process.cwd(), 'components/header.tsx'), 'utf8')

    expect(source).toContain('limit=100')
  })
})
