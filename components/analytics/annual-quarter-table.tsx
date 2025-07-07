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

interface AnnualQuarterTableProps {
  year: number
  analyticsUseCases: AnalyticsUseCases
}

interface QuarterData {
  quarter: string
  months: string
  totalSales: number
  customerCount: number
  averagePerCustomer: number
  growthRate: number
  composition: number
}

export function AnnualQuarterTable({ year, analyticsUseCases }: AnnualQuarterTableProps) {
  const [data, setData] = useState<QuarterData[]>([])

  useEffect(() => {
    // ダミーデータ（実際にはuseCasesから取得）
    const dummyData: QuarterData[] = [
      {
        quarter: '第1四半期',
        months: '1-3月',
        totalSales: 23456700,
        customerCount: 2456,
        averagePerCustomer: 9552,
        growthRate: 5.2,
        composition: 22.9,
      },
      {
        quarter: '第2四半期',
        months: '4-6月',
        totalSales: 25678900,
        customerCount: 2678,
        averagePerCustomer: 9589,
        growthRate: 8.7,
        composition: 25.1,
      },
      {
        quarter: '第3四半期',
        months: '7-9月',
        totalSales: 27234500,
        customerCount: 2834,
        averagePerCustomer: 9612,
        growthRate: 11.2,
        composition: 26.6,
      },
      {
        quarter: '第4四半期',
        months: '10-12月',
        totalSales: 26148300,
        customerCount: 2736,
        averagePerCustomer: 9553,
        growthRate: 6.8,
        composition: 25.5,
      },
    ]
    setData(dummyData)
  }, [year, analyticsUseCases])

  // 合計を計算
  const totals = data.reduce(
    (acc, curr) => ({
      totalSales: acc.totalSales + curr.totalSales,
      customerCount: acc.customerCount + curr.customerCount,
    }),
    {
      totalSales: 0,
      customerCount: 0,
    }
  )

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
          {data.map((quarter) => (
            <TableRow key={quarter.quarter}>
              <TableCell className="font-medium">{quarter.quarter}</TableCell>
              <TableCell>{quarter.months}</TableCell>
              <TableCell className="text-right">¥{quarter.totalSales.toLocaleString()}</TableCell>
              <TableCell className="text-right">
                {quarter.customerCount.toLocaleString()}人
              </TableCell>
              <TableCell className="text-right">
                ¥{quarter.averagePerCustomer.toLocaleString()}
              </TableCell>
              <TableCell className="text-right">{quarter.composition}%</TableCell>
              <TableCell className="text-right">
                <span className={quarter.growthRate > 0 ? 'text-green-600' : 'text-red-600'}>
                  {quarter.growthRate > 0 ? '+' : ''}
                  {quarter.growthRate}%
                </span>
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
            <TableCell className="text-right">-</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  )
}
