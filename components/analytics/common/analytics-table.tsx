'use client'

import { ReactNode } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DataTable, ColumnDef } from '@/components/ui/data-table'
import { useAsyncData } from '@/lib/hooks'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'

interface AnalyticsTableProps<T> {
  title: string
  description?: string
  fetcher: () => Promise<T[]>
  columns: ColumnDef<T>[]
  showPagination?: boolean
  pageSize?: number
  showFooter?: boolean
  dateRange?: { start: Date; end: Date }
  totalRow?: T
  formatDate?: (date: Date) => string
  emptyMessage?: string
  className?: string
  cardActions?: ReactNode
}

export function AnalyticsTable<T extends Record<string, any>>({
  title,
  description,
  fetcher,
  columns,
  showPagination = true,
  pageSize = 10,
  showFooter = false,
  dateRange,
  totalRow,
  formatDate = (date) => format(date, 'yyyy年MM月dd日', { locale: ja }),
  emptyMessage = 'データがありません',
  className,
  cardActions,
}: AnalyticsTableProps<T>) {
  const { data, loading, error, refetch } = useAsyncData(fetcher)

  const tableData = totalRow && data ? [...data, totalRow] : data || []

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>{title}</CardTitle>
          {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
          {dateRange && (
            <p className="mt-1 text-sm text-muted-foreground">
              期間: {formatDate(dateRange.start)} 〜 {formatDate(dateRange.end)}
            </p>
          )}
        </div>
        {cardActions}
      </CardHeader>
      <CardContent>
        {error ? (
          <div className="py-8 text-center">
            <p className="mb-4 text-red-500">データの読み込みに失敗しました</p>
            <button onClick={refetch} className="text-blue-600 underline hover:text-blue-800">
              再読み込み
            </button>
          </div>
        ) : (
          <DataTable
            data={tableData}
            columns={columns}
            loading={loading}
            showPagination={showPagination}
            pageSize={pageSize}
            showFooter={showFooter}
            emptyMessage={emptyMessage}
            rowClassName={(row) => (totalRow && row === totalRow ? 'bg-gray-50 font-semibold' : '')}
          />
        )}
      </CardContent>
    </Card>
  )
}

// 共通のカラム定義ヘルパー
export function createColumns<T>(
  definitions: Array<{
    id: string
    header: string
    accessor: keyof T | ((row: T) => any)
    cell?: (value: any, row: T) => ReactNode
    align?: 'left' | 'center' | 'right'
    className?: string
    footer?: (rows: T[]) => ReactNode
  }>
): ColumnDef<T>[] {
  return definitions.map((def) => ({
    ...def,
    cell: def.cell || ((value) => value?.toString() || '-'),
  }))
}

// 金額フォーマット用ヘルパー
export function formatCurrency(value: number): string {
  return `¥${value.toLocaleString()}`
}

// パーセンテージフォーマット用ヘルパー
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`
}
