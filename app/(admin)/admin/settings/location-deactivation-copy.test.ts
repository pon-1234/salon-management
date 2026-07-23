/**
 * @design_doc   docs/PREVIEW_UAT_CHECKLIST.md reversible location-setting operations
 * @related_to   AreaInfoPage and StationInfoPage: preserve migrated reservation references
 * @known_issues None
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const settingsDirectory = __dirname

describe.each([
  ['エリア', 'area-info'],
  ['駅', 'station-info'],
] as const)('%s settings deactivation copy', (label, directory) => {
  it('describes the reversible soft-delete behavior accurately', () => {
    const source = readFileSync(join(settingsDirectory, directory, 'page.tsx'), 'utf8')

    expect(source).toContain(`${label}情報を停止しますか？`)
    expect(source).toContain('予約履歴は保持され、スイッチから再有効化できます。')
    expect(source).toContain('confirmLabel="停止する"')
    expect(source).toContain('停止しました')
    expect(source).not.toContain(`${label}情報を削除しますか？`)
    expect(source).not.toContain('この操作は取り消せません')
  })
})
