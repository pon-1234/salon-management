/**
 * @design_doc   Client operational review: cast list controls must filter the complete result set
 * @related_to   CastListPage and CastListActionButtons
 * @known_issues Source contract complements cast repository pagination tests
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const pageSource = readFileSync(join(__dirname, 'page.tsx'), 'utf8')
const actionsSource = readFileSync(
  join(process.cwd(), 'components', 'cast', 'cast-list-action-buttons.tsx'),
  'utf8'
)

describe('CastListPage filters', () => {
  it('uses the real work-status values and removes the no-op filter action', () => {
    expect(actionsSource).toContain('<SelectItem value="all">すべて</SelectItem>')
    expect(actionsSource).toContain('<SelectItem value="出勤">出勤</SelectItem>')
    expect(actionsSource).toContain('<SelectItem value="未出勤">未出勤</SelectItem>')
    expect(actionsSource).toContain('<SelectItem value="休日">休日</SelectItem>')
    expect(actionsSource).not.toContain('就業中(公開)')
    expect(actionsSource).not.toContain('onFilter: () => void')
    expect(pageSource).not.toContain('onFilter={handleFilter}')
    expect(pageSource).toContain("workStatus === 'all' || cast.workStatus === workStatus")
  })

  it('loads all cast pages before applying name and kana filters', () => {
    expect(pageSource).toContain('limit: 100')
    expect(pageSource).toContain('setKanaFilter(char)')
    expect(pageSource).toContain('matchesKanaFilter(cast.nameKana, kanaFilter)')
    expect(pageSource).toContain('matchesCastNameSearch(cast, nameSearch)')
    expect(pageSource).not.toContain("cast.name.toLocaleLowerCase('ja-JP')")
    expect(pageSource).not.toContain('Filters apply to the current page')
    expect(actionsSource).toContain('名前・ひらがなで検索')
    expect(actionsSource).toContain('aria-label="キャスト名・ひらがな検索"')
  })
})
