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
import { MonthlyStaffSummary } from '@/lib/types/analytics'

interface MonthlyStaffTableProps {
  year: number
  month: number
  analyticsUseCases: AnalyticsUseCases
}

export function MonthlyStaffTable({ year, month, analyticsUseCases }: MonthlyStaffTableProps) {
  const [data, setData] = useState<MonthlyStaffSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true
    setIsLoading(true)
    analyticsUseCases
      .getMonthlyStaffSummary(year, month)
      .then((result) => {
        if (!isMounted) return
        setData(result)
        setError(null)
      })
      .catch((err) => {
        console.error('[MonthlyStaffTable] failed to fetch staff summary', err)
        if (!isMounted) return
        setError('スタッフ別の集計データを取得できませんでした。')
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
      workDays: acc.workDays + curr.workDays,
      customerCount: acc.customerCount + curr.customerCount,
      totalSales: acc.totalSales + curr.totalSales,
      newCustomers: acc.newCustomers + curr.newCustomers,
      repeaters: acc.repeaters + curr.repeaters,
    }),
    {
      workDays: 0,
      customerCount: 0,
      totalSales: 0,
      newCustomers: 0,
      repeaters: 0,
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
            <TableHead>スタッフ名</TableHead>
            <TableHead className="text-right">出勤日数</TableHead>
            <TableHead className="text-right">接客数</TableHead>
            <TableHead className="text-right">売上高</TableHead>
            <TableHead className="text-right">客単価</TableHead>
            <TableHead className="text-right">新規客数</TableHead>
            <TableHead className="text-right">リピート客数</TableHead>
            <TableHead className="text-right">日平均売上</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((staff) => (
            <TableRow key={staff.id}>
              <TableCell className="font-medium">{staff.name}</TableCell>
              <TableCell className="text-right">{staff.workDays}日</TableCell>
              <TableCell className="text-right">{staff.customerCount}人</TableCell>
              <TableCell className="text-right">¥{staff.totalSales.toLocaleString()}</TableCell>
              <TableCell className="text-right">
                ¥{staff.averagePerCustomer.toLocaleString()}
              </TableCell>
              <TableCell className="text-right">{staff.newCustomers}人</TableCell>
              <TableCell className="text-right">{staff.repeaters}人</TableCell>
              <TableCell className="text-right">
                ¥
                {staff.workDays > 0
                  ? Math.round(staff.totalSales / staff.workDays).toLocaleString()
                  : '0'}
              </TableCell>
            </TableRow>
          ))}
          <TableRow className="bg-gray-50 font-bold">
            <TableCell>合計</TableCell>
            <TableCell className="text-right">{totals.workDays}日</TableCell>
            <TableCell className="text-right">{totals.customerCount}人</TableCell>
            <TableCell className="text-right">¥{totals.totalSales.toLocaleString()}</TableCell>
            <TableCell className="text-right">
              ¥
              {totals.customerCount > 0
                ? Math.round(totals.totalSales / totals.customerCount).toLocaleString()
                : 0}
            </TableCell>
            <TableCell className="text-right">{totals.newCustomers}人</TableCell>
            <TableCell className="text-right">{totals.repeaters}人</TableCell>
            <TableCell className="text-right">-</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  )
}
