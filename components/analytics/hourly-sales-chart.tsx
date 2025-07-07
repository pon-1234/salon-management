'use client'

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { HourlySalesReport } from '@/lib/types/hourly-sales'

interface HourlySalesChartProps {
  data: HourlySalesReport
}

export function HourlySalesChart({ data }: HourlySalesChartProps) {
  // 時間別の合計データをグラフ用に変換
  const chartData = data.hourlyTotals.map((total, index) => ({
    hour: `${index + 7}時`,
    来客数: total,
  }))

  return (
    <ResponsiveContainer width="100%" height={350}>
      <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="hour" />
        <YAxis />
        <Tooltip />
        <Area type="monotone" dataKey="来客数" stroke="#10b981" fill="#10b981" fillOpacity={0.6} />
      </AreaChart>
    </ResponsiveContainer>
  )
}
