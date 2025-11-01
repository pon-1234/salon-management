'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import {
  Printer,
  Clock,
  Users,
  TrendingUp,
  TrendingDown,
  Activity,
  BarChart3,
  Sparkles,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { HourlySalesChart } from '@/components/analytics/hourly-sales-chart'
import { HourlySalesTable } from '@/components/analytics/hourly-sales-table'
import { HourlyHeatmap } from '@/components/analytics/hourly-heatmap'
import { PeakTimeAnalysis } from '@/components/analytics/peak-time-analysis'
import { AnalyticsUseCases } from '@/lib/analytics/usecases'
import { AnalyticsRepositoryImpl } from '@/lib/analytics/repository'
import { useStore } from '@/contexts/store-context'
import { HourlySalesReport } from '@/lib/types/hourly-sales'

type InsightTone = 'positive' | 'warning' | 'neutral'

interface InsightItem {
  tone: InsightTone
  title: string
  description: string
}

function createEmptyReport(year: number, month: number): HourlySalesReport {
  const hours = Array.from({ length: 21 }, (_, i) => i + 7)
  return {
    year,
    month,
    data: [],
    hourlyTotals: hours.map(() => 0),
    grandTotal: 0,
    timeSlots: hours.map((hour) => ({
      range: `${hour}:00`,
      count: 0,
      percentage: 0,
    })),
  }
}

function calculateEfficiency(report: HourlySalesReport): number {
  if (!report.hourlyTotals.length) return 0
  const average =
    report.hourlyTotals.reduce((sum, count) => sum + count, 0) / report.hourlyTotals.length
  if (average === 0) return 0
  const busyHours = report.hourlyTotals.filter((count) => count >= average).length
  return Math.round((busyHours / report.hourlyTotals.length) * 1000) / 10
}

function calculateGrowthRate(current: number, previous: number): number {
  if (previous === 0) {
    return current === 0 ? 0 : 100
  }
  return ((current - previous) / previous) * 100
}

function formatDelta(value: number, unit = ''): string {
  if (value === 0) {
    return `±0${unit}`
  }
  const prefix = value > 0 ? '+' : '-'
  return `${prefix}${Math.abs(value).toLocaleString()}${unit}`
}

export default function HourlySalesPage() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [report, setReport] = useState<HourlySalesReport | null>(null)
  const [previousReport, setPreviousReport] = useState<HourlySalesReport | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { currentStore } = useStore()
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i)
  const months = Array.from({ length: 12 }, (_, i) => i + 1)

  const analyticsUseCases = useMemo(() => {
    const repository = new AnalyticsRepositoryImpl(currentStore.id)
    return new AnalyticsUseCases(repository)
  }, [currentStore.id])

  useEffect(() => {
    let isMounted = true
    setIsLoading(true)
    setError(null)

    const fetchReports = async () => {
      try {
        const current = await analyticsUseCases.getHourlySalesReport(year, month)
        let previous: HourlySalesReport | null = null
        const previousDate = new Date(year, month - 1, 1)
        previousDate.setMonth(previousDate.getMonth() - 1)
        const previousYear = previousDate.getFullYear()
        const previousMonth = previousDate.getMonth() + 1

        try {
          previous = await analyticsUseCases.getHourlySalesReport(previousYear, previousMonth)
        } catch (prevError) {
          console.warn('[HourlySalesPage] failed to fetch previous month hourly analytics', prevError)
        }

        if (!isMounted) return
        setReport(current)
        setPreviousReport(previous)
      } catch (err) {
        console.error('[HourlySalesPage] failed to fetch hourly analytics', err)
        if (!isMounted) return
        setReport(null)
        setPreviousReport(null)
        setError('時間帯別の集計データを取得できませんでした。')
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    fetchReports()

    return () => {
      isMounted = false
    }
  }, [analyticsUseCases, year, month])

  const salesData = report ?? createEmptyReport(year, month)
  const previousTotal = previousReport?.grandTotal ?? 0
  const efficiency = calculateEfficiency(salesData)
  const previousEfficiency = previousReport ? calculateEfficiency(previousReport) : 0

  const handlePrint = () => {
    window.print()
  }

  const peakIndex = salesData.hourlyTotals.reduce(
    (acc, value, idx) => (value > acc.value ? { value, idx } : acc),
    { value: 0, idx: -1 }
  )
  const peakHour =
    peakIndex.idx >= 0 ? `${peakIndex.idx + 7}:00-${peakIndex.idx + 8}:00` : '--'
  const averagePerHour =
    salesData.hourlyTotals.length > 0
      ? Math.round(
          salesData.hourlyTotals.reduce((sum, value) => sum + value, 0) / salesData.hourlyTotals.length
        )
      : 0
  const busyHours = salesData.hourlyTotals.filter(
    (value) => value >= averagePerHour && averagePerHour > 0
  ).length

  const kpiData = {
    peakHour,
    peakCustomers: peakIndex.value,
    averagePerHour,
    busyHours,
    totalCustomers: salesData.grandTotal,
    previousMonthTotal: previousTotal,
    efficiency,
    previousEfficiency,
  }

  const selectedPeriodLabel = `${year}年${month}月`
  const previousPeriodLabel = previousReport
    ? `${previousReport.year}年${previousReport.month}月`
    : '前月'
  const totalDifference = kpiData.totalCustomers - kpiData.previousMonthTotal
  const growthRate = calculateGrowthRate(kpiData.totalCustomers, kpiData.previousMonthTotal)
  const growthRateRounded = Number.isFinite(growthRate)
    ? Math.round(growthRate * 10) / 10
    : 0
  const growthRateDisplay = `${growthRateRounded >= 0 ? '+' : ''}${growthRateRounded.toFixed(1)}%`
  const efficiencyDelta = kpiData.efficiency - kpiData.previousEfficiency
  const efficiencyDeltaRounded = Math.round(efficiencyDelta * 10) / 10
  const efficiencyDeltaDisplay = `${efficiencyDeltaRounded >= 0 ? '+' : ''}${efficiencyDeltaRounded.toFixed(1)}pt`
  const busyRatio =
    salesData.hourlyTotals.length > 0 ? (busyHours / salesData.hourlyTotals.length) * 100 : 0
  const busyRatioRounded = Math.round(busyRatio)

  const handleShiftMonth = (offset: number) => {
    const date = new Date(year, month - 1, 1)
    date.setMonth(date.getMonth() + offset)
    setYear(date.getFullYear())
    setMonth(date.getMonth() + 1)
  }

  const keyMetrics = useMemo(
    () => [
      {
        title: '月間来客数',
        value: `${kpiData.totalCustomers.toLocaleString()}人`,
        helper: `${previousPeriodLabel}比 ${formatDelta(totalDifference, '人')}（${growthRateDisplay}）`,
        icon: Users,
        accent: 'bg-sky-50 text-sky-600',
        deltaPositive: totalDifference >= 0,
      },
      {
        title: 'ピーク時間帯',
        value: kpiData.peakHour,
        helper:
          kpiData.peakCustomers > 0
            ? `最大 ${kpiData.peakCustomers}人を記録`
            : 'ピークデータはありません',
        icon: Clock,
        accent: 'bg-emerald-50 text-emerald-600',
      },
      {
        title: '時間平均',
        value: `${kpiData.averagePerHour}人/時`,
        helper: `混雑時間 ${kpiData.busyHours}時間 (${busyRatioRounded}%)`,
        icon: Activity,
        accent: 'bg-amber-50 text-amber-600',
      },
      {
        title: '稼働効率',
        value: `${kpiData.efficiency}%`,
        helper: `${previousPeriodLabel}比 ${efficiencyDeltaDisplay}`,
        icon: BarChart3,
        accent: 'bg-violet-50 text-violet-600',
        deltaPositive: efficiencyDelta >= 0,
      },
    ],
    [
      busyRatioRounded,
      efficiencyDelta,
      efficiencyDeltaDisplay,
      growthRateDisplay,
      kpiData.averagePerHour,
      kpiData.busyHours,
      kpiData.efficiency,
      kpiData.peakCustomers,
      kpiData.peakHour,
      kpiData.totalCustomers,
      previousPeriodLabel,
      totalDifference,
    ]
  )

  const insights = useMemo<InsightItem[]>(() => {
    if (kpiData.totalCustomers === 0) {
      return [
        {
          tone: 'neutral',
          title: 'データがまだありません',
          description: '対象期間に来客データがありません。POS連携や期間設定をご確認ください。',
        },
      ]
    }

    const items: InsightItem[] = []

    if (growthRateRounded >= 5) {
      items.push({
        tone: 'positive',
        title: '来客数が堅調に成長',
        description: `${selectedPeriodLabel}の来客数は${previousPeriodLabel}比で${growthRateDisplay}。この勢いを活かし、指名強化施策の展開を検討しましょう。`,
      })
    } else if (growthRateRounded <= -5) {
      items.push({
        tone: 'warning',
        title: '来客数が減少傾向',
        description: `${selectedPeriodLabel}は${previousPeriodLabel}比で${growthRateDisplay}。減少時間帯をヒートマップで特定し、キャンペーンや価格調整でテコ入れを検討してください。`,
      })
    } else {
      items.push({
        tone: 'neutral',
        title: '来客数は安定',
        description: `${selectedPeriodLabel}の来客数は${previousPeriodLabel}と大きな差はありません。ピーク時間帯の体験価値向上に集中できます。`,
      })
    }

    if (efficiency < 55) {
      items.push({
        tone: 'warning',
        title: '稼働効率が低下',
        description: `稼働効率は${kpiData.efficiency}%。人員配置の見直しやアイドルタイムのプロモーション活用を検討しましょう。`,
      })
    } else if (efficiency >= 70) {
      items.push({
        tone: 'positive',
        title: '稼働効率が高い状態です',
        description: `稼働効率は${kpiData.efficiency}%で高水準を維持。ピーク時間の離脱防止施策に注力し、効率維持を図りましょう。`,
      })
    }

    if (busyRatioRounded >= 60) {
      items.push({
        tone: 'positive',
        title: '混雑時間が明確',
        description: `全時間帯のうち${busyRatioRounded}%が混雑帯。ピーク帯に合わせた増員やクロスセル施策が成果に直結します。`,
      })
    } else if (busyRatioRounded <= 30) {
      items.push({
        tone: 'warning',
        title: '混雑時間が限定的',
        description: `混雑帯は全体の${busyRatioRounded}%程度。集客施策の強化や営業時間の柔軟な見直しが必要かもしれません。`,
      })
    }

    return items
  }, [
    busyRatioRounded,
    efficiency,
    growthRateDisplay,
    growthRateRounded,
    kpiData.efficiency,
    kpiData.totalCustomers,
    previousPeriodLabel,
    selectedPeriodLabel,
  ])

  const insightToneMeta: Record<
    InsightTone,
    { icon: typeof Sparkles; container: string; iconColor: string }
  > = {
    positive: {
      icon: Sparkles,
      container: 'border-emerald-200 bg-emerald-50/60',
      iconColor: 'text-emerald-600',
    },
    warning: {
      icon: AlertTriangle,
      container: 'border-amber-200 bg-amber-50/70',
      iconColor: 'text-amber-600',
    },
    neutral: {
      icon: BarChart3,
      container: 'border-slate-200 bg-slate-50/80',
      iconColor: 'text-slate-600',
    },
  }

  return (
    <div className="mx-auto w-full max-w-screen-xl space-y-8">
      <Card className="border-none bg-gradient-to-br from-emerald-600 via-emerald-500 to-teal-500 text-white shadow-xl">
        <CardContent className="flex flex-col gap-6 p-6 pb-8 md:flex-row md:items-end md:justify-between md:p-8">
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-medium uppercase tracking-wide text-white/80">
                {currentStore.name}・{selectedPeriodLabel}
              </p>
              <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">時間別売上分析</h1>
              <p className="max-w-2xl text-sm leading-relaxed text-white/85">
                ピーク時間帯や稼働効率を一目で把握できるレポートです。混雑コントロールや人員配置の判断に役立つ主要指標をまとめています。
              </p>
            </div>
          </div>
          <div className="flex w-full flex-col gap-3 rounded-xl border border-white/20 bg-white/10 p-4 text-sm md:w-auto">
            <div className="flex items-center justify-between">
              <span className="text-white/80">月間来客数</span>
              <span className="text-lg font-semibold">
                {kpiData.totalCustomers.toLocaleString()}人
              </span>
            </div>
            <div className="flex items-center justify-between text-xs font-medium">
              <span className="text-white/70">{previousPeriodLabel}比</span>
              <span
                className={
                  totalDifference >= 0 ? 'text-emerald-200' : 'text-rose-200'
                }
              >
                {formatDelta(totalDifference, '人')}（{growthRateDisplay}）
              </span>
            </div>
            <Separator className="border-white/20 bg-white/20" />
            <div className="flex items-center justify-between text-xs font-medium">
              <span className="text-white/70">稼働効率</span>
              <span
                className={
                  efficiencyDelta >= 0 ? 'text-emerald-200' : 'text-rose-200'
                }
              >
                {kpiData.efficiency}%（{efficiencyDeltaDisplay}）
              </span>
            </div>
            <Button
              onClick={handlePrint}
              variant="ghost"
              className="h-9 justify-center rounded-lg border border-white/30 bg-white/10 text-white hover:bg-white/20 print:hidden"
            >
              <Printer className="h-4 w-4" />
              印刷する
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-sm">
        <CardHeader className="flex flex-col gap-2 border-b pb-4">
          <CardTitle className="text-base font-semibold">対象期間と表示設定</CardTitle>
          <p className="text-sm text-muted-foreground">
            マネージャーが意思決定しやすいよう、前月との比較とピーク帯を自動でハイライトします。
          </p>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 pt-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="grid flex-1 grid-cols-1 gap-4 sm:grid-cols-2 md:max-w-xl md:grid-cols-4 lg:max-w-2xl">
            <div className="space-y-1.5">
              <Label htmlFor="hourly-year">対象年</Label>
              <Select
                value={year.toString()}
                onValueChange={(value) => setYear(parseInt(value))}
              >
                <SelectTrigger id="hourly-year">
                  <SelectValue placeholder="年を選択" />
                </SelectTrigger>
                <SelectContent>
                  {years.map((y) => (
                    <SelectItem key={y} value={y.toString()}>
                      {y}年
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="hourly-month">対象月</Label>
              <Select
                value={month.toString()}
                onValueChange={(value) => setMonth(parseInt(value))}
              >
                <SelectTrigger id="hourly-month">
                  <SelectValue placeholder="月を選択" />
                </SelectTrigger>
                <SelectContent>
                  {months.map((m) => (
                    <SelectItem key={m} value={m.toString()}>
                      {m}月
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-transparent">spacer</Label>
              <Button
                variant="outline"
                className="w-full bg-muted/30"
                onClick={() => handleShiftMonth(-1)}
              >
                <ChevronLeft className="h-4 w-4" />
                前月
              </Button>
            </div>
            <div className="space-y-1.5">
              <Label className="text-transparent">spacer</Label>
              <Button
                variant="outline"
                className="w-full bg-muted/30"
                onClick={() => handleShiftMonth(1)}
              >
                来月
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
          {isLoading && (
            <span className="text-sm text-muted-foreground">データを読み込み中です…</span>
          )}
        </CardContent>
      </Card>

      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {keyMetrics.map((metric) => {
          const Icon = metric.icon
          const deltaColor =
            'deltaPositive' in metric
              ? metric.deltaPositive
                ? 'text-emerald-600'
                : 'text-rose-600'
              : 'text-muted-foreground'
          return (
            <Card key={metric.title} className="shadow-sm">
              <CardContent className="space-y-3 p-5">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {metric.title}
                    </span>
                    <div className="text-2xl font-semibold">{metric.value}</div>
                  </div>
                  <span
                    className={`rounded-full p-2 text-sm font-semibold ${metric.accent}`}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                </div>
                <p className={`text-xs font-medium ${deltaColor}`}>{metric.helper}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-[2fr,1fr]">
        <div className="space-y-6">
          <Card className="shadow-sm">
            <CardHeader className="space-y-1">
              <CardTitle className="text-lg font-semibold">時間別来客数の推移</CardTitle>
              <p className="text-sm text-muted-foreground">
                選択期間の時間帯別来客数をプロットしています。ピーク帯とアイドル帯のギャップを視覚的に確認できます。
              </p>
            </CardHeader>
            <CardContent>
              <HourlySalesChart data={salesData} />
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="space-y-1">
              <CardTitle className="text-lg font-semibold">詳細データビュー</CardTitle>
              <p className="text-sm text-muted-foreground">
                日別明細・ヒートマップ・ピーク分析の3種類で深掘りできます。施策検討前の下調べに活用してください。
              </p>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="daily" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="daily">日別明細</TabsTrigger>
                  <TabsTrigger value="heatmap">ヒートマップ</TabsTrigger>
                  <TabsTrigger value="peak">ピーク分析</TabsTrigger>
                </TabsList>
                <TabsContent value="daily" className="mt-4">
                  <HourlySalesTable data={salesData} />
                </TabsContent>
                <TabsContent value="heatmap" className="mt-4">
                  <HourlyHeatmap data={salesData} />
                </TabsContent>
                <TabsContent value="peak" className="mt-4">
                  <PeakTimeAnalysis data={salesData} />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="shadow-sm">
            <CardHeader className="space-y-2">
              <CardTitle className="text-base font-semibold">前月対比サマリー</CardTitle>
              <p className="text-sm text-muted-foreground">
                主要指標の変化を簡潔に確認できます。大きな差分は詳細タブでドリルダウンしてください。
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">月間来客数</span>
                  <span className="font-semibold">{kpiData.totalCustomers.toLocaleString()}人</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{previousPeriodLabel}</span>
                  <span className={totalDifference >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                    {formatDelta(totalDifference, '人')}（{growthRateDisplay}）
                  </span>
                </div>
              </div>
              <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">稼働効率</span>
                  <span className="font-semibold">{kpiData.efficiency}%</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{previousPeriodLabel}</span>
                  <span
                    className={efficiencyDelta >= 0 ? 'text-emerald-600' : 'text-rose-600'}
                  >
                    {efficiencyDeltaDisplay}
                  </span>
                </div>
              </div>
              <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">混雑時間帯</span>
                  <span className="font-semibold">
                    {kpiData.busyHours}時間 ({busyRatioRounded}%)
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  ヒートマップから混雑が偏っている曜日・時間帯を確認し、スタッフ配置計画に反映しましょう。
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="space-y-2">
              <CardTitle className="text-base font-semibold">マネージャー向けインサイト</CardTitle>
              <p className="text-sm text-muted-foreground">
                主要指標から読み取れるポイントを自動抽出しています。施策立案のヒントにご活用ください。
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              {insights.map((insight) => {
                const meta = insightToneMeta[insight.tone]
                const InsightIcon = meta.icon
                return (
                  <div
                    key={insight.title}
                    className={`space-y-2 rounded-lg border px-4 py-3 text-sm ${meta.container}`}
                  >
                    <div className="flex items-center gap-2 font-semibold">
                      <InsightIcon className={`h-4 w-4 ${meta.iconColor}`} />
                      <span>{insight.title}</span>
                    </div>
                    <p className="leading-relaxed text-muted-foreground">{insight.description}</p>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
