"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Printer, TrendingUp, TrendingDown, Users, CreditCard, DollarSign, Calendar } from 'lucide-react'
import { AnalyticsUseCases } from "@/lib/analytics/usecases"
import { AnalyticsRepositoryImpl } from "@/lib/analytics/repository"
import { MonthSelector } from "@/components/analytics/month-selector"
import { MonthlySalesChart } from "@/components/analytics/monthly-sales-chart"
import { MonthlySalesTable } from "@/components/analytics/monthly-sales-table"
import { MonthlyStaffTable } from "@/components/analytics/monthly-staff-table"
import { MonthlyAreaTable } from "@/components/analytics/monthly-area-table"

const analyticsRepository = new AnalyticsRepositoryImpl()
const analyticsUseCases = new AnalyticsUseCases(analyticsRepository)

export default function MonthlyReportPage() {
  const [selectedYear, setSelectedYear] = useState(2024)
  const [selectedMonth, setSelectedMonth] = useState(12)

  const handlePrint = () => {
    window.print()
  }

  // ダミーデータ（実際にはuseCasesから取得）
  const kpiData = {
    totalSales: 8543200,
    previousMonthSales: 7892300,
    customerCount: 892,
    previousMonthCustomers: 843,
    averageSpending: 9581,
    previousAverageSpending: 9366,
    cardSalesRatio: 68.5,
    previousCardSalesRatio: 65.2
  }

  const calculateGrowthRate = (current: number, previous: number) => {
    return ((current - previous) / previous * 100).toFixed(1)
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold">月次売上分析</h1>
          <MonthSelector
            year={selectedYear}
            month={selectedMonth}
            onYearChange={setSelectedYear}
            onMonthChange={setSelectedMonth}
          />
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
            <CardTitle className="text-sm font-medium">月間売上高</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">¥{kpiData.totalSales.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              {parseFloat(calculateGrowthRate(kpiData.totalSales, kpiData.previousMonthSales)) > 0 ? (
                <TrendingUp className="h-3 w-3 text-green-600" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-600" />
              )}
              <span className={parseFloat(calculateGrowthRate(kpiData.totalSales, kpiData.previousMonthSales)) > 0 ? "text-green-600" : "text-red-600"}>
                {calculateGrowthRate(kpiData.totalSales, kpiData.previousMonthSales)}%
              </span>
              前月比
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">来客数</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpiData.customerCount.toLocaleString()}人</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              {parseFloat(calculateGrowthRate(kpiData.customerCount, kpiData.previousMonthCustomers)) > 0 ? (
                <TrendingUp className="h-3 w-3 text-green-600" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-600" />
              )}
              <span className={parseFloat(calculateGrowthRate(kpiData.customerCount, kpiData.previousMonthCustomers)) > 0 ? "text-green-600" : "text-red-600"}>
                {calculateGrowthRate(kpiData.customerCount, kpiData.previousMonthCustomers)}%
              </span>
              前月比
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">客単価</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">¥{kpiData.averageSpending.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              {parseFloat(calculateGrowthRate(kpiData.averageSpending, kpiData.previousAverageSpending)) > 0 ? (
                <TrendingUp className="h-3 w-3 text-green-600" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-600" />
              )}
              <span className={parseFloat(calculateGrowthRate(kpiData.averageSpending, kpiData.previousAverageSpending)) > 0 ? "text-green-600" : "text-red-600"}>
                {calculateGrowthRate(kpiData.averageSpending, kpiData.previousAverageSpending)}%
              </span>
              前月比
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">カード決済率</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpiData.cardSalesRatio}%</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              {kpiData.cardSalesRatio > kpiData.previousCardSalesRatio ? (
                <TrendingUp className="h-3 w-3 text-green-600" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-600" />
              )}
              <span className={kpiData.cardSalesRatio > kpiData.previousCardSalesRatio ? "text-green-600" : "text-red-600"}>
                {(kpiData.cardSalesRatio - kpiData.previousCardSalesRatio).toFixed(1)}pt
              </span>
              前月比
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 売上推移グラフ */}
      <Card>
        <CardHeader>
          <CardTitle>日別売上推移</CardTitle>
        </CardHeader>
        <CardContent>
          <MonthlySalesChart year={selectedYear} month={selectedMonth} analyticsUseCases={analyticsUseCases} />
        </CardContent>
      </Card>

      {/* 詳細データテーブル */}
      <Card>
        <CardHeader>
          <CardTitle>詳細データ</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="sales" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="sales">売上明細</TabsTrigger>
              <TabsTrigger value="staff">スタッフ別</TabsTrigger>
              <TabsTrigger value="area">エリア別</TabsTrigger>
            </TabsList>
            <TabsContent value="sales" className="mt-4">
              <MonthlySalesTable 
                year={selectedYear} 
                month={selectedMonth} 
                analyticsUseCases={analyticsUseCases}
              />
            </TabsContent>
            <TabsContent value="staff" className="mt-4">
              <MonthlyStaffTable 
                year={selectedYear} 
                month={selectedMonth} 
                analyticsUseCases={analyticsUseCases}
              />
            </TabsContent>
            <TabsContent value="area" className="mt-4">
              <MonthlyAreaTable 
                year={selectedYear} 
                month={selectedMonth} 
                analyticsUseCases={analyticsUseCases}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}