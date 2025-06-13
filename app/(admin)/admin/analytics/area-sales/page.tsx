"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Printer, TrendingUp, MapPin, DollarSign, Users, Activity } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { AreaSalesChart } from "@/components/analytics/area-sales-chart"
import { AreaSalesTable } from "@/components/analytics/area-sales-table"
import { AreaComparisonTable } from "@/components/analytics/area-comparison-table"
import { AreaTrendChart } from "@/components/analytics/area-trend-chart"
import { generateAreaSalesData } from "@/lib/area-sales/data"

export default function AreaSalesPage() {
  const [selectedYear, setSelectedYear] = useState(2024)
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i)

  const handlePrint = () => {
    window.print()
  }

  const data = generateAreaSalesData(selectedYear)

  // ダミーデータ（実際にはdataから計算）
  const kpiData = {
    totalSales: 102518400,
    previousYearSales: 94673200,
    totalCustomers: 10704,
    previousYearCustomers: 10123,
    topArea: "東京都",
    topAreaPercentage: 58.5,
    averagePerArea: 25629600,
    activeAreas: 4,
    growthLeader: "神奈川県",
    growthLeaderRate: 18.5
  }

  const calculateGrowthRate = (current: number, previous: number) => {
    return ((current - previous) / previous * 100).toFixed(1)
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
        <Button onClick={handlePrint} className="print:hidden bg-emerald-600 hover:bg-emerald-700 text-white">
          <Printer className="mr-2 h-4 w-4" />
          印刷する
        </Button>
      </div>

      {/* KPIカード */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">全エリア売上高</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">¥{kpiData.totalSales.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
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
            <p className="text-xs text-muted-foreground">
              全体の{kpiData.topAreaPercentage}%
            </p>
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
            <p className="text-xs text-muted-foreground">
              展開エリア: {kpiData.activeAreas}都県
            </p>
          </CardContent>
        </Card>
      </div>

      {/* エリア別売上構成グラフ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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