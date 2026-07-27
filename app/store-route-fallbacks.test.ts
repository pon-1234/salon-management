/**
 * @design_doc   docs/SYSTEM_AUDIT_2026-07-26.md B-3, C-4
 * @related_to   app/[store]/error.tsx, app/[store]/not-found.tsx: store-aware fallback pages
 * @known_issues None
 */
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const readRouteFile = (name: 'error' | 'not-found') =>
  readFile(resolve(process.cwd(), `app/[store]/${name}.tsx`), 'utf8')

describe('store route fallbacks', () => {
  it.each(['error', 'not-found'] as const)(
    '%s links back to the current store and uses design tokens',
    async (name) => {
      const source = await readRouteFile(name)

      expect(source).toContain('useParams')
      expect(source).toContain('`/${store}`')
      expect(source).not.toMatch(/#[0-9a-fA-F]{3,8}/)
    }
  )
})
