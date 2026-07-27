/**
 * @design_doc   docs/SYSTEM_AUDIT_2026-07-26.md B-5, C-6
 * @related_to   app/(admin)/admin/settings/page.tsx: settings navigation hub
 * @known_issues None
 */
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const readSettingsPage = () =>
  readFile(resolve(process.cwd(), 'app/(admin)/admin/settings/page.tsx'), 'utf8')

describe('settings hub navigation', () => {
  it('uses client-side links and toast feedback instead of location and alert APIs', async () => {
    const source = await readSettingsPage()

    expect(source).toContain("import NextLink from 'next/link'")
    expect(source).toContain("import { toast } from '@/hooks/use-toast'")
    expect(source).not.toContain('window.location')
    expect(source).not.toContain('alert(')
    expect(source).not.toContain('console.log')
  })

  it.each(['faq', 'media-info', 'newsletter'])(
    'marks the unavailable %s setting as coming soon',
    async (id) => {
      const source = await readSettingsPage()
      const item = source.match(new RegExp(`id: '${id}'[\\s\\S]*?\\n    },`))?.[0]

      expect(item).toContain("status: 'coming-soon'")
      expect(item).not.toContain('href:')
    }
  )
})
