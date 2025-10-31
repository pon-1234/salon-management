'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import {
  Printer,
  TrendingUp,
  TrendingDown,
  Users,
  CreditCard,
  DollarSign,
  Calendar,
} from 'lucide-react'
import { AnalyticsUseCases } from '@/lib/analytics/usecases'
import { AnalyticsRepositoryImpl } from '@/lib/analytics/repository'
import { MonthSelector } from '@/components/analytics/month-selector'
import { MonthlySalesChart } from '@/components/analytics/monthly-sales-chart'
import { MonthlySalesTable } from '@/components/analytics/monthly-sales-table'
import { MonthlyStaffTable } from '@/components/analytics/monthly-staff-table'
import { MonthlyAreaTable } from '@/components/analytics/monthly-area-table'
import { MonthlyData } from '@/lib/types/analytics'

const analyticsRepository = new AnalyticsRepositoryImpl()
const analyticsUseCases = new AnalyticsUseCases(analyticsRepository)

export default function MonthlyReportPage() {
  const now = new Date()
  const [selectedYear, setSelectedYear] = useState(now.getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1)
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([])
  const [isMonthlyLoading, setIsMonthlyLoading] = useState(true)
  const [monthlyError, setMonthlyError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true
    setIsMonthlyLoading(true)
    analyticsUseCases
      .getMonthlyReport(selectedYear)
      .then((data) => {
        if (!isMounted) return
        setMonthlyData(data)
        setMonthlyError(null)
      })
      .catch((err) => {
        console.error('[MonthlyReportPage] failed to fetch monthly analytics', err)
        if (!isMounted) return
        setMonthlyError('月次データの取得に失敗しました。')
        setMonthlyData([])
      })
      .finally(() => {
        if (isMounted) {
          setIsMonthlyLoading(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [selectedYear, analyticsUseCases])

  const currentMonthData = useMemo(
    () => monthlyData.find((item) => item.month === selectedMonth),
    [monthlyData, selectedMonth]
  )

  const previousMonthData = useMemo(() => {
    if (selectedMonth > 1) {
      return monthlyData.find((item) => item.month === selectedMonth - 1)
    }
    return null
  }, [monthlyData, selectedMonth])

  const totalSales = currentMonthData?.totalSales ?? 0
  const previousSales = previousMonthData?.totalSales ?? 0
  const customerCount = currentMonthData?.totalCount ?? 0
  const previousCustomerCount = previousMonthData?.totalCount ?? 0
  const averageSpending =
    customerCount > 0 ? Math.round(totalSales / customerCount) : 0
  const previousAverageSpending =
    previousCustomerCount > 0
      ? Math.round(previousSales / previousCustomerCount)
      : 0
  const cardSalesRatio =
    totalSales > 0 ? ((currentMonthData?.cardSales ?? 0) / totalSales) * 100 : 0
  const previousCardSalesRatio =
    previousSales > 0
      ? ((previousMonthData?.cardSales ?? 0) / previousSales) * 100
      : 0

  const calculateGrowthRate = (current: number, previous: number) => {
    if (previous === 0) {
      return current === 0 ? 0 : 100
    }
    return ((current - previous) / previous) * 100
  }

  const salesGrowth = calculateGrowthRate(totalSales, previousSales)
  const customerGrowth = calculateGrowthRate(customerCount, previousCustomerCount)
  const averageSpendingGrowth = calculateGrowthRate(
    averageSpending,
    previousAverageSpending
  )
  const cardRatioDiff = cardSalesRatio - previousCardSalesRatio
  const hasMonthlyValues = !isMonthlyLoading && monthlyError === null

  const handlePrint = () => {
    window.print()
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
            <CardTitle className="text-sm font-medium">月間売上高</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {hasMonthlyValues ? `¥${totalSales.toLocaleString()}` : '--'}
            </div>
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              {hasMonthlyValues ? (
                <>
                  {salesGrowth >= 0 ? (
                    <TrendingUp className="h-3 w-3 text-green-600" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-red-600" />
                  )}
                  <span className={salesGrowth >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {`${salesGrowth >= 0 ? '+' : ''}${salesGrowth.toFixed(1)}%`}
                  </span>
                  前月比
                </>
              ) : (
                <span className="text-muted-foreground">-</span>
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">来客数</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {hasMonthlyValues ? `${customerCount.toLocaleString()}人` : '--'}
            </div>
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              {hasMonthlyValues ? (
                <>
                  {customerGrowth >= 0 ? (
                    <TrendingUp className="h-3 w-3 text-green-600" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-red-600" />
                  )}
                  <span className={customerGrowth >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {`${customerGrowth >= 0 ? '+' : ''}${customerGrowth.toFixed(1)}%`}
                  </span>
                  前月比
                </>
              ) : (
                <span className="text-muted-foreground">-</span>
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">客単価</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {hasMonthlyValues ? `¥${averageSpending.toLocaleString()}` : '--'}
            </div>
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              {hasMonthlyValues ? (
                <>
                  {averageSpendingGrowth >= 0 ? (
                    <TrendingUp className="h-3 w-3 text-green-600" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-red-600" />
                  )}
                  <span
                    className={
                      averageSpendingGrowth >= 0 ? 'text-green-600' : 'text-red-600'
                    }
                  >
                    {`${averageSpendingGrowth >= 0 ? '+' : ''}${averageSpendingGrowth.toFixed(
                      1
                    )}%`}
                  </span>
                  前月比
                </>
              ) : (
                <span className="text-muted-foreground">-</span>
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">カード決済率</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {hasMonthlyValues ? `${cardSalesRatio.toFixed(1)}%` : '--'}
            </div>
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              {hasMonthlyValues ? (
                <>
                  {cardRatioDiff >= 0 ? (
                    <TrendingUp className="h-3 w-3 text-green-600" />
                  ) : (
                    <TrendingDown className="h-3 w-3 text-red-600" />
                  )}
                  <span className={cardRatioDiff >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {`${cardRatioDiff >= 0 ? '+' : ''}${cardRatioDiff.toFixed(1)}pt`}
                  </span>
                  前月比
                </>
              ) : (
                <span className="text-muted-foreground">-</span>
              )}
            </p>
          </CardContent>
        </Card>
      </div>

      {monthlyError && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {monthlyError}
        </div>
      )}

      {/* 売上推移グラフ */}
      <Card>
        <CardHeader>
          <CardTitle>日別売上推移</CardTitle>
        </CardHeader>
        <CardContent>
          <MonthlySalesChart
            year={selectedYear}
            month={selectedMonth}
            analyticsUseCases={analyticsUseCases}
          />
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
