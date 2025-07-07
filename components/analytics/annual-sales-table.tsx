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
import { MonthlyData } from '@/lib/types/analytics'

interface AnnualSalesTableProps {
  year: number
  analyticsUseCases: AnalyticsUseCases
}

export function AnnualSalesTable({ year, analyticsUseCases }: AnnualSalesTableProps) {
  const [data, setData] = useState<MonthlyData[]>([])

  useEffect(() => {
    const fetchData = async () => {
      const result = await analyticsUseCases.getMonthlyReport(year)
      setData(result)
    }
    fetchData()
  }, [year, analyticsUseCases])

  // 合計を計算
  const totals = data.reduce(
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
                <span className={row.previousYearRatio > 1 ? 'text-green-600' : 'text-red-600'}>
                  {(row.previousYearRatio * 100).toFixed(1)}%
                </span>
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
            <TableCell className="text-right">-</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  )
}
