/**
 * @design_doc   Notion task #281 read-only media operations page
 * @related_to   MediaInfoPage owns editing and credentials
 * @known_issues None
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('media operations page', () => {
  it('shows three sections and links to public and admin sites without edit controls', () => {
    const source = readFileSync(join(__dirname, 'page.tsx'), 'utf8')
    expect(source).toContain('営業媒体')
    expect(source).toContain('求人媒体')
    expect(source).toContain('その他・店舗関連')
    expect(source).toContain('公開ページを開く')
    expect(source).toContain('管理画面を開く')
    expect(source).toContain('/admin/settings/media-info')
    expect(source).not.toContain('type="password"')
  })
})
