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

interface AnnualStoreTableProps {
  data: MonthlyData[]
  previousData: MonthlyData[]
  storeName: string
  storeAddress?: string
}

interface StoreSummary {
  id: string
  name: string
  location: string
  totalSales: number
  previousSales: number
  customerCount: number
  averagePerCustomer: number
  staffCount: number
  salesPerStaff: number
  growthRate: number | null
}

export function AnnualStoreTable({
  data,
  previousData,
  storeName,
  storeAddress,
}: AnnualStoreTableProps) {
  const summary = useMemo<StoreSummary | null>(() => {
    if (data.length === 0) {
      return null
    }

    const totalSales = data.reduce((sum, item) => sum + item.totalSales, 0)
    const previousSales = previousData.reduce((sum, item) => sum + item.totalSales, 0)
    const customerCount = data.reduce((sum, item) => sum + item.totalCount, 0)
    const totalStaff = data.reduce((sum, item) => sum + item.staffCount, 0)
    const averageStaff = data.length > 0 ? Math.round(totalStaff / data.length) : 0

    const averagePerCustomer =
      customerCount > 0 ? Math.round(totalSales / customerCount) : 0
    const salesPerStaff =
      averageStaff > 0 ? Math.round(totalSales / averageStaff) : 0
    const growthRate =
      previousSales > 0
        ? ((totalSales - previousSales) / previousSales) * 100
        : null

    return {
      id: 'current-store',
      name: storeName,
      location: storeAddress ?? '所在地未設定',
      totalSales,
      previousSales,
      customerCount,
      averagePerCustomer,
      staffCount: averageStaff,
      salesPerStaff,
      growthRate,
    }
  }, [data, previousData, storeAddress, storeName])

  if (!summary) {
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
            <TableHead>店舗名</TableHead>
            <TableHead>所在地</TableHead>
            <TableHead className="text-right">売上高</TableHead>
            <TableHead className="text-right">来客数</TableHead>
            <TableHead className="text-right">客単価</TableHead>
            <TableHead className="text-right">スタッフ数</TableHead>
            <TableHead className="text-right">人当たり売上</TableHead>
            <TableHead className="text-right">前年比</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow key={summary.id}>
            <TableCell className="font-medium">{summary.name}</TableCell>
            <TableCell>{summary.location}</TableCell>
            <TableCell className="text-right">¥{summary.totalSales.toLocaleString()}</TableCell>
            <TableCell className="text-right">
              {summary.customerCount.toLocaleString()}人
            </TableCell>
            <TableCell className="text-right">
              ¥{summary.averagePerCustomer.toLocaleString()}
            </TableCell>
            <TableCell className="text-right">{summary.staffCount}人</TableCell>
            <TableCell className="text-right">¥{summary.salesPerStaff.toLocaleString()}</TableCell>
            <TableCell className="text-right">
              {summary.growthRate === null ? (
                <span className="text-muted-foreground">-</span>
              ) : (
                <span className={summary.growthRate >= 0 ? 'text-green-600' : 'text-red-600'}>
                  {`${summary.growthRate >= 0 ? '+' : ''}${summary.growthRate.toFixed(1)}%`}
                </span>
              )}
            </TableCell>
          </TableRow>
          <TableRow className="bg-gray-50 font-bold">
            <TableCell colSpan={2}>合計</TableCell>
            <TableCell className="text-right">¥{summary.totalSales.toLocaleString()}</TableCell>
            <TableCell className="text-right">
              {summary.customerCount.toLocaleString()}人
            </TableCell>
            <TableCell className="text-right">
              ¥{summary.averagePerCustomer.toLocaleString()}
            </TableCell>
            <TableCell className="text-right">{summary.staffCount}人</TableCell>
            <TableCell className="text-right">¥{summary.salesPerStaff.toLocaleString()}</TableCell>
            <TableCell className="text-right">
              {summary.previousSales > 0 ? (
                <span
                  className={
                    summary.totalSales - summary.previousSales >= 0
                      ? 'text-green-600'
                      : 'text-red-600'
                  }
                >
                  {(() => {
                    const rate =
                      ((summary.totalSales - summary.previousSales) / summary.previousSales) * 100
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
