"use client"

import { useEffect, useState } from "react"
import { Line, LineChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface StaffAttendanceChartProps {
  year: number
  month: number
}

interface ChartData {
  date: number
  出勤数: number
  予定数: number
  欠勤数: number
}

export function StaffAttendanceChart({ year, month }: StaffAttendanceChartProps) {
  const [data, setData] = useState<ChartData[]>([])

  useEffect(() => {
    // ダミーデータ（実際にはAPIから取得）
    const daysInMonth = new Date(year, month, 0).getDate()
    const dummyData: ChartData[] = Array.from({ length: daysInMonth }, (_, i) => ({
      date: i + 1,
      出勤数: Math.floor(Math.random() * 4) + 6,
      予定数: Math.floor(Math.random() * 2) + 8,
      欠勤数: Math.random() > 0.8 ? 1 : 0
    }))
    setData(dummyData)
  }, [year, month])

  return (
    <ResponsiveContainer width="100%" height={350}>
      <LineChart
        data={data}
        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis 
          dataKey="date" 
          label={{ value: '日', position: 'insideBottomRight', offset: -10 }}
        />
        <YAxis 
          label={{ value: '人数', angle: -90, position: 'insideLeft' }}
        />
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