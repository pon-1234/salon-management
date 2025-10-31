'use client'

import { useEffect, useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { AnalyticsUseCases } from '@/lib/analytics/usecases'
import { MonthlyAreaSummary } from '@/lib/types/analytics'

interface MonthlyAreaTableProps {
  year: number
  month: number
  analyticsUseCases: AnalyticsUseCases
}

export function MonthlyAreaTable({ year, month, analyticsUseCases }: MonthlyAreaTableProps) {
  const [data, setData] = useState<MonthlyAreaSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true
    setIsLoading(true)

    analyticsUseCases
      .getMonthlyAreaSummary(year, month)
      .then((result) => {
        if (!isMounted) return
        setData(result)
        setError(null)
      })
      .catch((err) => {
        console.error('[MonthlyAreaTable] failed to fetch area summary', err)
        if (!isMounted) return
        setError('エリア別の集計データを取得できませんでした。')
        setData([])
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [year, month, analyticsUseCases])

  // 合計を計算
  const totals = data.reduce(
    (acc, curr) => ({
      customerCount: acc.customerCount + curr.customerCount,
      newCustomers: acc.newCustomers + curr.newCustomers,
      repeaters: acc.repeaters + curr.repeaters,
      totalSales: acc.totalSales + curr.totalSales,
    }),
    {
      customerCount: 0,
      newCustomers: 0,
      repeaters: 0,
      totalSales: 0,
    }
  )

  if (isLoading) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
        読み込み中...
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
        {error}
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
        データがありません。
      </div>
    )
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>エリア</TableHead>
            <TableHead className="text-right">来客数</TableHead>
            <TableHead className="text-right">新規</TableHead>
            <TableHead className="text-right">リピート</TableHead>
            <TableHead className="text-right">売上高</TableHead>
            <TableHead className="text-right">客単価</TableHead>
            <TableHead className="text-right">構成比</TableHead>
            <TableHead className="text-right">前月比</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((area) => (
            <TableRow key={area.area}>
              <TableCell className="font-medium">{area.area}</TableCell>
              <TableCell className="text-right">{area.customerCount}人</TableCell>
              <TableCell className="text-right">{area.newCustomers}人</TableCell>
              <TableCell className="text-right">{area.repeaters}人</TableCell>
              <TableCell className="text-right">¥{area.totalSales.toLocaleString()}</TableCell>
              <TableCell className="text-right">
                ¥{area.averagePerCustomer.toLocaleString()}
              </TableCell>
              <TableCell className="text-right">
                {totals.totalSales > 0
                  ? ((area.totalSales / totals.totalSales) * 100).toFixed(1)
                  : '0.0'}
                %
              </TableCell>
              <TableCell className="text-right">
                <span className={area.growthRate > 0 ? 'text-green-600' : 'text-red-600'}>
                  {area.growthRate > 0 ? '+' : ''}
                  {area.growthRate.toFixed(1)}%
                </span>
              </TableCell>
            </TableRow>
          ))}
          <TableRow className="bg-gray-50 font-bold">
            <TableCell>合計</TableCell>
            <TableCell className="text-right">{totals.customerCount}人</TableCell>
            <TableCell className="text-right">{totals.newCustomers}人</TableCell>
            <TableCell className="text-right">{totals.repeaters}人</TableCell>
            <TableCell className="text-right">¥{totals.totalSales.toLocaleString()}</TableCell>
            <TableCell className="text-right">
              ¥
              {totals.customerCount > 0
                ? Math.round(totals.totalSales / totals.customerCount).toLocaleString()
                : 0}
            </TableCell>
            <TableCell className="text-right">100.0%</TableCell>
            <TableCell className="text-right">-</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  )
}
