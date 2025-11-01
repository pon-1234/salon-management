'use client'

import {
  Line,
  LineChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { StaffAttendanceSummary } from '@/lib/types/staff-attendance'
import { getDaysInMonth } from 'date-fns'

interface StaffAttendanceChartProps {
  year: number
  month: number
  data: StaffAttendanceSummary[]
}

export function StaffAttendanceChart({ year, month, data }: StaffAttendanceChartProps) {
  const daysInMonth = getDaysInMonth(new Date(year, month - 1, 1))
  const totalStaff = data.length

  if (totalStaff === 0) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
        表示できるデータがありません。
      </div>
    )
  }

  const chartData = Array.from({ length: daysInMonth }, (_, index) => {
    const attendanceCount = data.reduce(
      (sum, staff) => sum + (staff.attendance[index] ?? 0),
      0
    )
    const absenceCount = Math.max(totalStaff - attendanceCount, 0)
    return {
      date: index + 1,
      出勤数: attendanceCount,
      予定数: totalStaff,
      欠勤数: absenceCount,
    }
  })

  return (
    <ResponsiveContainer width="100%" height={350}>
      <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" label={{ value: '日', position: 'insideBottomRight', offset: -10 }} />
        <YAxis label={{ value: '人数', angle: -90, position: 'insideLeft' }} />
        <Tooltip />
        <Legend />
        <Line
          type="monotone"
          dataKey="出勤数"
          stroke="#10b981"
          strokeWidth={2}
          dot={{ fill: '#10b981', r: 3 }}
        />
        <Line
          type="monotone"
          dataKey="予定数"
          stroke="#3b82f6"
          strokeWidth={2}
          strokeDasharray="5 5"
          dot={{ fill: '#3b82f6', r: 3 }}
        />
        <Line
          type="monotone"
          dataKey="欠勤数"
          stroke="#ef4444"
          strokeWidth={2}
          dot={{ fill: '#ef4444', r: 3 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
