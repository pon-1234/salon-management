/**
 * @design_doc   docs/SYSTEM_AUDIT_2026-07-26.md A-5
 * @related_to   AnalyticsCsvExport: shared analytics export action
 * @known_issues None
 */
import { describe, expect, it } from 'vitest'
import { toExcelCsv } from './csv'

describe('toExcelCsv', () => {
  it('adds a UTF-8 BOM and escapes commas, quotes, and line breaks', () => {
    expect(
      toExcelCsv([
        ['name', 'memo'],
        ['山田,太郎', 'a "quoted"\nline'],
      ])
    ).toBe('\uFEFFname,memo\r\n"山田,太郎","a ""quoted""\nline"')
  })

  it('prevents spreadsheet formula execution', () => {
    expect(toExcelCsv([['=HYPERLINK("https://example.com")', '+1', '-2', '@cmd']])).toBe(
      '\uFEFF"\'=HYPERLINK(""https://example.com"")",\'+1,\'-2,\'@cmd'
    )
  })
})
