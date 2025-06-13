"use client"

import { useEffect, useState } from "react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { AnalyticsUseCases } from "@/lib/analytics/usecases"

interface OptionTrendChartProps {
  year: number
  analyticsUseCases: AnalyticsUseCases
}

interface MonthlyData {
  month: string
  sales: number
  attachRate: number
}

export function OptionTrendChart({ year, analyticsUseCases }: OptionTrendChartProps) {
  const [data, setData] = useState<MonthlyData[]>([])

  useEffect(() => {
    // ダミーデータ（実際にはuseCasesから取得）
    const dummyData: MonthlyData[] = [
      { month: "1月", sales: 156700, attachRate: 38.5 },
      { month: "2月", sales: 167800, attachRate: 39.2 },
      { month: "3月", sales: 178900, attachRate: 40.1 },
      { month: "4月", sales: 182300, attachRate: 40.8 },
      { month: "5月", sales: 175600, attachRate: 39.5 },
      { month: "6月", sales: 189200, attachRate: 41.2 },
      { month: "7月", sales: 195600, attachRate: 42.1 },
      { month: "8月", sales: 201200, attachRate: 42.8 },
      { month: "9月", sales: 187600, attachRate: 41.5 },
      { month: "10月", sales: 193400, attachRate: 42.3 },
      { month: "11月", sales: 198700, attachRate: 42.7 },
      { month: "12月", sales: 207500, attachRate: 43.2 }
    ]
    setData(dummyData)
  }, [year, analyticsUseCases])

  const formatYAxis = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}K`
    }
    return value.toString()
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart
        data={data}
        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="month" />
        <YAxis 
          yAxisId="left"
          tickFormatter={formatYAxis}
        />
        <YAxis 
          yAxisId="right"
          orientation="right"
          domain={[35, 45]}
        />
        <Tooltip 
          formatter={(value: number, name: string) => {
            if (name === '売上額') return [`¥${value.toLocaleString()}`, name]
            if (name === '装着率') return [`${value}%`, name]
            return [value, name]
          }}
        />
        <Legend />
        <Line 
          yAxisId="left"
          type="monotone" 
          dataKey="sales" 
          stroke="#10b981" 
          strokeWidth={2}
          name="売上額"
          dot={{ fill: '#10b981', r: 3 }}
        />
        <Line 
          yAxisId="right"
          type="monotone" 
          dataKey="attachRate" 
          stroke="#f59e0b" 
          strokeWidth={2}
          name="装着率"
          strokeDasharray="5 5"
          dot={{ fill: '#f59e0b', r: 3 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}