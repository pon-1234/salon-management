'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Printer, TrendingUp, TrendingDown, MapPin, DollarSign, Users, Activity } from 'lucide-react'
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
import { AnalyticsUseCases } from '@/lib/analytics/usecases'
import { AnalyticsRepositoryImpl } from '@/lib/analytics/repository'
import { AreaSalesData } from '@/lib/types/area-sales'
import { useStore } from '@/contexts/store-context'

interface KPIData {
  totalSales: number
  previousYearSales: number
  totalCustomers: number
  previousYearCustomers: number
  topArea: string
  topAreaPercentage: number
  averagePerArea: number
  activeAreas: number
  growthLeader: string
  growthLeaderRate: number
}

export default function AreaSalesPage() {
  const now = new Date()
  const currentYear = now.getFullYear()
  const [selectedYear, setSelectedYear] = useState(currentYear)
  const [areaData, setAreaData] = useState<AreaSalesData[]>([])
  const [previousAreaData, setPreviousAreaData] = useState<AreaSalesData[]>([])
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
        const current = await analyticsUseCases.getAreaSalesReport(selectedYear)
        let previous: AreaSalesData[] = []

        if (selectedYear > 0) {
          try {
            previous = await analyticsUseCases.getAreaSalesReport(selectedYear - 1)
          } catch (prevError) {
            console.warn('[AreaSalesPage] failed to fetch previous year area analytics', prevError)
          }
        }

        if (!isMounted) return

        setAreaData(current)
        setPreviousAreaData(previous)
      } catch (err) {
        console.error('[AreaSalesPage] failed to fetch area analytics', err)
        if (!isMounted) return
        setError('エリア別の集計データを取得できませんでした。')
        setAreaData([])
        setPreviousAreaData([])
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

  const totals = useMemo(() => {
    const totalSales = areaData.reduce((sum, area) => sum + area.total, 0)
    const previousYearSales = previousAreaData.reduce((sum, area) => sum + area.total, 0)
    const totalCustomers = areaData.reduce((sum, area) => sum + (area.customerTotal ?? 0), 0)
    const previousYearCustomers = previousAreaData.reduce(
      (sum, area) => sum + (area.customerTotal ?? 0),
      0
    )

    const topArea = areaData.reduce<AreaSalesData | null>((top, area) => {
      if (!top || area.total > top.total) return area
      return top
    }, null)

    const growthLeader = areaData.reduce<{ name: string; rate: number } | null>((leader, area) => {
      const previous = previousAreaData.find((item) => item.area === area.area)
      const previousTotal = previous?.total ?? 0
      const growthRate = previousTotal > 0
        ? ((area.total - previousTotal) / previousTotal) * 100
        : area.total > 0
          ? 100
          : 0

      if (!leader || growthRate > leader.rate) {
        return { name: area.area, rate: growthRate }
      }
      return leader
    }, null)

    return {
      totalSales,
      previousYearSales,
      totalCustomers,
      previousYearCustomers,
      topArea: topArea?.area ?? '-',
      topAreaPercentage:
        topArea && totalSales > 0 ? Math.round((topArea.total / totalSales) * 1000) / 10 : 0,
      averagePerArea: areaData.length > 0 ? Math.round(totalSales / areaData.length) : 0,
      activeAreas: areaData.length,
      growthLeader: growthLeader?.name ?? '-',
      growthLeaderRate: growthLeader ? Math.round(growthLeader.rate * 10) / 10 : 0,
    }
  }, [areaData, previousAreaData])

  const trendAreas = useMemo(() => areaData.slice(0, 6), [areaData])

  const trendData = useMemo(() => {
    const months = Array.from({ length: 12 }, (_, index) => index)
    return months.map((index) => {
      const monthLabel = `${index + 1}月`
      const row: Record<string, number | string> = { month: monthLabel }
      trendAreas.forEach((area) => {
        row[area.area] = area.monthlySales[index] ?? 0
      })
      return row
    })
  }, [trendAreas])

  const kpis: KPIData = totals

  const haveValues = !isLoading && !error && areaData.length > 0

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold">エリア別売上分析</h1>
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
            <CardTitle className="text-sm font-medium">全エリア売上高</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {haveValues ? `¥${kpis.totalSales.toLocaleString()}` : '--'}
            </div>
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              {haveValues ? (
                kpis.previousYearSales > 0 && kpis.totalSales >= kpis.previousYearSales ? (
                  <TrendingUp className="h-3 w-3 text-green-600" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-red-600" />
                )
              ) : null}
              {haveValues && kpis.previousYearSales > 0 ? (
                <span
                  className={
                    kpis.totalSales - kpis.previousYearSales >= 0
                      ? 'text-green-600'
                      : 'text-red-600'
                  }
                >
                  {calculateGrowthRate(kpis.totalSales, kpis.previousYearSales)}%
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
            <CardTitle className="text-sm font-medium">トップエリア</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">{haveValues ? kpis.topArea : '--'}</div>
            <p className="text-xs text-muted-foreground">
              {haveValues ? `全体の${kpis.topAreaPercentage.toFixed(1)}%` : '--'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">成長率トップ</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">{haveValues ? kpis.growthLeader : '--'}</div>
            <p className="text-xs text-muted-foreground">
              {haveValues
                ? `成長率 ${kpis.growthLeaderRate >= 0 ? '+' : ''}${kpis.growthLeaderRate.toFixed(1)}%`
                : '成長率 --'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">平均売上 / エリア</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {haveValues ? `¥${kpis.averagePerArea.toLocaleString()}` : '--'}
            </div>
            <p className="text-xs text-muted-foreground">
              展開エリア: {haveValues ? `${kpis.activeAreas}地域` : '--'}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>エリア別売上構成</CardTitle>
          </CardHeader>
          <CardContent>
            <AreaSalesChart data={areaData} year={selectedYear} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>月別推移</CardTitle>
          </CardHeader>
          <CardContent>
            <AreaTrendChart data={trendAreas} year={selectedYear} />
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
              <TabsTrigger value="monthly">月別推移</TabsTrigger>
              <TabsTrigger value="comparison">エリア比較</TabsTrigger>
            </TabsList>
            <TabsContent value="monthly" className="mt-4">
              <AreaSalesTable data={areaData} />
            </TabsContent>
            <TabsContent value="comparison" className="mt-4">
              <AreaComparisonTable current={areaData} previous={previousAreaData} />
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
  return Math.round(((current - previous) / previous) * 1000) / 10
}
