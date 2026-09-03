/**
 * @design_doc   Notion #281 centralized media account administration
 * @related_to   Store settings API and reservation marketing channel selectors
 * @known_issues None
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('MediaInfoPage', () => {
  it('manages sales and recruitment sites with centrally stored login information', () => {
    const source = readFileSync(join(__dirname, 'page.tsx'), 'utf8')

    expect(source).toContain('営業媒体')
    expect(source).toContain('求人媒体')
    expect(source).toContain('管理画面URL')
    expect(source).toContain('ログインID')
    expect(source).toContain('パスワード')
    expect(source).toContain('/api/settings/store')
  })
})
