'use client'

import { useEffect, useMemo, useState } from 'react'
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
import { MonthlyData } from '@/lib/types/analytics'
import { useStore } from '@/contexts/store-context'

export default function AnnualReportPage() {
  const currentYear = new Date().getFullYear()
  const [selectedYear, setSelectedYear] = useState(currentYear)
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([])
  const [previousMonthlyData, setPreviousMonthlyData] = useState<MonthlyData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { currentStore, availableStores } = useStore()
  const analyticsUseCases = useMemo(() => {
    const repository = new AnalyticsRepositoryImpl(currentStore.id)
    return new AnalyticsUseCases(repository)
  }, [currentStore.id])

  useEffect(() => {
    let isMounted = true
    setIsLoading(true)
    setError(null)

    const fetchData = async () => {
      try {
        const current = await analyticsUseCases.getMonthlyReport(selectedYear)
        let previous: MonthlyData[] = []

        if (selectedYear > 0) {
          try {
            previous = await analyticsUseCases.getMonthlyReport(selectedYear - 1)
          } catch (prevError) {
            console.warn('[AnnualReportPage] failed to fetch previous year analytics', prevError)
          }
        }

        if (!isMounted) return
        setMonthlyData(current)
        setPreviousMonthlyData(previous)
        setError(null)
      } catch (err) {
        console.error('[AnnualReportPage] failed to fetch annual analytics', err)
        if (!isMounted) return
        setMonthlyData([])
        setPreviousMonthlyData([])
        setError('年次データの取得に失敗しました。')
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    fetchData()

    return () => {
      isMounted = false
    }
  }, [analyticsUseCases, selectedYear])

  const years = useMemo(
    () => Array.from({ length: 5 }, (_, i) => currentYear - 2 + i),
    [currentYear]
  )

  const handlePrint = () => {
    window.print()
  }

  const totalSales = monthlyData.reduce((sum, item) => sum + item.totalSales, 0)
  const previousYearSales = previousMonthlyData.reduce((sum, item) => sum + item.totalSales, 0)
  const customerCount = monthlyData.reduce((sum, item) => sum + item.totalCount, 0)
  const previousYearCustomers = previousMonthlyData.reduce(
    (sum, item) => sum + item.totalCount,
    0
  )
  const averageMonthly =
    monthlyData.length > 0 ? Math.round(totalSales / monthlyData.length) : 0
  const previousAverageMonthly =
    previousMonthlyData.length > 0 ? Math.round(previousYearSales / previousMonthlyData.length) : 0
  const storeCount = availableStores.length
  const newStoreCount = availableStores.filter((store) => {
    const createdAt =
      store.createdAt instanceof Date ? store.createdAt : new Date(store.createdAt)
    return createdAt.getFullYear() === selectedYear
  }).length

  const calculateGrowthRate = (current: number, previous: number) => {
    if (previous === 0) {
      return current === 0 ? 0 : 100
    }
    return ((current - previous) / previous) * 100
  }

  const salesGrowth = calculateGrowthRate(totalSales, previousYearSales)
  const customerGrowth = calculateGrowthRate(customerCount, previousYearCustomers)
  const averageMonthlyGrowth = calculateGrowthRate(averageMonthly, previousAverageMonthly)
  const hasKpiValues = !isLoading && !error && monthlyData.length > 0

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

      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {isLoading && (
        <div className="rounded-md border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
          データを読み込み中です...
        </div>
      )}

      {/* KPIカード */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">年間売上高</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {hasKpiValues ? `¥${totalSales.toLocaleString()}` : '--'}
            </div>
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              {hasKpiValues ? (
                salesGrowth >= 0 ? (
                  <TrendingUp className="h-3 w-3 text-green-600" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-red-600" />
                )
              ) : null}
              {hasKpiValues ? (
                <span className={salesGrowth >= 0 ? 'text-green-600' : 'text-red-600'}>
                  {`${salesGrowth >= 0 ? '+' : ''}${salesGrowth.toFixed(1)}%`}
                </span>
              ) : (
                <span className="text-muted-foreground">-</span>
              )}
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
            <div className="text-2xl font-bold">
              {hasKpiValues ? `${customerCount.toLocaleString()}人` : '--'}
            </div>
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              {hasKpiValues ? (
                customerGrowth >= 0 ? (
                  <TrendingUp className="h-3 w-3 text-green-600" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-red-600" />
                )
              ) : null}
              {hasKpiValues ? (
                <span className={customerGrowth >= 0 ? 'text-green-600' : 'text-red-600'}>
                  {`${customerGrowth >= 0 ? '+' : ''}${customerGrowth.toFixed(1)}%`}
                </span>
              ) : (
                <span className="text-muted-foreground">-</span>
              )}
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
            <div className="text-2xl font-bold">
              {hasKpiValues ? `¥${averageMonthly.toLocaleString()}` : '--'}
            </div>
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              {hasKpiValues ? (
                averageMonthlyGrowth >= 0 ? (
                  <TrendingUp className="h-3 w-3 text-green-600" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-red-600" />
                )
              ) : null}
              {hasKpiValues ? (
                <span className={averageMonthlyGrowth >= 0 ? 'text-green-600' : 'text-red-600'}>
                  {`${averageMonthlyGrowth >= 0 ? '+' : ''}${averageMonthlyGrowth.toFixed(1)}%`}
                </span>
              ) : (
                <span className="text-muted-foreground">-</span>
              )}
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
            <div className="text-2xl font-bold">{storeCount}店舗</div>
            <p className="text-xs text-muted-foreground">
              {newStoreCount > 0 ? (
                <span className="text-green-600">+{newStoreCount}店舗（新規）</span>
              ) : (
                '新規店舗なし'
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
          <AnnualSalesChart data={monthlyData} previousData={previousMonthlyData} />
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
              <AnnualSalesTable data={monthlyData} previousData={previousMonthlyData} />
            </TabsContent>
            <TabsContent value="quarter" className="mt-4">
              <AnnualQuarterTable data={monthlyData} previousData={previousMonthlyData} />
            </TabsContent>
            <TabsContent value="store" className="mt-4">
              <AnnualStoreTable
                data={monthlyData}
                previousData={previousMonthlyData}
                storeName={currentStore.displayName ?? currentStore.name}
                storeAddress={currentStore.address}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
