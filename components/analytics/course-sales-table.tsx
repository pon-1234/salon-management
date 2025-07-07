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
import { cn } from '@/lib/utils'
import { AnalyticsUseCases } from '@/lib/analytics/usecases'
import { CourseSalesData } from '@/lib/types/analytics'

interface CourseSalesTableProps {
  year: number
  month: number
  analyticsUseCases: AnalyticsUseCases
}

export function CourseSalesTable({ year, month, analyticsUseCases }: CourseSalesTableProps) {
  const [data, setData] = useState<CourseSalesData[]>([])

  useEffect(() => {
    const fetchData = async () => {
      const result = await analyticsUseCases.getCourseSalesReport(year, month)
      setData(result)
    }
    fetchData()
  }, [year, month, analyticsUseCases])

  // 月の日数を取得
  const daysInMonth = new Date(year, month, 0).getDate()

  // 日付の配列を生成（簡略版）
  const dates = Array.from({ length: Math.min(daysInMonth, 7) }, (_, i) => i + 1)

  // 合計を計算
  const calculateTotal = (sales: number[]) => {
    return sales.reduce((sum, count) => sum + count, 0)
  }

  // 売上金額を計算
  const calculateRevenue = (course: CourseSalesData) => {
    return calculateTotal(course.sales) * course.price
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[200px]">コース名</TableHead>
            <TableHead className="text-right">価格</TableHead>
            {dates.map((date) => (
              <TableHead key={date} className="text-center">
                {date}日
              </TableHead>
            ))}
            <TableHead className="text-center">...</TableHead>
            <TableHead className="text-right">合計数</TableHead>
            <TableHead className="text-right">売上額</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((course) => {
            const total = calculateTotal(course.sales)
            const revenue = calculateRevenue(course)

            return (
              <TableRow key={course.id}>
                <TableCell className="font-medium">
                  {course.name}
                  <span className="ml-2 text-xs text-gray-500">({course.duration}分)</span>
                </TableCell>
                <TableCell className="text-right">¥{course.price.toLocaleString()}</TableCell>
                {dates.map((date, index) => (
                  <TableCell key={index} className="text-center">
                    {course.sales[index] || '-'}
                  </TableCell>
                ))}
                <TableCell className="text-center text-gray-400">...</TableCell>
                <TableCell className="text-right font-medium">{total}</TableCell>
                <TableCell className="text-right font-medium text-green-600">
                  ¥{revenue.toLocaleString()}
                </TableCell>
              </TableRow>
            )
          })}
          <TableRow className="bg-gray-50 font-bold">
            <TableCell colSpan={dates.length + 3}>合計</TableCell>
            <TableCell className="text-right">
              {data.reduce((sum, course) => sum + calculateTotal(course.sales), 0)}
            </TableCell>
            <TableCell className="text-right text-green-600">
              ¥{data.reduce((sum, course) => sum + calculateRevenue(course), 0).toLocaleString()}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  )
}
