/**
 * @design_doc   docs/PREVIEW_UAT_CHECKLIST.md management settings write-operation checks
 * @related_to   Settings hub and persisted course/option settings
 * @known_issues None
 */
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const readSettingsFile = (path: string) =>
  readFile(resolve(process.cwd(), `app/(admin)/admin/settings/${path}/page.tsx`), 'utf8')

describe('settings controls only expose supported operations', () => {
  it.each(['templates', 'mutual-links'])(
    'keeps the unsupported %s route private instead of showing disabled controls',
    async (path) => {
      const source = await readSettingsFile(path)

      expect(source).toContain("import { notFound } from 'next/navigation'")
      expect(source).toContain('notFound()')
      expect(source).not.toContain('<Button')
      expect(source).not.toContain('disabled')
    }
  )

  it('makes HP pricing an honest gateway to the persisted pricing editors', async () => {
    const source = await readSettingsFile('hp-pricing')

    expect(source).toContain("href: '/admin/settings/course-info'")
    expect(source).toContain("href: '/admin/settings/option-info'")
    expect(source).toContain('公開サイトの料金は、この2つの実データから表示されます')
    expect(source).not.toContain('disabled')
    expect(source).not.toContain('準備中')
  })

  it.each(['course-info', 'option-info'])(
    'does not claim unsupported all-store synchronization in %s',
    async (path) => {
      const source = await readSettingsFile(path)

      expect(source).not.toContain('全店舗に同期')
      expect(source).not.toContain('syncPricing(')
    }
  )

  it('never presents designation fixtures as persisted management data', async () => {
    const source = await readSettingsFile('designation-fees')

    expect(source).not.toContain('DEFAULT_DESIGNATION_FEES')
    expect(source).toContain('surfaceErrors: true')
    expect(source).toContain('指名料が登録されていません')
    expect(source).not.toContain('デフォルト値を表示しています')
  })

  it('allows the final event banner removal to be saved without double submission', async () => {
    const source = await readSettingsFile('event-banners')

    expect(source).not.toContain('if (banners.length === 0)')
    expect(source).toContain('disabled={saving}')
    expect(source).toContain('削除しました。「すべて保存する」で反映してください')
  })
})
