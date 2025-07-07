'use client'

import { HourlySalesReport } from '@/lib/types/hourly-sales'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface PeakTimeAnalysisProps {
  data: HourlySalesReport
}

export function PeakTimeAnalysis({ data }: PeakTimeAnalysisProps) {
  // 時間帯別の分析データを作成
  const hourlyAnalysis = data.hourlyTotals.map((total, index) => {
    const hour = index + 7
    const percentage = ((total / data.grandTotal) * 100).toFixed(1)
    return {
      hour: `${hour}:00-${hour + 1}:00`,
      total,
      percentage: parseFloat(percentage),
      rank: 0, // 後で設定
    }
  })

  // ランキングを設定
  const sorted = [...hourlyAnalysis].sort((a, b) => b.total - a.total)
  sorted.forEach((item, index) => {
    const original = hourlyAnalysis.find((h) => h.hour === item.hour)
    if (original) original.rank = index + 1
  })

  // トップ5の時間帯
  const top5Hours = sorted.slice(0, 5)

  // 時間帯区分別の集計
  const periodAnalysis = [
    {
      period: '朝（7:00-11:00）',
      hours: hourlyAnalysis.slice(0, 4),
      color: '#fbbf24',
    },
    {
      period: '昼（11:00-15:00）',
      hours: hourlyAnalysis.slice(4, 8),
      color: '#60a5fa',
    },
    {
      period: '夕方（15:00-19:00）',
      hours: hourlyAnalysis.slice(8, 12),
      color: '#f97316',
    },
    {
      period: '夜（19:00-28:00）',
      hours: hourlyAnalysis.slice(12),
      color: '#8b5cf6',
    },
  ]

  const periodData = periodAnalysis.map((p) => ({
    period: p.period,
    total: p.hours.reduce((sum, h) => sum + h.total, 0),
    percentage: ((p.hours.reduce((sum, h) => sum + h.total, 0) / data.grandTotal) * 100).toFixed(1),
    color: p.color,
  }))

  const getRankBadge = (rank: number) => {
    if (rank === 1) return <Badge className="bg-yellow-500">1位</Badge>
    if (rank === 2) return <Badge className="bg-gray-400">2位</Badge>
    if (rank === 3) return <Badge className="bg-orange-600">3位</Badge>
    if (rank <= 5) return <Badge variant="secondary">{rank}位</Badge>
    return null
  }

  return (
    <div className="space-y-6">
      {/* 時間帯別グラフ */}
      <div>
        <h3 className="mb-4 text-lg font-semibold">時間帯別来客数分布</h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={periodData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="period" />
            <YAxis />
            <Tooltip formatter={(value: number) => [`${value}人`, '来客数']} />
            <Bar dataKey="total" fill="#10b981" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ピーク時間帯ランキング */}
      <div>
        <h3 className="mb-4 text-lg font-semibold">ピーク時間帯TOP5</h3>
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]">順位</TableHead>
                <TableHead>時間帯</TableHead>
                <TableHead className="text-right">来客数</TableHead>
                <TableHead className="text-right">構成比</TableHead>
                <TableHead className="text-center">推奨スタッフ数</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {top5Hours.map((hour) => (
                <TableRow key={hour.hour}>
                  <TableCell>{getRankBadge(hour.rank)}</TableCell>
                  <TableCell className="font-medium">{hour.hour}</TableCell>
                  <TableCell className="text-right">{hour.total}人</TableCell>
                  <TableCell className="text-right">{hour.percentage}%</TableCell>
                  <TableCell className="text-center">
                    <Badge variant="outline">{Math.ceil(hour.total / 30)}人以上</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* 時間帯区分別分析 */}
      <div>
        <h3 className="mb-4 text-lg font-semibold">時間帯区分別分析</h3>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {periodData.map((period) => (
            <div
              key={period.period}
              className="rounded-lg border p-4 text-center"
              style={{ borderColor: period.color }}
            >
              <h4 className="mb-2 font-medium">{period.period}</h4>
              <div className="mb-1 text-2xl font-bold">{period.total}人</div>
              <div className="text-sm text-gray-600">{period.percentage}%</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
