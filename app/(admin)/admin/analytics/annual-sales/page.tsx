'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Printer, TrendingUp, TrendingDown, Users, Store, DollarSign, Calendar } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { AnalyticsUseCases } from '@/lib/analytics/usecases'
import { AnalyticsRepositoryImpl } from '@/lib/analytics/repository'
import { AnnualSalesChart } from '@/components/analytics/annual-sales-chart'
import { AnnualSalesTable } from '@/components/analytics/annual-sales-table'
import { AnnualQuarterTable } from '@/components/analytics/annual-quarter-table'
import { AnnualStoreTable } from '@/components/analytics/annual-store-table'

const analyticsRepository = new AnalyticsRepositoryImpl()
const analyticsUseCases = new AnalyticsUseCases(analyticsRepository)

export default function AnnualReportPage() {
  const [selectedYear, setSelectedYear] = useState(2024)
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i)

  const handlePrint = () => {
    window.print()
  }

  // ダミーデータ（実際にはuseCasesから取得）
  const kpiData = {
    totalSales: 102518400,
    previousYearSales: 94673200,
    customerCount: 10704,
    previousYearCustomers: 10123,
    storeCount: 3,
    newStoreCount: 1,
    averageMonthly: 8543200,
    previousAverageMonthly: 7889433,
  }

  const calculateGrowthRate = (current: number, previous: number) => {
    return (((current - previous) / previous) * 100).toFixed(1)
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold">年次売上分析</h1>
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
            <CardTitle className="text-sm font-medium">年間売上高</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">¥{kpiData.totalSales.toLocaleString()}</div>
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              {parseFloat(calculateGrowthRate(kpiData.totalSales, kpiData.previousYearSales)) >
              0 ? (
                <TrendingUp className="h-3 w-3 text-green-600" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-600" />
              )}
              <span
                className={
                  parseFloat(calculateGrowthRate(kpiData.totalSales, kpiData.previousYearSales)) > 0
                    ? 'text-green-600'
                    : 'text-red-600'
                }
              >
                {calculateGrowthRate(kpiData.totalSales, kpiData.previousYearSales)}%
              </span>
              前年比
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">年間来客数</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpiData.customerCount.toLocaleString()}人</div>
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              {parseFloat(
                calculateGrowthRate(kpiData.customerCount, kpiData.previousYearCustomers)
              ) > 0 ? (
                <TrendingUp className="h-3 w-3 text-green-600" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-600" />
              )}
              <span
                className={
                  parseFloat(
                    calculateGrowthRate(kpiData.customerCount, kpiData.previousYearCustomers)
                  ) > 0
                    ? 'text-green-600'
                    : 'text-red-600'
                }
              >
                {calculateGrowthRate(kpiData.customerCount, kpiData.previousYearCustomers)}%
              </span>
              前年比
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">月平均売上</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">¥{kpiData.averageMonthly.toLocaleString()}</div>
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              {parseFloat(
                calculateGrowthRate(kpiData.averageMonthly, kpiData.previousAverageMonthly)
              ) > 0 ? (
                <TrendingUp className="h-3 w-3 text-green-600" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-600" />
              )}
              <span
                className={
                  parseFloat(
                    calculateGrowthRate(kpiData.averageMonthly, kpiData.previousAverageMonthly)
                  ) > 0
                    ? 'text-green-600'
                    : 'text-red-600'
                }
              >
                {calculateGrowthRate(kpiData.averageMonthly, kpiData.previousAverageMonthly)}%
              </span>
              前年比
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">店舗数</CardTitle>
            <Store className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpiData.storeCount}店舗</div>
            <p className="text-xs text-muted-foreground">
              {kpiData.newStoreCount > 0 && (
                <span className="text-green-600">+{kpiData.newStoreCount}店舗（新規）</span>
              )}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 売上推移グラフ */}
      <Card>
        <CardHeader>
          <CardTitle>月別売上推移</CardTitle>
        </CardHeader>
        <CardContent>
          <AnnualSalesChart year={selectedYear} analyticsUseCases={analyticsUseCases} />
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
              <TabsTrigger value="quarter">四半期別</TabsTrigger>
              <TabsTrigger value="store">店舗別</TabsTrigger>
            </TabsList>
            <TabsContent value="monthly" className="mt-4">
              <AnnualSalesTable year={selectedYear} analyticsUseCases={analyticsUseCases} />
            </TabsContent>
            <TabsContent value="quarter" className="mt-4">
              <AnnualQuarterTable year={selectedYear} analyticsUseCases={analyticsUseCases} />
            </TabsContent>
            <TabsContent value="store" className="mt-4">
              <AnnualStoreTable year={selectedYear} analyticsUseCases={analyticsUseCases} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
