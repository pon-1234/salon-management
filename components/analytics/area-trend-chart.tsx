"use client"

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { AreaSalesData } from "@/lib/types/area-sales"

interface AreaTrendChartProps {
  data: AreaSalesData[]
  year: number
}

export function AreaTrendChart({ data, year }: AreaTrendChartProps) {
  // 月別データを変換
  const months = ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"]
  
  const chartData = months.map((month, index) => {
    const monthData: any = { month }
    data.forEach(area => {
      monthData[area.area] = area.monthlySales[index]
    })
    return monthData
  })

  const colors = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6']

  const formatYAxis = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}K`
    }
    return value.toString()
  }

  return (
    <ResponsiveContainer width="100%" height={350}>
      <LineChart
        data={chartData}
        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="month" />
        <YAxis tickFormatter={formatYAxis} />
        <Tooltip 
          formatter={(value: number) => `¥${value.toLocaleString()}`}
        />
        <Legend />
        {data.map((area, index) => (
          <Line
            key={area.area}
            type="monotone"
            dataKey={area.area}
            stroke={colors[index % colors.length]}
            strokeWidth={2}
            dot={{ r: 3 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  )
}