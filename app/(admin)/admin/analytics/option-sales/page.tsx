"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Printer, TrendingUp, Package, DollarSign, Sparkles } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { OptionSalesChart } from "@/components/analytics/option-sales-chart"
import { OptionSalesTable } from "@/components/analytics/option-sales-table"
import { OptionCombinationTable } from "@/components/analytics/option-combination-table"
import { OptionTrendChart } from "@/components/analytics/option-trend-chart"
import { AnalyticsUseCases } from "@/lib/analytics/usecases"
import { AnalyticsRepositoryImpl } from "@/lib/analytics/repository"

const analyticsRepository = new AnalyticsRepositoryImpl()
const analyticsUseCases = new AnalyticsUseCases(analyticsRepository)

export default function OptionSalesPage() {
  const [selectedYear, setSelectedYear] = useState(2024)
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i)

  const handlePrint = () => {
    window.print()
  }

  // ダミーデータ（実際にはuseCasesから取得）
  const kpiData = {
    totalOptionSales: 2134500,
    previousYearOptionSales: 1876200,
    optionCount: 12,
    activeOptionsCount: 8,
    topOptionRevenue: 678900,
    topOptionName: "アロマオイル",
    attachRate: 42.5,
    averageOptionPrice: 2800
  }

  const calculateGrowthRate = (current: number, previous: number) => {
    return ((current - previous) / previous * 100).toFixed(1)
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold">オプション別売上分析</h1>
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
            <CardTitle className="text-sm font-medium">オプション売上高</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">¥{kpiData.totalOptionSales.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-green-600" />
              <span className="text-green-600">
                {calculateGrowthRate(kpiData.totalOptionSales, kpiData.previousYearOptionSales)}%
              </span>
              前年比
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">装着率</CardTitle>
            <Sparkles className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpiData.attachRate}%</div>
            <p className="text-xs text-muted-foreground">
              平均単価: ¥{kpiData.averageOptionPrice.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">人気No.1オプション</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-bold truncate">{kpiData.topOptionName}</div>
            <p className="text-xs text-muted-foreground">
              売上: ¥{kpiData.topOptionRevenue.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">稼働オプション数</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpiData.activeOptionsCount} / {kpiData.optionCount}</div>
            <p className="text-xs text-muted-foreground">
              稼働率: {((kpiData.activeOptionsCount / kpiData.optionCount) * 100).toFixed(0)}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 売上構成グラフ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>オプション別売上構成</CardTitle>
          </CardHeader>
          <CardContent>
            <OptionSalesChart year={selectedYear} analyticsUseCases={analyticsUseCases} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>月別推移</CardTitle>
          </CardHeader>
          <CardContent>
            <OptionTrendChart year={selectedYear} analyticsUseCases={analyticsUseCases} />
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
              <TabsTrigger value="monthly">月別売上</TabsTrigger>
              <TabsTrigger value="combination">組み合わせ分析</TabsTrigger>
            </TabsList>
            <TabsContent value="monthly" className="mt-4">
              <OptionSalesTable 
                year={selectedYear} 
                analyticsUseCases={analyticsUseCases}
              />
            </TabsContent>
            <TabsContent value="combination" className="mt-4">
              <OptionCombinationTable 
                year={selectedYear} 
                analyticsUseCases={analyticsUseCases}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}