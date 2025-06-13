"use client"

import { useEffect, useState } from "react"
import { Bar, BarChart, Line, ComposedChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { AnalyticsUseCases } from "@/lib/analytics/usecases"
import { MonthlyData } from "@/lib/types/analytics"

interface AnnualSalesChartProps {
  year: number
  analyticsUseCases: AnalyticsUseCases
}

export function AnnualSalesChart({ year, analyticsUseCases }: AnnualSalesChartProps) {
  const [data, setData] = useState<MonthlyData[]>([])

  useEffect(() => {
    const fetchData = async () => {
      const result = await analyticsUseCases.getMonthlyReport(year)
      setData(result)
    }
    fetchData()
  }, [year, analyticsUseCases])

  const chartData = data.map(item => ({
    month: `${item.month}月`,
    売上高: item.totalSales,
    来客数: item.totalCount,
    前年比: item.previousYearRatio * 100,
  }))

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
      <ComposedChart
        data={chartData}
        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="month" />
        <YAxis 
          yAxisId="left"
          tickFormatter={formatYAxis}
          label={{ value: '売上高 (円)', angle: -90, position: 'insideLeft' }}
        />
        <YAxis 
          yAxisId="right"
          orientation="right"
          label={{ value: '前年比 (%)', angle: 90, position: 'insideRight' }}
          domain={[80, 120]}
        />
        <Tooltip 
          formatter={(value: number, name: string) => {
            if (name === '売上高') return [`¥${value.toLocaleString()}`, name]
            if (name === '来客数') return [`${value.toLocaleString()}人`, name]
            if (name === '前年比') return [`${value.toFixed(1)}%`, name]
            return [value, name]
          }}
        />
        <Legend />
        <Bar 
          yAxisId="left"
          dataKey="売上高" 
          fill="#10b981" 
        />
        <Line 
          yAxisId="right"
          type="monotone" 
          dataKey="前年比" 
          stroke="#f59e0b"
          strokeWidth={2}
          dot={{ fill: '#f59e0b', r: 4 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  )
}