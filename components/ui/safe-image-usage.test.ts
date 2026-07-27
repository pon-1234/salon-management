/**
 * @design_doc   docs/SYSTEM_AUDIT_2026-07-26.md J-4 application-wide image fallback
 * @related_to   SafeImage is the only component allowed to render a native img element
 * @known_issues Next.js Image migration remains a separate performance phase
 */
import { readFileSync, readdirSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

function listTsxFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) {
      return listTsxFiles(path)
    }
    return entry.name.endsWith('.tsx') ? [path] : []
  })
}

describe('SafeImage adoption', () => {
  it('routes every application img element through the shared fallback component', () => {
    const root = process.cwd()
    const offenders = [resolve(root, 'app'), resolve(root, 'components')]
      .flatMap(listTsxFiles)
      .map((file) => relative(root, file))
      .filter((file) => !file.endsWith('.test.tsx') && file !== 'components/ui/safe-image.tsx')
      .filter((file) => readFileSync(resolve(root, file), 'utf8').includes('<img'))

    expect(offenders).toEqual([])
  })
})
