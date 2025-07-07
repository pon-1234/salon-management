'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Printer, Clock, Users, TrendingUp, Activity } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { HourlySalesChart } from '@/components/analytics/hourly-sales-chart'
import { HourlySalesTable } from '@/components/analytics/hourly-sales-table'
import { HourlyHeatmap } from '@/components/analytics/hourly-heatmap'
import { PeakTimeAnalysis } from '@/components/analytics/peak-time-analysis'
import { generateHourlySalesData } from '@/lib/hourly-sales/data'

export default function HourlySalesPage() {
  const [year, setYear] = useState(2024)
  const [month, setMonth] = useState(12)
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i)
  const months = Array.from({ length: 12 }, (_, i) => i + 1)

  const salesData = generateHourlySalesData(year, month)

  const handlePrint = () => {
    window.print()
  }

  // ダミーデータ（実際にはsalesDataから計算）
  const kpiData = {
    peakHour: '19:00-20:00',
    peakCustomers: 245,
    averagePerHour: 28,
    busyHours: 8,
    totalCustomers: salesData.grandTotal,
    previousMonthTotal: 9876,
    efficiency: 78.5,
    previousEfficiency: 72.3,
  }

  const calculateGrowthRate = (current: number, previous: number) => {
    return (((current - previous) / previous) * 100).toFixed(1)
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold">時間別売上分析</h1>
          <div className="flex gap-2">
            <Select value={year.toString()} onValueChange={(value) => setYear(parseInt(value))}>
              <SelectTrigger className="w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem key={y} value={y.toString()}>
                    {y}年
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={month.toString()} onValueChange={(value) => setMonth(parseInt(value))}>
              <SelectTrigger className="w-[80px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {months.map((m) => (
                  <SelectItem key={m} value={m.toString()}>
                    {m}月
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button
          onClick={handlePrint}
          className="bg-emerald-600 text-white hover:bg-emerald-700 print:hidden"
        >
          <Printer className="mr-2 h-4 w-4" />
          印刷する
        </Button>
      </div>

      {/* KPIカード */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">ピーク時間帯</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpiData.peakHour}</div>
            <p className="text-xs text-muted-foreground">最大{kpiData.peakCustomers}人</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">月間来客数</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpiData.totalCustomers.toLocaleString()}人</div>
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3 text-green-600" />
              <span className="text-green-600">
                {calculateGrowthRate(kpiData.totalCustomers, kpiData.previousMonthTotal)}%
              </span>
              前月比
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">時間平均</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpiData.averagePerHour}人/時</div>
            <p className="text-xs text-muted-foreground">混雑時間: {kpiData.busyHours}時間</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">稼働効率</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpiData.efficiency}%</div>
            <p className="text-xs text-muted-foreground">
              前月比 +{(kpiData.efficiency - kpiData.previousEfficiency).toFixed(1)}pt
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 時間別推移グラフ */}
      <Card>
        <CardHeader>
          <CardTitle>時間別来客数推移</CardTitle>
        </CardHeader>
        <CardContent>
          <HourlySalesChart data={salesData} />
        </CardContent>
      </Card>

      {/* 詳細データテーブル */}
      <Card>
        <CardHeader>
          <CardTitle>詳細データ</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="daily" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="daily">日別明細</TabsTrigger>
              <TabsTrigger value="heatmap">ヒートマップ</TabsTrigger>
              <TabsTrigger value="peak">ピーク分析</TabsTrigger>
            </TabsList>
            <TabsContent value="daily" className="mt-4">
              <HourlySalesTable data={salesData} />
            </TabsContent>
            <TabsContent value="heatmap" className="mt-4">
              <HourlyHeatmap data={salesData} />
            </TabsContent>
            <TabsContent value="peak" className="mt-4">
              <PeakTimeAnalysis data={salesData} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
