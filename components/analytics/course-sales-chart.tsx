'use client'

import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface CourseData {
  name: string
  value: number
  percentage: number
}

interface CourseSalesChartProps {
  data: {
    id: string
    name: string
    revenue: number
    share: number
  }[]
}

const COLORS = [
  '#10b981',
  '#3b82f6',
  '#f59e0b',
  '#ef4444',
  '#8b5cf6',
  '#ec4899',
  '#06b6d4',
  '#84cc16',
]

export function CourseSalesChart({ data }: CourseSalesChartProps) {
  const chartData = data.map((course) => ({
    name: course.name,
    value: course.revenue,
    percentage: course.share,
  }))

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded border bg-white p-2 shadow-lg">
          <p className="font-semibold">{payload[0].name}</p>
          <p className="text-sm">売上: ¥{payload[0].value.toLocaleString()}</p>
          <p className="text-sm">構成比: {payload[0].payload.percentage}%</p>
        </div>
      )
    }
    return null
  }

  const renderCustomLabel = (entry: CourseData) => {
    return `${entry.percentage.toFixed(1)}%`
  }

  if (chartData.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
        データがありません。
      </div>
    )
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
          formatter={(value: string) => <span style={{ fontSize: 12 }}>{value}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}
