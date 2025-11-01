'use client'

import { useMemo } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { MonthlyData } from '@/lib/types/analytics'

interface AnnualQuarterTableProps {
  data: MonthlyData[]
  previousData: MonthlyData[]
}

interface QuarterSummary {
  quarter: string
  monthsLabel: string
  totalSales: number
  customerCount: number
  averagePerCustomer: number
  composition: number
  growthRate: number | null
  previousSales: number
}

const QUARTERS = [
  { label: '第1四半期', months: [1, 2, 3], rangeLabel: '1-3月' },
  { label: '第2四半期', months: [4, 5, 6], rangeLabel: '4-6月' },
  { label: '第3四半期', months: [7, 8, 9], rangeLabel: '7-9月' },
  { label: '第4四半期', months: [10, 11, 12], rangeLabel: '10-12月' },
]

export function AnnualQuarterTable({ data, previousData }: AnnualQuarterTableProps) {
  const previousMap = useMemo(() => {
    return new Map(previousData.map((entry) => [entry.month, entry]))
  }, [previousData])

  const totalSales = useMemo(
    () => data.reduce((sum, month) => sum + month.totalSales, 0),
    [data]
  )

  const quarters = useMemo<QuarterSummary[]>(() => {
    return QUARTERS.map(({ label, months, rangeLabel }) => {
      const currentMonths = data.filter((item) => months.includes(item.month))
      const previousMonths = months
        .map((month) => previousMap.get(month))
        .filter((item): item is MonthlyData => Boolean(item))

      const quarterSales = currentMonths.reduce((sum, item) => sum + item.totalSales, 0)
      const customerCount = currentMonths.reduce((sum, item) => sum + item.totalCount, 0)
      const previousSales = previousMonths.reduce((sum, item) => sum + item.totalSales, 0)

      const averagePerCustomer =
        customerCount > 0 ? Math.round(quarterSales / customerCount) : 0
      const composition = totalSales > 0 ? (quarterSales / totalSales) * 100 : 0
      const growthRate =
        previousSales > 0
          ? ((quarterSales - previousSales) / previousSales) * 100
          : null

      return {
        quarter: label,
        monthsLabel: rangeLabel,
        totalSales: quarterSales,
        customerCount,
        averagePerCustomer,
        composition,
        growthRate,
        previousSales,
      }
    })
  }, [data, previousMap, totalSales])

  const totals = useMemo(
    () =>
      quarters.reduce(
        (acc, curr) => ({
          totalSales: acc.totalSales + curr.totalSales,
          customerCount: acc.customerCount + curr.customerCount,
          previousSales: acc.previousSales + curr.previousSales,
        }),
        {
          totalSales: 0,
          customerCount: 0,
          previousSales: 0,
        }
      ),
    [quarters]
  )

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
            <TableHead>四半期</TableHead>
            <TableHead>期間</TableHead>
            <TableHead className="text-right">売上高</TableHead>
            <TableHead className="text-right">来客数</TableHead>
            <TableHead className="text-right">客単価</TableHead>
            <TableHead className="text-right">構成比</TableHead>
            <TableHead className="text-right">前年比</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {quarters.map((quarter) => (
            <TableRow key={quarter.quarter}>
              <TableCell className="font-medium">{quarter.quarter}</TableCell>
              <TableCell>{quarter.monthsLabel}</TableCell>
              <TableCell className="text-right">¥{quarter.totalSales.toLocaleString()}</TableCell>
              <TableCell className="text-right">
                {quarter.customerCount.toLocaleString()}人
              </TableCell>
              <TableCell className="text-right">
                ¥{quarter.averagePerCustomer.toLocaleString()}
              </TableCell>
              <TableCell className="text-right">{quarter.composition.toFixed(1)}%</TableCell>
              <TableCell className="text-right">
                {quarter.growthRate === null ? (
                  <span className="text-muted-foreground">-</span>
                ) : (
                  <span className={quarter.growthRate >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {`${quarter.growthRate >= 0 ? '+' : ''}${quarter.growthRate.toFixed(1)}%`}
                  </span>
                )}
              </TableCell>
            </TableRow>
          ))}
          <TableRow className="bg-gray-50 font-bold">
            <TableCell colSpan={2}>年間合計</TableCell>
            <TableCell className="text-right">¥{totals.totalSales.toLocaleString()}</TableCell>
            <TableCell className="text-right">{totals.customerCount.toLocaleString()}人</TableCell>
            <TableCell className="text-right">
              ¥
              {totals.customerCount > 0
                ? Math.round(totals.totalSales / totals.customerCount).toLocaleString()
                : 0}
            </TableCell>
            <TableCell className="text-right">100.0%</TableCell>
            <TableCell className="text-right">
              {totals.previousSales > 0 ? (
                <span
                  className={
                    totals.totalSales - totals.previousSales >= 0
                      ? 'text-green-600'
                      : 'text-red-600'
                  }
                >
                  {(() => {
                    const rate =
                      ((totals.totalSales - totals.previousSales) / totals.previousSales) * 100
                    return `${rate >= 0 ? '+' : ''}${rate.toFixed(1)}%`
                  })()}
                </span>
              ) : (
                <span className="text-muted-foreground">-</span>
              )}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  )
}
