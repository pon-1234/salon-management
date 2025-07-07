'use client'

import { useEffect, useState } from 'react'
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { AnalyticsUseCases } from '@/lib/analytics/usecases'

interface CourseSalesChartProps {
  year: number
  month: number
  analyticsUseCases: AnalyticsUseCases
}

interface CourseData {
  name: string
  value: number
  percentage: number
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

export function CourseSalesChart({ year, month, analyticsUseCases }: CourseSalesChartProps) {
  const [data, setData] = useState<CourseData[]>([])

  useEffect(() => {
    // ダミーデータ（実際にはuseCasesから取得）
    const dummyData: CourseData[] = [
      { name: 'リラクゼーション90分', value: 2145600, percentage: 32.8 },
      { name: 'ボディケア60分', value: 1523400, percentage: 23.3 },
      { name: 'フェイシャル45分', value: 987600, percentage: 15.1 },
      { name: 'アロマトリートメント', value: 876500, percentage: 13.4 },
      { name: 'ヘッドスパ30分', value: 543200, percentage: 8.3 },
      { name: 'その他', value: 466900, percentage: 7.1 },
    ]
    setData(dummyData)
  }, [year, month, analyticsUseCases])

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
    return `${entry.percentage}%`
  }

  return (
    <ResponsiveContainer width="100%" height={350}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={renderCustomLabel}
          outerRadius={120}
          fill="#8884d8"
          dataKey="value"
        >
          {data.map((entry, index) => (
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
