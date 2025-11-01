'use client'

import { useMemo, useState, useEffect } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { TrendingUp, TrendingDown } from 'lucide-react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

interface CourseTrendTableProps {
  series: CourseTrendSeries[]
}

interface CourseTrendSeries {
  label: string
  year: number
  month: number
  summaries: CourseSummary[]
}

interface CourseSummary {
  id: string
  name: string
  price: number
  totalBookings: number
  revenue: number
}

interface CourseTrendRow {
  id: string
  name: string
  monthlyData: MonthlyTrendPoint[]
  totalBookings: number
  totalRevenue: number
  growthRate: number | null
  averagePrice: number
}

interface MonthlyTrendPoint {
  month: string
  bookings: number
  revenue: number
}

const calculateGrowthRate = (start: number, end: number) => {
  if (start === 0) {
    return end === 0 ? null : 100
  }
  return ((end - start) / start) * 100
}

export function CourseTrendTable({ series }: CourseTrendTableProps) {
  const chronologicalSeries = useMemo(() => [...series].reverse(), [series])

  const courses = useMemo<CourseTrendRow[]>(() => {
    const labels = chronologicalSeries.map((item) => item.label)
    const courseMap = new Map<string, CourseTrendRow>()

    chronologicalSeries.forEach((entry) => {
      entry.summaries.forEach((summary) => {
        const trend = courseMap.get(summary.id) ?? {
          id: summary.id,
          name: summary.name,
          monthlyData: [] as MonthlyTrendPoint[],
          totalBookings: 0,
          totalRevenue: 0,
          growthRate: null as number | null,
          averagePrice: summary.price,
        }

        trend.monthlyData.push({
          month: entry.label,
          bookings: summary.totalBookings,
          revenue: summary.revenue,
        })
        trend.totalBookings += summary.totalBookings
        trend.totalRevenue += summary.revenue
        trend.averagePrice = summary.price

        courseMap.set(summary.id, trend)
      })
    })

    // Fill missing months with zero values and calculate growth
    courseMap.forEach((trend) => {
      const monthMap = new Map(trend.monthlyData.map((item) => [item.month, item]))
      labels.forEach((label) => {
        if (!monthMap.has(label)) {
          trend.monthlyData.push({ month: label, bookings: 0, revenue: 0 })
        }
      })
      trend.monthlyData.sort(
        (a, b) => labels.indexOf(a.month) - labels.indexOf(b.month)
      )
      if (trend.monthlyData.length >= 2) {
        const firstRevenue = trend.monthlyData[0].revenue
        const lastRevenue = trend.monthlyData[trend.monthlyData.length - 1].revenue
        trend.growthRate = calculateGrowthRate(firstRevenue, lastRevenue)
      }
    })

    return Array.from(courseMap.values()).sort((a, b) => b.totalRevenue - a.totalRevenue)
  }, [chronologicalSeries])

  const [selectedCourse, setSelectedCourse] = useState<string | null>(null)

  useEffect(() => {
    if (!selectedCourse && courses.length > 0) {
      setSelectedCourse(courses[0].id)
    }
    if (selectedCourse && !courses.find((course) => course.id === selectedCourse)) {
      setSelectedCourse(courses[0]?.id ?? null)
    }
  }, [courses, selectedCourse])

  const selectedCourseData = courses.find((course) => course.id === selectedCourse)

  if (courses.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center rounded-lg border text-sm text-muted-foreground">
        データがありません。
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>コース名</TableHead>
              <TableHead className="text-right">3ヶ月予約数</TableHead>
              <TableHead className="text-right">3ヶ月売上</TableHead>
              <TableHead className="text-right">平均単価</TableHead>
              <TableHead className="text-right">成長率</TableHead>
              <TableHead className="text-center">アクション</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {courses.map((course) => (
              <TableRow key={course.id}>
                <TableCell className="font-medium">{course.name}</TableCell>
                <TableCell className="text-right">{course.totalBookings.toLocaleString()}件</TableCell>
                <TableCell className="text-right">
                  ¥{course.totalRevenue.toLocaleString()}
                </TableCell>
                <TableCell className="text-right">
                  ¥{course.averagePrice.toLocaleString()}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    {course.growthRate === null ? null : course.growthRate > 0 ? (
                      <TrendingUp className="h-4 w-4 text-green-600" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-600" />
                    )}
                    {course.growthRate === null ? (
                      <span className="text-muted-foreground">-</span>
                    ) : (
                      <span className={course.growthRate > 0 ? 'text-green-600' : 'text-red-600'}>
                        {course.growthRate > 0 ? '+' : ''}
                        {course.growthRate.toFixed(1)}%
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <button
                    onClick={() =>
                      setSelectedCourse(course.id === selectedCourse ? null : course.id)
                    }
                    className="text-sm text-blue-600 hover:underline"
                  >
                    {course.id === selectedCourse ? 'グラフを隠す' : 'グラフを表示'}
                  </button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {selectedCourseData && (
        <div className="rounded-lg border p-4">
          <h3 className="mb-4 text-lg font-semibold">{selectedCourseData.name} - 3ヶ月推移</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={selectedCourseData.monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis yAxisId="left" orientation="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="bookings"
                stroke="#3b82f6"
                strokeWidth={2}
                name="予約数"
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="revenue"
                stroke="#10b981"
                strokeWidth={2}
                name="売上額"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
