'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Printer, TrendingUp, TrendingDown, MapPin, DollarSign, Users } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DistrictSalesChart } from '@/components/analytics/district-sales-chart'
import { DistrictSalesTable } from '@/components/analytics/district-sales-table'
import { DistrictHeatmapTable } from '@/components/analytics/district-heatmap-table'
import { DistrictPerformanceTable } from '@/components/analytics/district-performance-table'
import { AnalyticsUseCases } from '@/lib/analytics/usecases'
import { AnalyticsRepositoryImpl } from '@/lib/analytics/repository'
import { AreaSalesData } from '@/lib/types/area-sales'
import { DistrictSalesReport } from '@/lib/types/district-sales'
import { useStore } from '@/contexts/store-context'

interface KPIData {
  totalSales: number
  previousYearSales: number
  totalCustomers: number
  previousYearCustomers: number
  topDistrict: string
  topDistrictPercentage: number
  averageSpending: number
  activeDistricts: number
}

type AreaOption = {
  label: string
  value: string
}

export default function DistrictSalesPage() {
  const now = new Date()
  const currentYear = now.getFullYear()
  const [selectedYear, setSelectedYear] = useState(currentYear)
  const [areaOptions, setAreaOptions] = useState<AreaOption[]>([])
  const [selectedArea, setSelectedArea] = useState<string>('')
  const [districtReport, setDistrictReport] = useState<DistrictSalesReport | null>(null)
  const [previousDistrictReport, setPreviousDistrictReport] = useState<DistrictSalesReport | null>(
    null
  )
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

    const loadAreas = async () => {
      try {
        const areas: AreaSalesData[] = await analyticsUseCases.getAreaSalesReport(selectedYear)
        if (!isMounted) return
        const options = areas.map<AreaOption>((area) => ({
          label: area.area,
          value: area.prefecture ?? area.area,
        }))
        setAreaOptions(options)
        setSelectedArea((prev) =>
          prev && options.some((option) => option.value === prev) ? prev : options[0]?.value ?? ''
        )
      } catch (err) {
        console.error('[DistrictSalesPage] failed to fetch area list', err)
        if (!isMounted) return
        setAreaOptions([])
        setSelectedArea('')
        setError('エリア一覧の取得に失敗しました。')
      }
    }

    loadAreas()

    return () => {
      isMounted = false
    }
  }, [analyticsUseCases, selectedYear])

  useEffect(() => {
    if (!selectedArea) {
      setDistrictReport(null)
      setPreviousDistrictReport(null)
      return
    }

    let isMounted = true
    setIsLoading(true)
    setError(null)

    const fetchDistricts = async () => {
      try {
        const current = await analyticsUseCases.getDistrictSalesReport(selectedYear, selectedArea)
        let previous: DistrictSalesReport | null = null
        if (selectedYear > 0) {
          try {
            previous = await analyticsUseCases.getDistrictSalesReport(selectedYear - 1, selectedArea)
          } catch (prevError) {
            console.warn('[DistrictSalesPage] failed to fetch previous district analytics', prevError)
          }
        }

        if (!isMounted) return
        setDistrictReport(current)
        setPreviousDistrictReport(previous)
      } catch (err) {
        console.error('[DistrictSalesPage] failed to fetch district analytics', err)
        if (!isMounted) return
        setDistrictReport(null)
        setPreviousDistrictReport(null)
        setError('地区別の集計データを取得できませんでした。')
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    fetchDistricts()

    return () => {
      isMounted = false
    }
  }, [analyticsUseCases, selectedArea, selectedYear])

  const kpis: KPIData = useMemo(() => {
    if (!districtReport) {
      return {
        totalSales: 0,
        previousYearSales: 0,
        totalCustomers: 0,
        previousYearCustomers: 0,
        topDistrict: '-',
        topDistrictPercentage: 0,
        averageSpending: 0,
        activeDistricts: 0,
      }
    }

    const previous = previousDistrictReport
    const totalSales = districtReport.total.total
    const previousYearSales = previous?.total.total ?? 0
    const totalCustomers = districtReport.total.customerTotal ?? 0
    const previousYearCustomers = previous?.total.customerTotal ?? 0

    const topDistrict = districtReport.districts.reduce((top, district) => {
      if (!top || district.total > top.total) return district
      return top
    }, districtReport.districts[0])

    return {
      totalSales,
      previousYearSales,
      totalCustomers,
      previousYearCustomers,
      topDistrict: topDistrict?.district ?? '-',
      topDistrictPercentage:
        topDistrict && totalSales > 0 ? Math.round((topDistrict.total / totalSales) * 1000) / 10 : 0,
      averageSpending: totalCustomers > 0 ? Math.round(totalSales / totalCustomers) : 0,
      activeDistricts: districtReport.districts.length,
    }
  }, [districtReport, previousDistrictReport])

  const chartDistricts = districtReport?.districts ?? []
  const heatmapDistricts = districtReport?.districts ?? []
  const performanceCurrent = districtReport?.districts ?? []
  const performancePrevious = previousDistrictReport?.districts ?? []
  const selectedAreaLabel =
    areaOptions.find((option) => option.value === selectedArea)?.label ?? selectedArea
  const haveValues =
    !isLoading && !error && Boolean(districtReport && districtReport.districts.length > 0)

  const handlePrint = () => {
    window.print()
  }

  const renderGrowthRate = (currentValue: number, previousValue: number) => {
    if (previousValue === 0) {
      return currentValue === 0 ? '0.0' : '100.0'
    }
    return (((currentValue - previousValue) / previousValue) * 100).toFixed(1)
  }

  const totalGrowth = renderGrowthRate(kpis.totalSales, kpis.previousYearSales)
  const customerGrowth = renderGrowthRate(kpis.totalCustomers, kpis.previousYearCustomers)
  const topDistrictShare = kpis.topDistrictPercentage.toFixed(1)

  const growthLeader = useMemo(() => {
    if (!districtReport) return { name: '-', rate: 0 }
    return districtReport.districts.reduce((leader, district) => {
      const previous = performancePrevious.find((item) => item.district === district.district)
      const previousTotal = previous?.total ?? 0
      const growthRate = previousTotal > 0
        ? ((district.total - previousTotal) / previousTotal) * 100
        : district.total > 0
          ? 100
          : 0
      if (!leader || growthRate > leader.rate) {
        return { name: district.district, rate: growthRate }
      }
      return leader
    }, null as { name: string; rate: number } | null) ?? { name: '-', rate: 0 }
  }, [districtReport, performancePrevious])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold">地区別売上分析</h1>
          <div className="flex gap-2">
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
            <Select value={selectedArea} onValueChange={setSelectedArea}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="エリアを選択" />
              </SelectTrigger>
              <SelectContent>
                {areaOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
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
            <CardTitle className="text-sm font-medium">エリア売上高</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {haveValues ? `¥${kpis.totalSales.toLocaleString()}` : '--'}
            </div>
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              {haveValues ? (
                Number(totalGrowth) >= 0 ? (
                  <TrendingUp className="h-3 w-3 text-green-600" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-red-600" />
                )
              ) : null}
              {haveValues ? (
                <span className={Number(totalGrowth) >= 0 ? 'text-green-600' : 'text-red-600'}>
                  {Number(totalGrowth) >= 0 ? '+' : ''}
                  {totalGrowth}%
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
            <CardTitle className="text-sm font-medium">エリア来客数</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {haveValues ? `${kpis.totalCustomers.toLocaleString()}人` : '--'}
            </div>
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              {haveValues ? (
                Number(customerGrowth) >= 0 ? (
                  <TrendingUp className="h-3 w-3 text-green-600" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-red-600" />
                )
              ) : null}
              {haveValues ? (
                <span className={Number(customerGrowth) >= 0 ? 'text-green-600' : 'text-red-600'}>
                  {Number(customerGrowth) >= 0 ? '+' : ''}
                  {customerGrowth}%
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
            <CardTitle className="text-sm font-medium">トップ地区</CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">{haveValues ? kpis.topDistrict : '--'}</div>
            <p className="text-xs text-muted-foreground">
              {haveValues ? `全体の${topDistrictShare}%` : '--'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">平均客単価</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {haveValues ? `¥${kpis.averageSpending.toLocaleString()}` : '--'}
            </div>
            <p className="text-xs text-muted-foreground">
              稼働地区: {haveValues ? `${kpis.activeDistricts}地区` : '--'}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>地区別売上構成</CardTitle>
        </CardHeader>
        <CardContent>
          <DistrictSalesChart area={selectedAreaLabel} year={selectedYear} data={chartDistricts} />
        </CardContent>
      </Card>

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
              {districtReport ? <DistrictSalesTable data={districtReport} /> : null}
            </TabsContent>
            <TabsContent value="heatmap" className="mt-4">
              <DistrictHeatmapTable data={heatmapDistricts} />
            </TabsContent>
            <TabsContent value="performance" className="mt-4">
              <DistrictPerformanceTable current={performanceCurrent} previous={performancePrevious} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
