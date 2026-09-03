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
  it('filters by employment lifecycle instead of mixing it with daily attendance', () => {
    expect(actionsSource).toContain('<SelectItem value="all">すべて</SelectItem>')
    expect(actionsSource).toContain('<SelectItem value="provisional">仮登録</SelectItem>')
    expect(actionsSource).toContain('<SelectItem value="active">在籍</SelectItem>')
    expect(actionsSource).toContain('<SelectItem value="retired">退店</SelectItem>')
    expect(actionsSource).not.toContain('<SelectItem value="出勤">出勤</SelectItem>')
    expect(actionsSource).not.toContain('就業中(公開)')
    expect(actionsSource).not.toContain('onFilter: () => void')
    expect(pageSource).not.toContain('onFilter={handleFilter}')
    expect(pageSource).toContain(
      "employmentStatus === 'all' || cast.employmentStatus === employmentStatus"
    )
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

  it('keeps the view and search controls visible while the cast list scrolls', () => {
    expect(pageSource).toContain('sticky top-0 z-20')
    expect(pageSource).toContain('<CastListViewToggle')
    expect(pageSource).toContain('<CastListActionButtons')
  })

  it('uses a dense list viewport for operational review', () => {
    const listSource = readFileSync(
      join(process.cwd(), 'components', 'cast', 'cast-list-view.tsx'),
      'utf8'
    )

    expect(listSource).toContain('2xl:grid-cols-8')
    expect(listSource).toContain('gap-2')
    expect(listSource).toContain('divide-y')
  })
})
