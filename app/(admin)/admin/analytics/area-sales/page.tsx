'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Printer, TrendingUp, MapPin, DollarSign, Users, Activity } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { AreaSalesChart } from '@/components/analytics/area-sales-chart'
import { AreaSalesTable } from '@/components/analytics/area-sales-table'
import { AreaComparisonTable } from '@/components/analytics/area-comparison-table'
import { AreaTrendChart } from '@/components/analytics/area-trend-chart'
import { generateAreaSalesData } from '@/lib/area-sales/data'

export default function AreaSalesPage() {
  const [selectedYear, setSelectedYear] = useState(2024)
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i)

  const handlePrint = () => {
    window.print()
  }

  const data = generateAreaSalesData(selectedYear)

  // Calculate KPI data from actual data
  const totalSales =
    data && Array.isArray(data) && data.length > 0
      ? data.reduce((sum, area) => sum + area.total, 0)
      : 0

  const topArea =
    data && Array.isArray(data) && data.length > 0
      ? data.reduce((max, area) => (area.total > max.total ? area : max), data[0])
      : null

  const kpiData = {
    totalSales: totalSales,
    previousYearSales: Math.floor(totalSales * 0.92), // Simulated previous year
    totalCustomers: 10704,
    previousYearCustomers: 10123,
    topArea: topArea?.area || '---',
    topAreaPercentage:
      topArea && totalSales > 0 ? ((topArea.total / totalSales) * 100).toFixed(1) : '0',
    averagePerArea: data && data.length > 0 ? Math.floor(totalSales / data.length) : 0,
    activeAreas: data ? data.length : 0,
    growthLeader: '神奈川県',
    growthLeaderRate: 18.5,
  }

  const calculateGrowthRate = (current: number, previous: number) => {
    if (previous === 0) return '0.0'
    return (((current - previous) / previous) * 100).toFixed(1)
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold">エリア別売上分析</h1>
          <Select
            value={selectedYear.toString()}
            onValueChange={(value) => setSelectedYear(parseInt(value))}
          >
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}年
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
            <CardTitle className="text-sm font-medium">全エリア売上高</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">¥{kpiData.totalSales.toLocaleString()}</div>
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3 text-green-600" />
              <span className="text-green-600">
                {calculateGrowthRate(kpiData.totalSales, kpiData.previousYearSales)}%
              </span>
              前年比
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">トップエリア</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">{kpiData.topArea}</div>
            <p className="text-xs text-muted-foreground">全体の{kpiData.topAreaPercentage}%</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">成長率トップ</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">{kpiData.growthLeader}</div>
            <p className="text-xs text-muted-foreground">
              成長率 <span className="text-green-600">+{kpiData.growthLeaderRate}%</span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">エリア平均売上</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">¥{kpiData.averagePerArea.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">展開エリア: {kpiData.activeAreas}都県</p>
          </CardContent>
        </Card>
      </div>

      {/* エリア別売上構成グラフ */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>エリア別売上構成</CardTitle>
          </CardHeader>
          <CardContent>
            <AreaSalesChart data={data} year={selectedYear} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>月別推移</CardTitle>
          </CardHeader>
          <CardContent>
            <AreaTrendChart data={data} year={selectedYear} />
          </CardContent>
        </Card>
      </div>

      {/* 詳細データテーブル */}
      <Card>
        <CardHeader>
          <CardTitle>詳細データ</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="monthly" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="monthly">月別推移</TabsTrigger>
              <TabsTrigger value="comparison">エリア比較</TabsTrigger>
            </TabsList>
            <TabsContent value="monthly" className="mt-4">
              <AreaSalesTable data={data} />
            </TabsContent>
            <TabsContent value="comparison" className="mt-4">
              <AreaComparisonTable data={data} year={selectedYear} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
