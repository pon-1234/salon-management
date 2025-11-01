'use client'

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

interface MarketingChannelChartProps {
  data: Array<Record<string, number | string>>
  channels: string[]
}

const COLORS: Record<string, string> = {
  ホットペッパー: '#10b981',
  Instagram: '#3b82f6',
  Google広告: '#f59e0b',
  紹介: '#8b5cf6',
  ウォークイン: '#ef4444',
  その他: '#6b7280',
}

export function MarketingChannelChart({ data, channels }: MarketingChannelChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
        データがありません。
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={350}>
      <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="month" />
        <YAxis />
        <Tooltip />
        <Legend />
        {channels.map((channel) => (
          <Area
            key={channel}
            type="monotone"
            dataKey={channel}
            stackId="1"
            stroke={COLORS[channel] ?? '#6b7280'}
            fill={COLORS[channel] ?? '#6b7280'}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  )
}
