'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Printer, TrendingUp, TrendingDown, Package, DollarSign, Sparkles } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { OptionSalesChart } from '@/components/analytics/option-sales-chart'
import { OptionSalesTable } from '@/components/analytics/option-sales-table'
import { OptionCombinationTable } from '@/components/analytics/option-combination-table'
import { OptionTrendChart } from '@/components/analytics/option-trend-chart'
import { AnalyticsUseCases } from '@/lib/analytics/usecases'
import { AnalyticsRepositoryImpl } from '@/lib/analytics/repository'
import { MonthlyData, OptionCombinationData, OptionSalesData } from '@/lib/types/analytics'
import { useStore } from '@/contexts/store-context'

interface OptionSummary {
  id: string
  name: string
  price: number
  count: number
  revenue: number
}

interface TrendPoint {
  month: string
  revenue: number
  attachRate: number
}

export default function OptionSalesPage() {
  const now = new Date()
  const currentYear = now.getFullYear()
  const [selectedYear, setSelectedYear] = useState(currentYear)
  const [optionData, setOptionData] = useState<OptionSalesData[]>([])
  const [previousOptionData, setPreviousOptionData] = useState<OptionSalesData[]>([])
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([])
  const [combinationData, setCombinationData] = useState<OptionCombinationData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { currentStore } = useStore()

  const analyticsUseCases = useMemo(() => {
    const repository = new AnalyticsRepositoryImpl(currentStore.id)
    return new AnalyticsUseCases(repository)
  }, [currentStore.id])

  const years = useMemo(
    () => Array.from({ length: 5 }, (_, i) => currentYear - 2 + i),
    [currentYear]
  )

  useEffect(() => {
    let isMounted = true
    setIsLoading(true)
    setError(null)

    const fetchData = async () => {
      try {
        const [currentOptions, currentMonthly, combinations] = await Promise.all([
          analyticsUseCases.getOptionSalesReport(selectedYear),
          analyticsUseCases.getMonthlyReport(selectedYear),
          analyticsUseCases.getOptionCombinationReport(selectedYear),
        ])

        let previousOptions: OptionSalesData[] = []
        if (selectedYear > 0) {
          try {
            previousOptions = await analyticsUseCases.getOptionSalesReport(selectedYear - 1)
          } catch (prevError) {
            console.warn('[OptionSalesPage] failed to fetch previous year option analytics', prevError)
          }
        }

        if (!isMounted) return

        setOptionData(currentOptions)
        setMonthlyData(currentMonthly)
        setCombinationData(combinations)
        setPreviousOptionData(previousOptions)
      } catch (err) {
        console.error('[OptionSalesPage] failed to fetch option analytics', err)
        if (!isMounted) return
        setError('オプション別の集計データを取得できませんでした。')
        setOptionData([])
        setMonthlyData([])
        setCombinationData([])
        setPreviousOptionData([])
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

  const optionSummaries = useMemo<OptionSummary[]>(
    () =>
      optionData.map((option) => {
        const count = option.monthlySales.reduce((sum, value) => sum + value, 0)
        return {
          id: option.id,
          name: option.name,
          price: option.price,
          count,
          revenue: count * option.price,
        }
      }),
    [optionData]
  )

  const totalOptionSales = useMemo(
    () => optionSummaries.reduce((sum, option) => sum + option.revenue, 0),
    [optionSummaries]
  )
  const totalOptionCount = useMemo(
    () => optionSummaries.reduce((sum, option) => sum + option.count, 0),
    [optionSummaries]
  )
  const previousYearOptionSales = useMemo(
    () =>
      previousOptionData.reduce(
        (sum, option) =>
          sum + option.price * option.monthlySales.reduce((inner, value) => inner + value, 0),
        0
      ),
    [previousOptionData]
  )

  const optionCount = optionData.length
  const activeOptionsCount = optionSummaries.filter((option) => option.count > 0).length
  const averageOptionPrice = totalOptionCount > 0 ? Math.round(totalOptionSales / totalOptionCount) : 0
  const totalReservations = monthlyData.reduce((sum, month) => sum + month.totalCount, 0)
  const attachRate = totalReservations > 0 ? (totalOptionCount / totalReservations) * 100 : 0
  const attachRateDisplay = Math.round(attachRate * 10) / 10

  const chartData = useMemo(
    () => {
      if (optionSummaries.length === 0) return []
      const totalRevenue = optionSummaries.reduce((sum, option) => sum + option.revenue, 0)
      return optionSummaries
        .filter((option) => option.revenue > 0)
        .sort((a, b) => b.revenue - a.revenue)
        .map((option) => ({
          id: option.id,
          name: option.name,
          revenue: option.revenue,
          count: option.count,
          share: totalRevenue > 0 ? Math.round((option.revenue / totalRevenue) * 1000) / 10 : 0,
        }))
    },
    [optionSummaries]
  )

  const trendData = useMemo<TrendPoint[]>(() => {
    return Array.from({ length: 12 }, (_, index) => {
      const monthNumber = index + 1
      const optionCountForMonth = optionData.reduce(
        (sum, option) => sum + (option.monthlySales[index] ?? 0),
        0
      )
      const revenueForMonth = optionData.reduce(
        (sum, option) => sum + (option.monthlySales[index] ?? 0) * option.price,
        0
      )
      const reservationsForMonth = monthlyData.find((item) => item.month === monthNumber)?.totalCount ?? 0
      const monthlyAttachRate =
        reservationsForMonth > 0 ? (optionCountForMonth / reservationsForMonth) * 100 : 0

      return {
        month: `${monthNumber}月`,
        revenue: revenueForMonth,
        attachRate: Math.round(monthlyAttachRate * 10) / 10,
      }
    })
  }, [monthlyData, optionData])

  const combinationTableData = useMemo(
    () =>
      combinationData
        .slice()
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 20),
    [combinationData]
  )

  const topOption = chartData[0] ?? null
  const topOptionRevenue = topOption?.revenue ?? 0

  const salesGrowth = calculateGrowthRate(totalOptionSales, previousYearOptionSales)
  const haveValues = !isLoading && !error && optionSummaries.length > 0

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold">オプション別売上分析</h1>
          <Select
            value={selectedYear.toString()}
            onValueChange={(value) => setSelectedYear(parseInt(value, 10))}
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

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">オプション売上高</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {haveValues ? `¥${totalOptionSales.toLocaleString()}` : '--'}
            </div>
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              {haveValues ? (
                salesGrowth >= 0 ? (
                  <TrendingUp className="h-3 w-3 text-green-600" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-red-600" />
                )
              ) : null}
              {haveValues ? (
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
            <CardTitle className="text-sm font-medium">装着率</CardTitle>
            <Sparkles className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {haveValues ? `${attachRateDisplay.toFixed(1)}%` : '--'}
            </div>
            <p className="text-xs text-muted-foreground">
              平均単価: {haveValues ? `¥${averageOptionPrice.toLocaleString()}` : '--'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">人気No.1オプション</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="truncate text-sm font-bold">
              {haveValues ? topOption?.name ?? '-' : '--'}
            </div>
            <p className="text-xs text-muted-foreground">
              売上: {haveValues && topOption ? `¥${topOptionRevenue.toLocaleString()}` : '--'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">稼働オプション数</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {haveValues ? `${activeOptionsCount} / ${optionCount}` : '--'}
            </div>
            <p className="text-xs text-muted-foreground">
              稼働率: {haveValues && optionCount > 0
                ? `${Math.round((activeOptionsCount / optionCount) * 100)}%`
                : '--'}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>オプション別売上構成</CardTitle>
          </CardHeader>
          <CardContent>
            <OptionSalesChart data={chartData} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>月別推移</CardTitle>
          </CardHeader>
          <CardContent>
            <OptionTrendChart data={trendData} />
          </CardContent>
        </Card>
      </div>

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
              <OptionSalesTable data={optionData} />
            </TabsContent>
            <TabsContent value="combination" className="mt-4">
              <OptionCombinationTable data={combinationTableData} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}

function calculateGrowthRate(current: number, previous: number): number {
  if (previous === 0) {
    return current === 0 ? 0 : 100
  }
  return ((current - previous) / previous) * 100
}
