/**
 * @design_doc   docs/SYSTEM_AUDIT_2026-07-26.md A-5
 * @related_to   AnalyticsCsvExport: browser download adapter
 * @known_issues Exports visible tabular report data; chart-only views require a table before export
 */
const FORMULA_PREFIX = /^[=+\-@]/

function escapeCell(value: string | number | boolean | null | undefined): string {
  let normalized = value === null || value === undefined ? '' : String(value)
  if (FORMULA_PREFIX.test(normalized)) {
    normalized = `'${normalized}`
  }
  if (/[",\r\n]/.test(normalized)) {
    return `"${normalized.replaceAll('"', '""')}"`
  }
  return normalized
}

export function toExcelCsv(rows: ReadonlyArray<ReadonlyArray<unknown>>): string {
  const body = rows
    .map((row) => row.map((cell) => escapeCell(cell as never)).join(','))
    .join('\r\n')
  return `\uFEFF${body}`
}

export function downloadCsv(filename: string, rows: ReadonlyArray<ReadonlyArray<unknown>>): void {
  const blob = new Blob([toExcelCsv(rows)], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
