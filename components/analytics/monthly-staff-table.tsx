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

interface MonthlyStaffTableProps {
  year: number
  month: number
  analyticsUseCases: AnalyticsUseCases
}

interface StaffPerformance {
  id: string
  name: string
  workDays: number
  customerCount: number
  totalSales: number
  averagePerCustomer: number
  newCustomers: number
  repeaters: number
}

export function MonthlyStaffTable({ year, month, analyticsUseCases }: MonthlyStaffTableProps) {
  const [data, setData] = useState<StaffPerformance[]>([])

  useEffect(() => {
    // ダミーデータ（実際にはuseCasesから取得）
    const dummyData: StaffPerformance[] = [
      {
        id: '1',
        name: '田中 美咲',
        workDays: 22,
        customerCount: 156,
        totalSales: 1523400,
        averagePerCustomer: 9765,
        newCustomers: 28,
        repeaters: 128,
      },
      {
        id: '2',
        name: '佐藤 健太',
        workDays: 20,
        customerCount: 142,
        totalSales: 1356200,
        averagePerCustomer: 9550,
        newCustomers: 21,
        repeaters: 121,
      },
      {
        id: '3',
        name: '山田 花子',
        workDays: 24,
        customerCount: 189,
        totalSales: 1892300,
        averagePerCustomer: 10012,
        newCustomers: 35,
        repeaters: 154,
      },
      {
        id: '4',
        name: '鈴木 太郎',
        workDays: 21,
        customerCount: 134,
        totalSales: 1234500,
        averagePerCustomer: 9213,
        newCustomers: 19,
        repeaters: 115,
      },
      {
        id: '5',
        name: '高橋 さくら',
        workDays: 23,
        customerCount: 167,
        totalSales: 1678900,
        averagePerCustomer: 10053,
        newCustomers: 31,
        repeaters: 136,
      },
    ]
    setData(dummyData)
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
                ¥{Math.round(staff.totalSales / staff.workDays).toLocaleString()}
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
