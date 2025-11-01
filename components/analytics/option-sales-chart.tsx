'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  TooltipProps,
} from 'recharts'

interface OptionSalesChartProps {
  data: {
    id: string
    name: string
    revenue: number
    count: number
    share: number
  }[]
}

export function OptionSalesChart({ data }: OptionSalesChartProps) {
  const chartData = data.map((option) => ({
    name: option.name,
    revenue: option.revenue,
    count: option.count,
    share: option.share,
  }))

  const renderTooltip = ({ active, payload }: TooltipProps<number, string>) => {
    if (!active || !payload || payload.length === 0) {
      return null
    }

    const point = payload[0].payload as { name: string; revenue: number; count: number; share: number }

    return (
      <div className="rounded border bg-white p-2 text-sm shadow-lg">
        <p className="font-semibold">{point.name}</p>
        <p>売上: ¥{point.revenue.toLocaleString()}</p>
        <p>販売数: {point.count.toLocaleString()}件</p>
        <p>構成比: {point.share.toFixed(1)}%</p>
      </div>
    )
  }

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
      <BarChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
        <YAxis tickFormatter={formatYAxis} />
        <Tooltip content={renderTooltip} />
        <Legend />
        <Bar dataKey="revenue" name="売上額" fill="#10b981" />
      </BarChart>
    </ResponsiveContainer>
  )
}
