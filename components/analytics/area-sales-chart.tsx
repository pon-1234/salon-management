"use client"

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { AreaSalesData } from "@/lib/types/area-sales"

interface AreaSalesChartProps {
  data: AreaSalesData[]
  year: number
}

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6']

export function AreaSalesChart({ data, year }: AreaSalesChartProps) {
  // エリアごとの年間売上を計算
  const chartData = data.map((area, index) => ({
    name: area.area,
    value: area.total,
    percentage: ((area.total / data.reduce((sum, a) => sum + a.total, 0)) * 100).toFixed(1)
  }))

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-2 border rounded shadow-lg">
          <p className="font-semibold">{payload[0].name}</p>
          <p className="text-sm">売上: ¥{payload[0].value.toLocaleString()}</p>
          <p className="text-sm">構成比: {payload[0].payload.percentage}%</p>
        </div>
      )
    }
    return null
  }

  const renderCustomLabel = (entry: any) => {
    return `${entry.percentage}%`
  }

  return (
    <ResponsiveContainer width="100%" height={350}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={renderCustomLabel}
          outerRadius={120}
          fill="#8884d8"
          dataKey="value"
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend 
          verticalAlign="bottom" 
          height={36}
          formatter={(value: string) => <span style={{ fontSize: 14 }}>{value}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}