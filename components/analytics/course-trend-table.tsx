"use client"

import { useEffect, useState } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { AnalyticsUseCases } from "@/lib/analytics/usecases"
import { TrendingUp, TrendingDown } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface CourseTrendTableProps {
  year: number
  month: number
  analyticsUseCases: AnalyticsUseCases
}

interface CourseTrend {
  id: string
  name: string
  monthlyData: {
    month: string
    bookings: number
    revenue: number
  }[]
  totalBookings: number
  totalRevenue: number
  growthRate: number
  averagePrice: number
}

export function CourseTrendTable({ year, month, analyticsUseCases }: CourseTrendTableProps) {
  const [data, setData] = useState<CourseTrend[]>([])
  const [selectedCourse, setSelectedCourse] = useState<string | null>(null)

  useEffect(() => {
    // ダミーデータ（実際にはuseCasesから取得）
    const dummyData: CourseTrend[] = [
      {
        id: "1",
        name: "リラクゼーション90分",
        monthlyData: [
          { month: "10月", bookings: 165, revenue: 1980000 },
          { month: "11月", bookings: 172, revenue: 2064000 },
          { month: "12月", bookings: 178, revenue: 2136000 }
        ],
        totalBookings: 515,
        totalRevenue: 6180000,
        growthRate: 7.8,
        averagePrice: 12000
      },
      {
        id: "2",
        name: "ボディケア60分",
        monthlyData: [
          { month: "10月", bookings: 148, revenue: 1184000 },
          { month: "11月", bookings: 152, revenue: 1216000 },
          { month: "12月", bookings: 156, revenue: 1248000 }
        ],
        totalBookings: 456,
        totalRevenue: 3648000,
        growthRate: 5.4,
        averagePrice: 8000
      },
      {
        id: "3",
        name: "フェイシャル45分",
        monthlyData: [
          { month: "10月", bookings: 142, revenue: 923000 },
          { month: "11月", bookings: 138, revenue: 897000 },
          { month: "12月", bookings: 134, revenue: 871000 }
        ],
        totalBookings: 414,
        totalRevenue: 2691000,
        growthRate: -5.6,
        averagePrice: 6500
      }
    ]
    setData(dummyData)
  }, [year, month, analyticsUseCases])

  const selectedCourseData = data.find(course => course.id === selectedCourse)

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
            {data.map((course) => (
              <TableRow key={course.id}>
                <TableCell className="font-medium">{course.name}</TableCell>
                <TableCell className="text-right">{course.totalBookings}件</TableCell>
                <TableCell className="text-right">
                  ¥{course.totalRevenue.toLocaleString()}
                </TableCell>
                <TableCell className="text-right">
                  ¥{course.averagePrice.toLocaleString()}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    {course.growthRate > 0 ? (
                      <TrendingUp className="h-4 w-4 text-green-600" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-600" />
                    )}
                    <span className={course.growthRate > 0 ? "text-green-600" : "text-red-600"}>
                      {course.growthRate > 0 ? "+" : ""}{course.growthRate}%
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <button
                    onClick={() => setSelectedCourse(course.id === selectedCourse ? null : course.id)}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    {course.id === selectedCourse ? "グラフを隠す" : "グラフを表示"}
                  </button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {selectedCourseData && (
        <div className="rounded-lg border p-4">
          <h3 className="text-lg font-semibold mb-4">{selectedCourseData.name} - 3ヶ月推移</h3>
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