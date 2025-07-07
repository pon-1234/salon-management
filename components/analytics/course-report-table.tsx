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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

interface CourseReportTableProps {
  year: number
  month: number
  analyticsUseCases: AnalyticsUseCases
}

// 祝日判定（簡易版）
const isHoliday = (year: number, month: number, day: number) => {
  const date = new Date(year, month - 1, day)
  const dayOfWeek = date.getDay()

  // 土曜日か日曜日
  if (dayOfWeek === 0 || dayOfWeek === 6) return true

  // 祝日（固定）
  const fixedHolidays = [
    [1, 1], // 元日
    [2, 11], // 建国記念の日
    [4, 29], // 昭和の日
    [5, 3], // 憲法記念日
    [5, 4], // みどりの日
    [5, 5], // こどもの日
    [8, 11], // 山の日
    [11, 3], // 文化の日
    [11, 23], // 勤労感謝の日
  ]

  return fixedHolidays.some(([m, d]) => m === month && d === day)
}

export function CourseReportTable({ year, month, analyticsUseCases }: CourseReportTableProps) {
  const [data, setData] = useState<CourseSalesData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const result = await analyticsUseCases.getCourseSalesReport(year, month)
        setData(result)
      } catch (err) {
        setError('データの取得中にエラーが発生しました。')
        console.error(err)
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [year, month, analyticsUseCases])

  // 月の日数を取得
  const daysInMonth = new Date(year, month, 0).getDate()

  // 日付の配列を生成
  const dates = Array.from({ length: daysInMonth }, (_, i) => {
    const date = new Date(year, month - 1, i + 1)
    const dayOfWeek = ['日', '月', '火', '水', '木', '金', '土'][date.getDay()]
    return {
      day: i + 1,
      dayOfWeek,
      isHoliday: isHoliday(year, month, i + 1),
    }
  })

  // 合計を計算
  const calculateTotal = (sales: number[]) => {
    return sales.reduce((sum, count) => sum + count, 0)
  }

  if (isLoading) {
    return <TableSkeleton />
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>エラー</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  if (data.length === 0) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>注意</AlertTitle>
        <AlertDescription>表示するデータがありません。</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="rounded-lg border bg-white print:border-none">
      <Table className="min-w-[1200px]">
        <TableHeader className="bg-gray-50">
          <TableRow>
            <TableHead className="w-[100px]">コース</TableHead>
            {dates.map((date) => (
              <TableHead
                key={date.day}
                className={cn(
                  'whitespace-nowrap p-2 text-center',
                  date.isHoliday && 'bg-orange-100'
                )}
              >
                {date.day}
                <br />({date.dayOfWeek})
              </TableHead>
            ))}
            <TableHead className="bg-gray-100 text-center">TOTAL</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((course) => (
            <TableRow key={course.id}>
              <TableCell className="whitespace-nowrap font-medium">
                {course.name} ({course.duration}分)
              </TableCell>
              {dates.map((date, index) => (
                <TableCell
                  key={index}
                  className={cn('text-center', date.isHoliday && 'bg-orange-50')}
                >
                  {course.sales[index] || ''}
                </TableCell>
              ))}
              <TableCell className="bg-gray-50 text-center font-medium">
                {calculateTotal(course.sales)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function TableSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
    </div>
  )
}
