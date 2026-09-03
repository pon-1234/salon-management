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
  it('uses client-side links instead of location and alert APIs', async () => {
    const source = await readSettingsPage()

    expect(source).toContain("import NextLink from 'next/link'")
    expect(source).not.toContain("import { toast } from '@/hooks/use-toast'")
    expect(source).not.toContain('window.location')
    expect(source).not.toContain('alert(')
    expect(source).not.toContain('console.log')
  })

  it.each(['business-qa', 'faq', 'mutual-links', 'templates', 'newsletter'])(
    'does not expose the unavailable %s setting to staff',
    async (id) => {
      const source = await readSettingsPage()

      expect(source).not.toContain(`id: '${id}'`)
    }
  )

  it('routes media management to its persisted settings screen', async () => {
    const source = await readSettingsPage()
    const item = source.match(/id: 'media-info'[\s\S]*?\n    },/)?.[0]

    expect(item).toContain("href: '/admin/settings/media-info'")
    expect(item).toContain("status: 'available'")
  })

  it('routes HP pricing to the persisted course and option sources', async () => {
    const source = await readSettingsPage()
    const item = source.match(/id: 'hp-pricing'[\s\S]*?\n    },/)?.[0]

    expect(item).toContain("status: 'available'")
    expect(item).toContain("href: '/admin/settings/hp-pricing'")
  })

  it('does not render clickable coming-soon cards', async () => {
    const source = await readSettingsPage()

    expect(source).not.toContain("status: 'coming-soon'")
    expect(source).not.toContain("import { toast } from '@/hooks/use-toast'")
  })
})
