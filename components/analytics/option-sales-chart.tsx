"use client"

import { useEffect, useState } from "react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { AnalyticsUseCases } from "@/lib/analytics/usecases"

interface OptionSalesChartProps {
  year: number
  analyticsUseCases: AnalyticsUseCases
}

interface OptionData {
  name: string
  sales: number
  count: number
}

export function OptionSalesChart({ year, analyticsUseCases }: OptionSalesChartProps) {
  const [data, setData] = useState<OptionData[]>([])

  useEffect(() => {
    // ダミーデータ（実際にはuseCasesから取得）
    const dummyData: OptionData[] = [
      { name: "アロマオイル", sales: 678900, count: 234 },
      { name: "ホットストーン", sales: 456700, count: 98 },
      { name: "ヘッドマッサージ", sales: 345600, count: 156 },
      { name: "フットケア", sales: 234500, count: 87 },
      { name: "ハンドケア", sales: 198700, count: 112 },
      { name: "その他", sales: 220100, count: 78 }
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
      <BarChart
        data={data}
        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
        <YAxis tickFormatter={formatYAxis} />
        <Tooltip 
          formatter={(value: number, name: string) => {
            if (name === '売上額') return [`¥${value.toLocaleString()}`, name]
            return [value, name]
          }}
        />
        <Legend />
        <Bar dataKey="sales" name="売上額" fill="#10b981" />
      </BarChart>
    </ResponsiveContainer>
  )
}