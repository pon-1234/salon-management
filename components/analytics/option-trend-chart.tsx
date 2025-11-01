'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

interface OptionTrendChartProps {
  data: {
    month: string
    revenue: number
    attachRate: number
  }[]
}

export function OptionTrendChart({ data }: OptionTrendChartProps) {
  const formatYAxis = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}K`
    }
    return value.toString()
  }

  const attachRateMax = data.reduce((max, point) => Math.max(max, point.attachRate), 0)
  const attachRateDomain = Math.max(100, Math.ceil(attachRateMax / 5) * 5)

  if (data.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
        データがありません。
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="month" />
        <YAxis yAxisId="left" tickFormatter={formatYAxis} />
        <YAxis yAxisId="right" orientation="right" domain={[0, attachRateDomain]} />
        <Tooltip
          formatter={(value: number, name: string) => {
            if (name === '売上額') return [`¥${value.toLocaleString()}`, name]
            if (name === '装着率') return [`${value.toFixed(1)}%`, name]
            return [value, name]
          }}
        />
        <Legend />
        <Line
          yAxisId="left"
          type="monotone"
          dataKey="revenue"
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
