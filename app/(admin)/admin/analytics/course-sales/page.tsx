"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Printer, TrendingUp, Package, DollarSign, Users } from 'lucide-react'
import { MonthSelector } from "@/components/analytics/month-selector"
import { CourseSalesChart } from "@/components/analytics/course-sales-chart"
import { CourseSalesTable } from "@/components/analytics/course-sales-table"
import { CourseRankingTable } from "@/components/analytics/course-ranking-table"
import { CourseTrendTable } from "@/components/analytics/course-trend-table"
import { AnalyticsUseCases } from "@/lib/analytics/usecases"
import { AnalyticsRepositoryImpl } from "@/lib/analytics/repository"

const analyticsRepository = new AnalyticsRepositoryImpl()
const analyticsUseCases = new AnalyticsUseCases(analyticsRepository)

export default function CourseSalesPage() {
  const [selectedYear, setSelectedYear] = useState(2024)
  const [selectedMonth, setSelectedMonth] = useState(12)

  const handlePrint = () => {
    window.print()
  }

  // ダミーデータ（実際にはuseCasesから取得）
  const kpiData = {
    totalCourseSales: 6543200,
    previousMonthCourseSales: 6123400,
    courseCount: 15,
    activeCoursesCount: 12,
    topCourseRevenue: 2145600,
    topCourseName: "リラクゼーション90分",
    averagePrice: 8900,
    totalBookings: 735
  }

  const calculateGrowthRate = (current: number, previous: number) => {
    return ((current - previous) / previous * 100).toFixed(1)
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold">コース別売上分析</h1>
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
            <CardTitle className="text-sm font-medium">コース売上高</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">¥{kpiData.totalCourseSales.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-green-600" />
              <span className="text-green-600">
                {calculateGrowthRate(kpiData.totalCourseSales, kpiData.previousMonthCourseSales)}%
              </span>
              前月比
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">販売件数</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpiData.totalBookings.toLocaleString()}件</div>
            <p className="text-xs text-muted-foreground">
              平均単価: ¥{kpiData.averagePrice.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">人気No.1コース</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-bold truncate">{kpiData.topCourseName}</div>
            <p className="text-xs text-muted-foreground">
              売上: ¥{kpiData.topCourseRevenue.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">稼働コース数</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpiData.activeCoursesCount} / {kpiData.courseCount}</div>
            <p className="text-xs text-muted-foreground">
              稼働率: {((kpiData.activeCoursesCount / kpiData.courseCount) * 100).toFixed(0)}%
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 売上構成グラフ */}
      <Card>
        <CardHeader>
          <CardTitle>コース別売上構成</CardTitle>
        </CardHeader>
        <CardContent>
          <CourseSalesChart year={selectedYear} month={selectedMonth} analyticsUseCases={analyticsUseCases} />
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
              <TabsTrigger value="daily">日別売上</TabsTrigger>
              <TabsTrigger value="ranking">ランキング</TabsTrigger>
              <TabsTrigger value="trend">トレンド分析</TabsTrigger>
            </TabsList>
            <TabsContent value="daily" className="mt-4">
              <CourseSalesTable 
                year={selectedYear} 
                month={selectedMonth} 
                analyticsUseCases={analyticsUseCases}
              />
            </TabsContent>
            <TabsContent value="ranking" className="mt-4">
              <CourseRankingTable 
                year={selectedYear} 
                month={selectedMonth} 
                analyticsUseCases={analyticsUseCases}
              />
            </TabsContent>
            <TabsContent value="trend" className="mt-4">
              <CourseTrendTable 
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