"use client"

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { DistrictSalesData } from "@/lib/types/district-sales"

interface DistrictSalesChartProps {
  area: string
  year: number
  data: DistrictSalesData[]
}

export function DistrictSalesChart({ area, year, data }: DistrictSalesChartProps) {
  // 地区ごとの合計を計算
  const districtTotals = data && Array.isArray(data) && data.length > 0 
    ? data.reduce((acc, item) => {
        if (item.monthlySales && Array.isArray(item.monthlySales)) {
          const total = item.monthlySales.reduce((sum, sales) => sum + sales, 0)
          acc[item.district] = total
        }
        return acc
      }, {} as Record<string, number>)
    : {}

  // グラフ用データに変換
  const chartData = Object.entries(districtTotals)
    .map(([district, total]) => ({
      district,
      売上高: total,
    }))
    .sort((a, b) => b.売上高 - a.売上高)
    .slice(0, 10) // トップ10地区のみ表示

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
      <BarChart
        data={chartData}
        margin={{ top: 5, right: 30, left: 20, bottom: 60 }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis 
          dataKey="district" 
          angle={-45} 
          textAnchor="end" 
          height={100}
        />
        <YAxis tickFormatter={formatYAxis} />
        <Tooltip 
          formatter={(value: number) => [`¥${value.toLocaleString()}`, '売上高']}
        />
        <Legend />
        <Bar dataKey="売上高" fill="#10b981" />
      </BarChart>
    </ResponsiveContainer>
  )
}