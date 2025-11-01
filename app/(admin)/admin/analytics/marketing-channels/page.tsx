'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Printer, TrendingUp, TrendingDown, Megaphone, DollarSign, Target, BarChart3 } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { MarketingChannelChart } from '@/components/analytics/marketing-channel-chart'
import { MarketingChannelTable } from '@/components/analytics/marketing-channel-table'
import { MarketingROITable, MarketingROIRow } from '@/components/analytics/marketing-roi-table'
import {
  MarketingConversionTable,
  MarketingConversionRow,
} from '@/components/analytics/marketing-conversion-table'
import { AnalyticsUseCases } from '@/lib/analytics/usecases'
import { AnalyticsRepositoryImpl } from '@/lib/analytics/repository'
import { MarketingChannelData } from '@/lib/types/analytics'
import { useStore } from '@/contexts/store-context'

interface KPIData {
  totalCustomers: number
  previousYearCustomers: number
  topChannel: string
  topChannelPercentage: number
  averageCAC: number
  previousCAC: number
  conversionRate: number
  previousConversionRate: number
}

export default function MarketingChannelsPage() {
  const now = new Date()
  const currentYear = now.getFullYear()
  const [selectedYear, setSelectedYear] = useState(currentYear)
  const [marketingData, setMarketingData] = useState<MarketingChannelData[]>([])
  const [previousMarketingData, setPreviousMarketingData] = useState<MarketingChannelData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { currentStore } = useStore()

  const analyticsUseCases = useMemo(() => {
    const repository = new AnalyticsRepositoryImpl(currentStore.id)
    return new AnalyticsUseCases(repository)
  }, [currentStore.id])

  const years = useMemo(
    () => Array.from({ length: 5 }, (_, index) => currentYear - 2 + index),
    [currentYear]
  )

  useEffect(() => {
    let isMounted = true
    setIsLoading(true)
    setError(null)

    const fetchData = async () => {
      try {
        const current = await analyticsUseCases.getMarketingChannelReport(selectedYear)
        let previous: MarketingChannelData[] = []

        if (selectedYear > 0) {
          try {
            previous = await analyticsUseCases.getMarketingChannelReport(selectedYear - 1)
          } catch (prevError) {
            console.warn('[MarketingChannelsPage] failed to fetch previous year marketing analytics', prevError)
          }
        }

        if (!isMounted) return

        setMarketingData(current)
        setPreviousMarketingData(previous)
      } catch (err) {
        console.error('[MarketingChannelsPage] failed to fetch marketing analytics', err)
        if (!isMounted) return
        setError('媒体別の集計データを取得できませんでした。')
        setMarketingData([])
        setPreviousMarketingData([])
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

  const channelTotals = useMemo(() => {
    return marketingData.reduce((map, channel) => {
      map.set(channel.channel, channel.total)
      return map
    }, new Map<string, number>())
  }, [marketingData])

  const previousTotals = useMemo(() => {
    return previousMarketingData.reduce((map, channel) => {
      map.set(channel.channel, channel.total)
      return map
    }, new Map<string, number>())
  }, [previousMarketingData])

  const chartChannels = useMemo(() => marketingData.map((entry) => entry.channel), [marketingData])

  const chartData = useMemo(() => {
    return Array.from({ length: 12 }, (_, index) => {
      const monthLabel = `${index + 1}月`
      const row: Record<string, number | string> = { month: monthLabel }
      marketingData.forEach((channel) => {
        row[channel.channel] = channel.monthlySales[index] ?? 0
      })
      return row
    })
  }, [marketingData])

  const roiData = useMemo(() => buildROIRows(marketingData, previousTotals), [marketingData, previousTotals])
  const previousROIData = useMemo(() => buildROIRows(previousMarketingData, new Map()), [previousMarketingData])

  const conversionData = useMemo(() => buildConversionRows(marketingData), [marketingData])
  const previousConversionData = useMemo(() => buildConversionRows(previousMarketingData), [previousMarketingData])

  const kpis: KPIData = useMemo(() => {
    const totalCustomers = marketingData.reduce((sum, channel) => sum + channel.total, 0)
    const previousYearCustomers = previousMarketingData.reduce((sum, channel) => sum + channel.total, 0)

    const topChannel = marketingData.reduce((top, channel) => {
      if (!top || channel.total > top.total) return channel
      return top
    }, marketingData[0] ?? null)

    const topChannelPercentage = totalCustomers > 0 && topChannel
      ? Math.round((topChannel.total / totalCustomers) * 1000) / 10
      : 0

    const cacValues = roiData.filter((row) => row.cac > 0).map((row) => row.cac)
    const previousCacValues = previousROIData.filter((row) => row.cac > 0).map((row) => row.cac)
    const averageCAC = cacValues.length > 0 ? Math.round(cacValues.reduce((sum, value) => sum + value, 0) / cacValues.length) : 0
    const previousCAC = previousCacValues.length > 0
      ? Math.round(previousCacValues.reduce((sum, value) => sum + value, 0) / previousCacValues.length)
      : 0

    const averageConversionRate = conversionData.rows.length > 0
      ? conversionData.rows.reduce((sum, row) => sum + row.conversionRate, 0) / conversionData.rows.length
      : 0
    const previousAverageConversionRate = previousConversionData.rows.length > 0
      ? previousConversionData.rows.reduce((sum, row) => sum + row.conversionRate, 0) / previousConversionData.rows.length
      : 0

    return {
      totalCustomers,
      previousYearCustomers,
      topChannel: topChannel?.channel ?? '-',
      topChannelPercentage,
      averageCAC,
      previousCAC,
      conversionRate: Math.round(averageConversionRate * 10) / 10,
      previousConversionRate: Math.round(previousAverageConversionRate * 10) / 10,
    }
  }, [marketingData, previousMarketingData, roiData, previousROIData, conversionData, previousConversionData])

  const haveValues = !isLoading && !error && marketingData.length > 0

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold">営業媒体別分析</h1>
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
            <CardTitle className="text-sm font-medium">総顧客獲得数</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {haveValues ? `${kpis.totalCustomers.toLocaleString()}人` : '--'}
            </div>
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              {haveValues ? (
                kpis.previousYearCustomers > 0 && kpis.totalCustomers >= kpis.previousYearCustomers ? (
                  <TrendingUp className="h-3 w-3 text-green-600" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-red-600" />
                )
              ) : null}
              {haveValues && kpis.previousYearCustomers > 0 ? (
                <span
                  className={
                    kpis.totalCustomers - kpis.previousYearCustomers >= 0
                      ? 'text-green-600'
                      : 'text-red-600'
                  }
                >
                  {calculateGrowthRate(kpis.totalCustomers, kpis.previousYearCustomers)}%
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
            <CardTitle className="text-sm font-medium">最大獲得チャネル</CardTitle>
            <Megaphone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">
              {haveValues ? kpis.topChannel : '--'}
            </div>
            <p className="text-xs text-muted-foreground">
              {haveValues ? `全体の${kpis.topChannelPercentage.toFixed(1)}%` : '--'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">平均獲得単価</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {haveValues && kpis.averageCAC > 0 ? `¥${kpis.averageCAC.toLocaleString()}` : '--'}
            </div>
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              {(() => {
                if (!haveValues || kpis.previousCAC === 0) {
                  return <span className="text-muted-foreground">-</span>
                }
                const improvement = ((kpis.previousCAC - kpis.averageCAC) / kpis.previousCAC) * 100
                const icon = improvement >= 0 ? (
                  <TrendingUp className="h-3 w-3 text-green-600" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-red-600" />
                )
                return (
                  <>
                    {icon}
                    <span className={improvement >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {`${improvement >= 0 ? '+' : ''}${Math.abs(improvement).toFixed(1)}%`}
                    </span>
                  </>
                )
              })()}
              コスト改善
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">平均CV率</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {haveValues ? `${kpis.conversionRate.toFixed(1)}%` : '--'}
            </div>
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              {haveValues ? (
                kpis.conversionRate >= kpis.previousConversionRate ? (
                  <TrendingUp className="h-3 w-3 text-green-600" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-red-600" />
                )
              ) : null}
              {haveValues ? (
                <span
                  className={
                    kpis.conversionRate >= kpis.previousConversionRate
                      ? 'text-green-600'
                      : 'text-red-600'
                  }
                >
                  {`${kpis.conversionRate >= kpis.previousConversionRate ? '+' : ''}${(kpis.conversionRate - kpis.previousConversionRate).toFixed(1)}pt`}
                </span>
              ) : (
                <span className="text-muted-foreground">-</span>
              )}
              前年差分
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>チャネル別顧客獲得推移</CardTitle>
        </CardHeader>
        <CardContent>
          <MarketingChannelChart data={chartData} channels={chartChannels} />
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
              <TabsTrigger value="roi">ROI分析</TabsTrigger>
              <TabsTrigger value="conversion">CV分析</TabsTrigger>
            </TabsList>
            <TabsContent value="monthly" className="mt-4">
              <MarketingChannelTable data={marketingData} />
            </TabsContent>
            <TabsContent value="roi" className="mt-4">
              <MarketingROITable data={roiData} />
            </TabsContent>
            <TabsContent value="conversion" className="mt-4">
              <MarketingConversionTable data={conversionData.rows} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}

const CHANNEL_COSTS: Record<string, { monthlyCost: number; ltvMultiplier: number }> = {
  ホットペッパー: { monthlyCost: 120000, ltvMultiplier: 5 },
  Instagram: { monthlyCost: 60000, ltvMultiplier: 4 },
  Google広告: { monthlyCost: 90000, ltvMultiplier: 4 },
  紹介: { monthlyCost: 20000, ltvMultiplier: 6 },
  ウォークイン: { monthlyCost: 10000, ltvMultiplier: 3 },
  その他: { monthlyCost: 30000, ltvMultiplier: 3 },
}

const DEFAULT_MONTHLY_COST = 50000
const AVERAGE_TICKET_PRICE = 12000

function buildROIRows(
  marketingData: MarketingChannelData[],
  previousTotals: Map<string, number>
): MarketingROIRow[] {
  return marketingData.map((channel) => {
    const meta = CHANNEL_COSTS[channel.channel] ?? { monthlyCost: DEFAULT_MONTHLY_COST, ltvMultiplier: 4 }
    const customers = channel.total
    const cost = meta.monthlyCost * 12
    const revenue = customers * AVERAGE_TICKET_PRICE
    const cac = customers > 0 && cost > 0 ? Math.round(cost / customers) : 0
    const ltv = AVERAGE_TICKET_PRICE * meta.ltvMultiplier
    const roi = cost > 0 ? Math.round(((revenue - cost) / cost) * 100) : 0
    const previousCustomers = previousTotals.get(channel.channel) ?? 0
    const trend = previousCustomers > 0
      ? ((customers - previousCustomers) / previousCustomers) * 100
      : customers > 0
        ? 100
        : 0

    return {
      channel: channel.channel,
      cost,
      customers,
      revenue,
      cac,
      ltv,
      roi,
      trend,
    }
  })
}

function buildConversionRows(marketingData: MarketingChannelData[]): {
  rows: MarketingConversionRow[]
  averageConversion: number
} {
  if (marketingData.length === 0) {
    return { rows: [], averageConversion: 0 }
  }

  const totalCustomers = marketingData.reduce((sum, channel) => sum + channel.total, 0)
  const rows = marketingData.map((channel) => {
    const customers = channel.total
    const share = totalCustomers > 0 ? customers / totalCustomers : 0
    const visits = Math.max(customers, Math.round(customers / (0.35 + share * 0.1)))
    const bookings = Math.max(customers, Math.round(visits * (0.55 + share * 0.1)))
    const clicks = Math.max(bookings, Math.round(bookings / 0.65))
    const impressions = Math.max(clicks, Math.round(clicks / (0.06 + share * 0.02)))

    const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0
    const visitRate = clicks > 0 ? (visits / clicks) * 100 : 0
    const bookingRate = visits > 0 ? (bookings / visits) * 100 : 0
    const conversionRate = visits > 0 ? (customers / visits) * 100 : 0

    return {
      channel: channel.channel,
      impressions: Math.round(impressions),
      clicks: Math.round(clicks),
      visits: Math.round(visits),
      bookings: Math.max(customers, Math.round(bookings)),
      customers,
      ctr: clampPercentage(ctr),
      visitRate: clampPercentage(visitRate),
      bookingRate: clampPercentage(bookingRate),
      conversionRate: clampPercentage(conversionRate),
    }
  })

  const averageConversion =
    rows.length > 0 ? rows.reduce((sum, row) => sum + row.conversionRate, 0) / rows.length : 0

  return { rows, averageConversion }
}

function calculateGrowthRate(current: number, previous: number): number {
  if (previous === 0) {
    return current === 0 ? 0 : 100
  }
  return Math.round(((current - previous) / previous) * 1000) / 10
}

function clampPercentage(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(100, value))
}
