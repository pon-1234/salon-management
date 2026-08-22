/**
 * @design_doc   docs/PREVIEW_UAT_CHECKLIST.md daily report is the canonical day view
 * @related_to   DailyReportPageClient embeds these charts from the former daily-sales screen
 * @known_issues Chart sizing still depends on Recharts ResponsiveContainer in jsdom
 */
'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { BarChart3 } from 'lucide-react'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatYen } from '@/lib/shared'

export function DailySalesCharts({
  hourlyData,
  weeklyData,
}: {
  hourlyData: Array<{ hour: string; sales: number }>
  weeklyData: Array<{ day: string; sales: number }>
}) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>時間別売上推移</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={hourlyData}>
              <defs>
                <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="hour" className="text-xs" tick={{ fill: '#6b7280' }} />
              <YAxis
                className="text-xs"
                tick={{ fill: '#6b7280' }}
                tickFormatter={(value) => `¥${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip
                formatter={(value: number | string) => [formatYen(Number(value)), '売上']}
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                }}
              />
              <Area
                type="monotone"
                dataKey="sales"
                stroke="#10b981"
                fillOpacity={1}
                fill="url(#colorSales)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            週間売上比較
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="day" className="text-xs" tick={{ fill: '#6b7280' }} />
              <YAxis
                className="text-xs"
                tick={{ fill: '#6b7280' }}
                tickFormatter={(value) => `¥${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip
                formatter={(value: number | string) => [formatYen(Number(value)), '売上']}
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                }}
              />
              <Bar dataKey="sales" fill="#3b82f6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  )
}
