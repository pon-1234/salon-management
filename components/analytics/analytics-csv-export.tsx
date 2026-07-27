'use client'

/**
 * @design_doc   docs/SYSTEM_AUDIT_2026-07-26.md A-5
 * @related_to   analytics route layout, lib/export/csv.ts
 * @known_issues Chart-only reports must expose a table to participate in CSV export
 */
import { Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from '@/hooks/use-toast'
import { downloadCsv } from '@/lib/export/csv'

export function AnalyticsCsvExport() {
  const handleExport = () => {
    const tables = document.querySelectorAll<HTMLTableElement>('#analytics-export-root table')
    const rows = Array.from(tables).flatMap((table) =>
      Array.from(table.rows).map((row) =>
        Array.from(row.cells).map((cell) => cell.innerText.trim())
      )
    )

    if (rows.length === 0) {
      toast({ description: 'エクスポートできる表データがありません。' })
      return
    }

    const date = new Date().toISOString().slice(0, 10)
    downloadCsv(`analytics-${date}.csv`, rows)
    toast({ description: 'CSVをダウンロードしました。' })
  }

  return (
    <Button type="button" variant="outline" size="sm" onClick={handleExport}>
      <Download className="mr-2 h-4 w-4" />
      CSVエクスポート
    </Button>
  )
}
