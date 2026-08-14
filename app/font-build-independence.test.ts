/**
 * @design_doc   Production builds must not depend on a live Google Fonts download
 * @related_to   app/layout.tsx global font loading; styles/globals.css font variables
 * @known_issues None
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

const projectRoot = process.cwd()
const layoutSource = readFileSync(join(projectRoot, 'app/layout.tsx'), 'utf8')
const globalStyles = readFileSync(join(projectRoot, 'styles/globals.css'), 'utf8')

describe('global font build independence', () => {
  it('loads optional web fonts at runtime instead of downloading them during next build', () => {
    expect(layoutSource).not.toContain("from 'next/font/google'")
    expect(layoutSource).not.toContain("from 'next/font/local'")
    expect(layoutSource).toContain('<body className="antialiased">')

    expect(globalStyles).toMatch(/^@import url\('https:\/\/fonts\.googleapis\.com\/css2\?/)
    expect(globalStyles).toContain("--font-body: 'Noto Sans JP'")
    expect(globalStyles).toContain("--font-display: 'Playfair Display'")
    expect(globalStyles).toContain("--font-luxury-serif: 'Noto Serif JP'")
    expect(globalStyles).toContain("--font-luxury-display: 'Cinzel'")
  })
})
