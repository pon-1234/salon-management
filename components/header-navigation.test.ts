/**
 * @design_doc   The compact admin header omits the redundant global search destination
 * @related_to   Header and app/(admin)/admin/search
 * @known_issues The search route remains available for existing bookmarks
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const headerSource = readFileSync(join(__dirname, 'header.tsx'), 'utf8')
const storeSelectorSource = readFileSync(join(__dirname, 'store', 'store-selector.tsx'), 'utf8')

describe('admin header navigation', () => {
  it('exposes a direct daily report link without replacing the existing analytics link', () => {
    expect(headerSource.match(/href="\/admin\/analytics\/daily-report"/g)).toHaveLength(2)
    expect(headerSource.match(/href="\/admin\/analytics\/daily-sales"/g)).toHaveLength(2)
    expect(headerSource).toContain('>日報<')
    expect(headerSource).toContain('>集計<')
  })

  it('does not expose the redundant global search link', () => {
    expect(headerSource).not.toContain("href: '/admin/search'")
    expect(headerSource).not.toContain('href="/admin/search"')
  })

  it('keeps tablet-width headers compact so page actions remain clickable below them', () => {
    expect(headerSource).toContain('className="xl:hidden"')
    expect(headerSource).not.toContain('className="md:hidden"')
    expect(headerSource).not.toContain('hidden md:block')
    expect(headerSource).not.toContain('md:flex')
  })

  it('does not allow a long store name to increase the fixed header height', () => {
    expect(storeSelectorSource).toContain(
      'className="flex shrink-0 items-center gap-2 whitespace-nowrap text-sm"'
    )
    expect(storeSelectorSource).toContain(
      'className="flex h-auto shrink-0 items-center gap-2 whitespace-nowrap px-3 py-2"'
    )
  })
})
