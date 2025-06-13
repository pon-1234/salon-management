"use client"

import { useEffect, useState } from "react"
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { AnalyticsUseCases } from "@/lib/analytics/usecases"

interface MarketingChannelChartProps {
  year: number
  analyticsUseCases: AnalyticsUseCases
}

interface ChartData {
  month: string
  ホットペッパー: number
  Instagram: number
  Google広告: number
  紹介: number
  ウォークイン: number
  その他: number
}

const COLORS = {
  ホットペッパー: '#10b981',
  Instagram: '#3b82f6',
  Google広告: '#f59e0b',
  紹介: '#8b5cf6',
  ウォークイン: '#ef4444',
  その他: '#6b7280'
}

export function MarketingChannelChart({ year, analyticsUseCases }: MarketingChannelChartProps) {
  const [data, setData] = useState<ChartData[]>([])

  useEffect(() => {
    // ダミーデータ（実際にはuseCasesから取得）
    const dummyData: ChartData[] = [
      { month: "1月", ホットペッパー: 312, Instagram: 156, Google広告: 98, 紹介: 87, ウォークイン: 65, その他: 45 },
      { month: "2月", ホットペッパー: 328, Instagram: 168, Google広告: 102, 紹介: 92, ウォークイン: 68, その他: 48 },
      { month: "3月", ホットペッパー: 345, Instagram: 178, Google広告: 112, 紹介: 98, ウォークイン: 72, その他: 52 },
      { month: "4月", ホットペッパー: 356, Instagram: 189, Google広告: 118, 紹介: 102, ウォークイン: 75, その他: 55 },
      { month: "5月", ホットペッパー: 342, Instagram: 195, Google広告: 125, 紹介: 108, ウォークイン: 78, その他: 58 },
      { month: "6月", ホットペッパー: 368, Instagram: 203, Google広告: 132, 紹介: 115, ウォークイン: 82, その他: 62 },
      { month: "7月", ホットペッパー: 378, Instagram: 215, Google広告: 138, 紹介: 122, ウォークイン: 85, その他: 65 },
      { month: "8月", ホットペッパー: 392, Instagram: 223, Google広告: 145, 紹介: 128, ウォークイン: 88, その他: 68 },
      { month: "9月", ホットペッパー: 385, Instagram: 218, Google広告: 142, 紹介: 125, ウォークイン: 86, その他: 66 },
      { month: "10月", ホットペッパー: 398, Instagram: 228, Google広告: 148, 紹介: 132, ウォークイン: 90, その他: 70 },
      { month: "11月", ホットペッパー: 405, Instagram: 235, Google広告: 152, 紹介: 138, ウォークイン: 92, その他: 72 },
      { month: "12月", ホットペッパー: 412, Instagram: 242, Google広告: 158, 紹介: 145, ウォークイン: 95, その他: 75 }
    ]
    setData(dummyData)
  }, [year, analyticsUseCases])

  return (
    <ResponsiveContainer width="100%" height={350}>
      <AreaChart
        data={data}
        margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="month" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Area type="monotone" dataKey="ホットペッパー" stackId="1" stroke={COLORS.ホットペッパー} fill={COLORS.ホットペッパー} />
        <Area type="monotone" dataKey="Instagram" stackId="1" stroke={COLORS.Instagram} fill={COLORS.Instagram} />
        <Area type="monotone" dataKey="Google広告" stackId="1" stroke={COLORS.Google広告} fill={COLORS.Google広告} />
        <Area type="monotone" dataKey="紹介" stackId="1" stroke={COLORS.紹介} fill={COLORS.紹介} />
        <Area type="monotone" dataKey="ウォークイン" stackId="1" stroke={COLORS.ウォークイン} fill={COLORS.ウォークイン} />
        <Area type="monotone" dataKey="その他" stackId="1" stroke={COLORS.その他} fill={COLORS.その他} />
      </AreaChart>
    </ResponsiveContainer>
  )
}