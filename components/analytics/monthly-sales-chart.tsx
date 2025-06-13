"use client"

import { useEffect, useState } from "react"
import { Line, LineChart, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { AnalyticsUseCases } from "@/lib/analytics/usecases"
import { DailyData } from "@/lib/types/analytics"

interface MonthlySalesChartProps {
  year: number
  month: number
  analyticsUseCases: AnalyticsUseCases
}

export function MonthlySalesChart({ year, month, analyticsUseCases }: MonthlySalesChartProps) {
  const [data, setData] = useState<DailyData[]>([])

  useEffect(() => {
    const fetchData = async () => {
      const result = await analyticsUseCases.getDailyReport(year, month)
      setData(result)
    }
    fetchData()
  }, [year, month, analyticsUseCases])

  const chartData = data.map(item => ({
    date: parseInt(item.date),
    売上高: item.totalSales,
    来客数: item.customerCount * 1000, // スケール調整のため1000倍
    客単価: item.totalSales / item.customerCount || 0,
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
      <LineChart
        data={chartData}
        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis 
          dataKey="date" 
          label={{ value: '日', position: 'insideBottomRight', offset: -10 }}
        />
        <YAxis 
          yAxisId="left"
          tickFormatter={formatYAxis}
          label={{ value: '売上高 (円)', angle: -90, position: 'insideLeft' }}
        />
        <YAxis 
          yAxisId="right"
          orientation="right"
          label={{ value: '客単価 (円)', angle: 90, position: 'insideRight' }}
        />
        <Tooltip 
          formatter={(value: number, name: string) => {
            if (name === '売上高') return [`¥${value.toLocaleString()}`, name]
            if (name === '来客数') return [`${(value / 1000).toFixed(0)}人`, name]
            if (name === '客単価') return [`¥${Math.round(value).toLocaleString()}`, name]
            return [value, name]
          }}
        />
        <Legend />
        <Line 
          yAxisId="left"
          type="monotone" 
          dataKey="売上高" 
          stroke="#10b981" 
          strokeWidth={2}
          dot={{ fill: '#10b981', r: 3 }}
          activeDot={{ r: 5 }}
        />
        <Line 
          yAxisId="left"
          type="monotone" 
          dataKey="来客数" 
          stroke="#3b82f6" 
          strokeWidth={2}
          dot={{ fill: '#3b82f6', r: 3 }}
          activeDot={{ r: 5 }}
        />
        <Line 
          yAxisId="right"
          type="monotone" 
          dataKey="客単価" 
          stroke="#f59e0b" 
          strokeWidth={2}
          strokeDasharray="5 5"
          dot={{ fill: '#f59e0b', r: 3 }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}