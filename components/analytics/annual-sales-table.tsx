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

interface AnnualSalesTableProps {
  data: MonthlyData[]
  previousData: MonthlyData[]
}

export function AnnualSalesTable({ data, previousData }: AnnualSalesTableProps) {
  const previousMap = useMemo(() => {
    return new Map(previousData.map((entry) => [entry.month, entry]))
  }, [previousData])

  const totals = useMemo(() => {
    return data.reduce(
      (acc, curr) => ({
        workingDays: acc.workingDays + curr.workingDays,
        totalCount: acc.totalCount + curr.totalCount,
        totalSales: acc.totalSales + curr.totalSales,
        cashSales: acc.cashSales + curr.cashSales,
        cardSales: acc.cardSales + curr.cardSales,
        newCustomerCount: acc.newCustomerCount + curr.newCustomerCount,
        repeatCustomerCount: acc.repeatCustomerCount + curr.repeatCustomerCount,
        discounts: acc.discounts + curr.discounts,
        pointRewards: acc.pointRewards + curr.pointRewards,
      }),
      {
        workingDays: 0,
        totalCount: 0,
        totalSales: 0,
        cashSales: 0,
        cardSales: 0,
        newCustomerCount: 0,
        repeatCustomerCount: 0,
        discounts: 0,
        pointRewards: 0,
      }
    )
  }, [data])

  const previousTotals = useMemo(() => {
    return previousData.reduce(
      (acc, curr) => ({
        totalSales: acc.totalSales + curr.totalSales,
        totalCount: acc.totalCount + curr.totalCount,
      }),
      {
        totalSales: 0,
        totalCount: 0,
      }
    )
  }, [previousData])

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
            <TableHead>月</TableHead>
            <TableHead className="text-right">営業日数</TableHead>
            <TableHead className="text-right">来客数</TableHead>
            <TableHead className="text-right">新規</TableHead>
            <TableHead className="text-right">リピート</TableHead>
            <TableHead className="text-right">売上高</TableHead>
            <TableHead className="text-right">現金売上</TableHead>
            <TableHead className="text-right">カード売上</TableHead>
            <TableHead className="text-right">客単価</TableHead>
            <TableHead className="text-right">前年比</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row) => (
            <TableRow key={row.month}>
              <TableCell>{row.month}月</TableCell>
              <TableCell className="text-right">{row.workingDays}日</TableCell>
              <TableCell className="text-right">{row.totalCount.toLocaleString()}</TableCell>
              <TableCell className="text-right">{row.newCustomerCount}</TableCell>
              <TableCell className="text-right">{row.repeatCustomerCount}</TableCell>
              <TableCell className="text-right">¥{row.totalSales.toLocaleString()}</TableCell>
              <TableCell className="text-right">¥{row.cashSales.toLocaleString()}</TableCell>
              <TableCell className="text-right">¥{row.cardSales.toLocaleString()}</TableCell>
              <TableCell className="text-right">¥{row.salesPerCustomer.toLocaleString()}</TableCell>
              <TableCell className="text-right">
                {(() => {
                  const previous = previousMap.get(row.month)
                  const growthRate =
                    previous && previous.totalSales > 0
                      ? ((row.totalSales - previous.totalSales) / previous.totalSales) * 100
                      : row.totalSales > 0
                        ? 100
                        : 0

                  if (!previous || previous.totalSales === 0) {
                    return <span className="text-muted-foreground">-</span>
                  }

                  return (
                    <span className={growthRate >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {`${growthRate >= 0 ? '+' : ''}${growthRate.toFixed(1)}%`}
                    </span>
                  )
                })()}
              </TableCell>
            </TableRow>
          ))}
          <TableRow className="bg-gray-50 font-bold">
            <TableCell>合計</TableCell>
            <TableCell className="text-right">{totals.workingDays}日</TableCell>
            <TableCell className="text-right">{totals.totalCount.toLocaleString()}</TableCell>
            <TableCell className="text-right">{totals.newCustomerCount.toLocaleString()}</TableCell>
            <TableCell className="text-right">
              {totals.repeatCustomerCount.toLocaleString()}
            </TableCell>
            <TableCell className="text-right">¥{totals.totalSales.toLocaleString()}</TableCell>
            <TableCell className="text-right">¥{totals.cashSales.toLocaleString()}</TableCell>
            <TableCell className="text-right">¥{totals.cardSales.toLocaleString()}</TableCell>
            <TableCell className="text-right">
              ¥
              {totals.totalCount > 0
                ? Math.round(totals.totalSales / totals.totalCount).toLocaleString()
                : 0}
            </TableCell>
            <TableCell className="text-right">
              {previousTotals.totalSales > 0 ? (
                <span
                  className={
                    totals.totalSales - previousTotals.totalSales >= 0
                      ? 'text-green-600'
                      : 'text-red-600'
                  }
                >
                  {(() => {
                    const rate =
                      ((totals.totalSales - previousTotals.totalSales) /
                        previousTotals.totalSales) *
                      100
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
