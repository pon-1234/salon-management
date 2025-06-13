"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Printer, TrendingUp, MapPin, DollarSign, Users } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { DistrictSalesChart } from "@/components/analytics/district-sales-chart"
import { DistrictSalesTable } from "@/components/analytics/district-sales-table"
import { DistrictHeatmapTable } from "@/components/analytics/district-heatmap-table"
import { DistrictPerformanceTable } from "@/components/analytics/district-performance-table"
import { generateDistrictSalesData } from "@/lib/district-sales/data"

export default function DistrictSalesPage() {
  const [selectedYear, setSelectedYear] = useState(2024)
  const [selectedArea, setSelectedArea] = useState("東京都")
  
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i)
  const areas = ["東京都", "神奈川県", "埼玉県", "千葉県"]

  const handlePrint = () => {
    window.print()
  }

  const data = generateDistrictSalesData(selectedYear, selectedArea)

  // ダミーデータ（実際にはuseCasesから取得）
  const kpiData = {
    totalSales: 48567800,
    previousYearSales: 43234500,
    totalCustomers: 5234,
    previousYearCustomers: 4867,
    topDistrict: selectedArea === "東京都" ? "渋谷区" : "横浜市",
    topDistrictPercentage: 28.5,
    averageSpending: 9284,
    activeDistricts: 15
  }

  const calculateGrowthRate = (current: number, previous: number) => {
    return ((current - previous) / previous * 100).toFixed(1)
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold">地区別売上分析</h1>
          <div className="flex gap-2">
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
            <Select
              value={selectedArea}
              onValueChange={setSelectedArea}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {areas.map((area) => (
                  <SelectItem key={area} value={area}>
                    {area}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
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
            <CardTitle className="text-sm font-medium">エリア売上高</CardTitle>
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
            <CardTitle className="text-sm font-medium">エリア来客数</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpiData.totalCustomers.toLocaleString()}人</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-green-600" />
              <span className="text-green-600">
                {calculateGrowthRate(kpiData.totalCustomers, kpiData.previousYearCustomers)}%
              </span>
              前年比
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">トップ地区</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">{kpiData.topDistrict}</div>
            <p className="text-xs text-muted-foreground">
              エリア全体の{kpiData.topDistrictPercentage}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">平均客単価</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">¥{kpiData.averageSpending.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              稼働地区: {kpiData.activeDistricts}区
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 地区別売上グラフ */}
      <Card>
        <CardHeader>
          <CardTitle>地区別売上構成</CardTitle>
        </CardHeader>
        <CardContent>
          <DistrictSalesChart area={selectedArea} year={selectedYear} data={data} />
        </CardContent>
      </Card>

      {/* 詳細データテーブル */}
      <Card>
        <CardHeader>
          <CardTitle>詳細データ</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="monthly" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="monthly">月別推移</TabsTrigger>
              <TabsTrigger value="heatmap">ヒートマップ</TabsTrigger>
              <TabsTrigger value="performance">パフォーマンス</TabsTrigger>
            </TabsList>
            <TabsContent value="monthly" className="mt-4">
              <DistrictSalesTable data={data} />
            </TabsContent>
            <TabsContent value="heatmap" className="mt-4">
              <DistrictHeatmapTable area={selectedArea} year={selectedYear} />
            </TabsContent>
            <TabsContent value="performance" className="mt-4">
              <DistrictPerformanceTable area={selectedArea} year={selectedYear} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}