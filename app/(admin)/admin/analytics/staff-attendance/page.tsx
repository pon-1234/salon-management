'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import {
  Printer,
  Users,
  Calendar,
  Sparkles,
  AlertTriangle,
  BarChart3,
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
import { StaffAttendanceTable } from '@/components/analytics/staff-attendance-table'
import { StaffAttendanceChart } from '@/components/analytics/staff-attendance-chart'
import { StaffShiftAnalysis, StaffShiftStat } from '@/components/analytics/staff-shift-analysis'
import { StaffAbsenceTable, StaffAbsenceSummary } from '@/components/analytics/staff-absence-table'
import { AnalyticsUseCases } from '@/lib/analytics/usecases'
import { AnalyticsRepositoryImpl } from '@/lib/analytics/repository'
import { useStore } from '@/contexts/store-context'
import { StaffAttendanceSummary } from '@/lib/types/staff-attendance'
import { getDaysInMonth } from 'date-fns'

type PreviousPeriod = { year: number; month: number }

const STATUS_OPTIONS = ['全て表示', '出勤のみ', '休みのみ', '当日欠勤'] as const
type StatusFilter = (typeof STATUS_OPTIONS)[number]

type InsightTone = 'positive' | 'warning' | 'neutral'

interface InsightItem {
  tone: InsightTone
  title: string
  description: string
}

function calculateLongestAbsence(attendance: (0 | 1)[], daysInMonth: number): number {
  let longest = 0
  let current = 0

  for (let index = 0; index < daysInMonth; index += 1) {
    const value = attendance[index] ?? 0
    if (value === 0) {
      current += 1
      longest = Math.max(longest, current)
    } else {
      current = 0
    }
  }

  return longest
}

function formatIntegerDelta(value: number, unit = ''): string {
  if (value === 0) {
    return `±0${unit}`
  }
  const prefix = value > 0 ? '+' : '-'
  return `${prefix}${Math.abs(value).toLocaleString()}${unit}`
}

function formatDecimalDelta(value: number, unit = '', fractionDigits = 1): string {
  if (!Number.isFinite(value) || value === 0) {
    return `±0${unit}`
  }
  const prefix = value > 0 ? '+' : '-'
  return `${prefix}${Math.abs(value).toFixed(fractionDigits)}${unit}`
}

export default function StaffAttendancePage() {
  const now = new Date()
  const [selectedYear, setSelectedYear] = useState(now.getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1)
  const [selectedStatus, setSelectedStatus] = useState<StatusFilter>('全て表示')
  const [selectedStaff, setSelectedStaff] = useState('全スタッフ')

  const [attendanceData, setAttendanceData] = useState<StaffAttendanceSummary[]>([])
  const [previousAttendance, setPreviousAttendance] = useState<StaffAttendanceSummary[] | null>(null)
  const [previousPeriod, setPreviousPeriod] = useState<PreviousPeriod | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const { currentStore } = useStore()
  const analyticsUseCases = useMemo(() => {
    const repository = new AnalyticsRepositoryImpl(currentStore.id)
    return new AnalyticsUseCases(repository)
  }, [currentStore.id])

  useEffect(() => {
    let isMounted = true
    setIsLoading(true)
    setError(null)

    const fetchAttendance = async () => {
      try {
        const current = await analyticsUseCases.getStaffAttendanceReport(selectedYear, selectedMonth)

        const previousDate = new Date(selectedYear, selectedMonth - 1, 1)
        previousDate.setMonth(previousDate.getMonth() - 1)
        const previousYear = previousDate.getFullYear()
        const previousMonth = previousDate.getMonth() + 1

        let previous: StaffAttendanceSummary[] | null = null
        try {
          previous = await analyticsUseCases.getStaffAttendanceReport(previousYear, previousMonth)
        } catch (prevError) {
          console.warn('[StaffAttendancePage] failed to fetch previous attendance data', prevError)
        }

        if (!isMounted) return

        setAttendanceData(current)
        setPreviousAttendance(previous)
        setPreviousPeriod({ year: previousYear, month: previousMonth })
      } catch (err) {
        console.error('[StaffAttendancePage] failed to fetch attendance analytics', err)
        if (!isMounted) return
        setAttendanceData([])
        setPreviousAttendance(null)
        setPreviousPeriod(null)
        setError('出勤データの取得に失敗しました。')
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    fetchAttendance()

    return () => {
      isMounted = false
    }
  }, [analyticsUseCases, selectedYear, selectedMonth])

  useEffect(() => {
    if (
      selectedStaff !== '全スタッフ' &&
      !attendanceData.some((staff) => staff.name === selectedStaff)
    ) {
      setSelectedStaff('全スタッフ')
    }
  }, [attendanceData, selectedStaff])

  const currentYear = new Date().getFullYear()
  const years = useMemo(() => Array.from({ length: 5 }, (_, i) => currentYear - 2 + i), [currentYear])
  const months = useMemo(() => Array.from({ length: 12 }, (_, i) => i + 1), [])
  const staffOptions = useMemo(
    () => ['全スタッフ', ...attendanceData.map((staff) => staff.name)],
    [attendanceData]
  )

  const daysInMonth = getDaysInMonth(new Date(selectedYear, selectedMonth - 1, 1))
  const weekendDaysInMonth = useMemo(() => {
    let weekendCount = 0
    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = new Date(selectedYear, selectedMonth - 1, day)
      const weekday = date.getDay()
      if (weekday === 0 || weekday === 6) {
        weekendCount += 1
      }
    }
    return weekendCount
  }, [daysInMonth, selectedMonth, selectedYear])

  const previousDaysInMonth = previousPeriod
    ? getDaysInMonth(new Date(previousPeriod.year, previousPeriod.month - 1, 1))
    : 0

  const previousMap = useMemo(() => {
    return new Map(previousAttendance?.map((staff) => [staff.id, staff]) ?? [])
  }, [previousAttendance])

  const filteredAttendance = attendanceData.filter((staff) => {
    if (selectedStaff !== '全スタッフ' && staff.name !== selectedStaff) {
      return false
    }

    switch (selectedStatus) {
      case '出勤のみ':
        return staff.total > 0
      case '休みのみ':
        return staff.total === 0
      case '当日欠勤': {
        const previous = previousMap.get(staff.id)
        return staff.total === 0 && (previous?.total ?? 0) > 0
      }
      default:
        return true
    }
  })

  const totalStaff = attendanceData.length
  const activeStaff = attendanceData.filter((staff) => staff.total > 0).length
  const totalAttendanceCount = attendanceData.reduce((sum, staff) => sum + staff.total, 0)

  const averageAttendance =
    daysInMonth > 0 ? Math.round((totalAttendanceCount / daysInMonth) * 10) / 10 : 0

  const previousAttendanceTotal =
    previousAttendance?.reduce((sum, staff) => sum + staff.total, 0) ?? 0
  const previousAverageAttendance =
    previousDaysInMonth > 0
      ? Math.round((previousAttendanceTotal / previousDaysInMonth) * 10) / 10
      : 0

  const attendanceRate =
    totalStaff > 0 ? (totalAttendanceCount / (totalStaff * daysInMonth)) * 100 : 0
  const previousStaffCount = previousAttendance?.length ?? 0
  const previousAttendanceRate =
    previousStaffCount > 0 && previousDaysInMonth > 0
      ? (previousAttendanceTotal / (previousStaffCount * previousDaysInMonth)) * 100
      : 0

  const totalAbsences = totalStaff * daysInMonth - totalAttendanceCount
  const previousTotalAbsences =
    previousStaffCount * previousDaysInMonth - previousAttendanceTotal

  const shiftStats: StaffShiftStat[] = filteredAttendance.map((staff) => {
    const totalHours = staff.totalMinutes / 60
    const averageHours = staff.total > 0 ? totalHours / staff.total : 0
    const attendanceRatio = daysInMonth > 0 ? (staff.total / daysInMonth) * 100 : 0
    return {
      id: staff.id,
      name: staff.name,
      totalDays: staff.total,
      weekdayDays: staff.weekdayAttendance,
      weekendDays: staff.weekendAttendance,
      totalHours,
      averageHours,
      attendanceRate: attendanceRatio,
    }
  })

  const absenceSummary: StaffAbsenceSummary[] = filteredAttendance.map((staff) => {
    const absenceDays = Math.max(daysInMonth - staff.total, 0)
    const weekendAbsenceDays = Math.max(weekendDaysInMonth - staff.weekendAttendance, 0)
    const longestAbsenceStreak = calculateLongestAbsence(staff.attendance, daysInMonth)
    const attendanceRatio = daysInMonth > 0 ? (staff.total / daysInMonth) * 100 : 0
    return {
      id: staff.id,
      name: staff.name,
      absenceDays,
      weekendAbsenceDays,
      longestAbsenceStreak,
      attendanceRate: attendanceRatio,
    }
  })

  const handlePrint = () => {
    window.print()
  }

  const selectedPeriodLabel = `${selectedYear}年${selectedMonth}月`
  const previousPeriodLabel = previousPeriod
    ? `${previousPeriod.year}年${previousPeriod.month}月`
    : '前月'

  const activeStaffRate =
    totalStaff > 0 ? Math.round((activeStaff / totalStaff) * 1000) / 10 : 0
  const averageAttendanceDiff = averageAttendance - previousAverageAttendance
  const attendanceRateDelta = attendanceRate - previousAttendanceRate
  const totalAbsenceDelta = totalAbsences - previousTotalAbsences
  const weekendAttendanceTotal = attendanceData.reduce(
    (sum, staff) => sum + staff.weekendAttendance,
    0
  )
  const weekendAttendanceRate =
    weekendDaysInMonth > 0 && totalStaff > 0
      ? (weekendAttendanceTotal / (weekendDaysInMonth * totalStaff)) * 100
      : 0
  const weekendAttendanceRateRounded = Math.round(weekendAttendanceRate * 10) / 10
  const attendanceRateRounded = Math.round(attendanceRate * 10) / 10
  const suddenAbsenceCount = attendanceData.filter((staff) => {
    const previous = previousMap.get(staff.id)
    return staff.total === 0 && (previous?.total ?? 0) > 0
  }).length
  const zeroAttendanceCount = attendanceData.filter((staff) => staff.total === 0).length
  const maxAbsenceStreak = absenceSummary.reduce(
    (max, staff) => Math.max(max, staff.longestAbsenceStreak),
    0
  )

  const handleShiftMonth = (offset: number) => {
    const date = new Date(selectedYear, selectedMonth - 1, 1)
    date.setMonth(date.getMonth() + offset)
    setSelectedYear(date.getFullYear())
    setSelectedMonth(date.getMonth() + 1)
  }

  const keyMetrics = useMemo(
    () => [
      {
        title: '稼働スタッフ',
        value: `${activeStaff}/${totalStaff}人`,
        helper: `稼働率 ${activeStaffRate.toFixed(1)}%`,
        icon: Users,
        accent: 'bg-emerald-50 text-emerald-600',
      },
      {
        title: '平均出勤人数',
        value: `${averageAttendance.toFixed(1)}人/日`,
        helper: `${previousPeriodLabel}比 ${formatDecimalDelta(averageAttendanceDiff, '人', 1)}`,
        icon: Calendar,
        accent: 'bg-sky-50 text-sky-600',
        deltaPositive: averageAttendanceDiff >= 0,
      },
      {
        title: '出勤率',
        value: `${attendanceRate.toFixed(1)}%`,
        helper: `${previousPeriodLabel}比 ${formatDecimalDelta(attendanceRateDelta, 'pt', 1)}`,
        icon: BarChart3,
        accent: 'bg-indigo-50 text-indigo-600',
        deltaPositive: attendanceRateDelta >= 0,
      },
      {
        title: '未出勤日数',
        value: `${totalAbsences.toLocaleString()}日`,
        helper: `${previousPeriodLabel}比 ${formatIntegerDelta(totalAbsenceDelta, '日')}`,
        icon: AlertTriangle,
        accent: 'bg-amber-50 text-amber-600',
        deltaPositive: totalAbsenceDelta <= 0,
      },
    ],
    [
      activeStaff,
      activeStaffRate,
      attendanceRate,
      attendanceRateDelta,
      averageAttendance,
      averageAttendanceDiff,
      previousPeriodLabel,
      totalAbsenceDelta,
      totalAbsences,
      totalStaff,
    ]
  )

  const insights = useMemo<InsightItem[]>(() => {
    if (totalStaff === 0) {
      return [
        {
          tone: 'neutral',
          title: 'スタッフデータがありません',
          description: '対象期間の出勤データがまだ登録されていません。シフト管理システムの連携状況を確認してください。',
        },
      ]
    }

    const items: InsightItem[] = []

    if (attendanceRateDelta >= 2) {
      items.push({
        tone: 'positive',
        title: '出勤率が改善しています',
        description: `${selectedPeriodLabel}の出勤率は${previousPeriodLabel}比で${formatDecimalDelta(attendanceRateDelta, 'pt', 1)}。好調な傾向を維持するために週末帯のシフト充足も確認しておきましょう。`,
      })
    } else if (attendanceRateDelta <= -2) {
      items.push({
        tone: 'warning',
        title: '出勤率が低下しています',
        description: `${previousPeriodLabel}比で${formatDecimalDelta(attendanceRateDelta, 'pt', 1)}。欠勤が集中する曜日を欠勤状況タブで特定し、フォロー面談を検討してください。`,
      })
    } else {
      items.push({
        tone: 'neutral',
        title: '出勤率は横ばいです',
        description: `${selectedPeriodLabel}の出勤率は${previousPeriodLabel}と大きな差はありません。個別の稼働日数の偏りがないかを確認しましょう。`,
      })
    }

    if (suddenAbsenceCount > 0) {
      items.push({
        tone: 'warning',
        title: '当日欠勤が発生',
        description: `当月に当日欠勤が${suddenAbsenceCount}名発生。欠勤理由の共有と代替手配フローの見直しを行いましょう。`,
      })
    }

    if (maxAbsenceStreak >= 3) {
      items.push({
        tone: 'warning',
        title: '連続欠勤者がいます',
        description: `最長で${maxAbsenceStreak}日間休んでいるスタッフがいます。モチベーション低下や健康面のケアが必要か確認してください。`,
      })
    }

    if (weekendAttendanceRateRounded + 5 < attendanceRateRounded) {
      items.push({
        tone: 'warning',
        title: '週末の稼働が不足気味',
        description: `週末の出勤率は${weekendAttendanceRateRounded.toFixed(1)}%と全体平均を下回っています。週末インセンティブや増員を検討してください。`,
      })
    } else if (weekendAttendanceRateRounded - 5 > attendanceRateRounded) {
      items.push({
        tone: 'positive',
        title: '週末稼働が高水準',
        description: `週末の出勤率は${weekendAttendanceRateRounded.toFixed(1)}%。平日の稼働戦略にも応用できる好調な状態です。`,
      })
    }

    if (items.length < 4 && zeroAttendanceCount > 0) {
      items.push({
        tone: 'neutral',
        title: '未稼働スタッフをフォロー',
        description: `${zeroAttendanceCount}名が今月まだ稼働していません。シフト希望の再確認やヒアリングを実施しましょう。`,
      })
    }

    if (items.length < 4 && activeStaffRate >= 80) {
      items.push({
        tone: 'positive',
        title: '稼働率は安定しています',
        description: `稼働スタッフ比率は${activeStaffRate.toFixed(1)}%。評価面談では定着施策の継続を提案できます。`,
      })
    }

    return items
  }, [
    activeStaffRate,
    attendanceRateDelta,
    attendanceRateRounded,
    maxAbsenceStreak,
    previousPeriodLabel,
    selectedPeriodLabel,
    suddenAbsenceCount,
    totalStaff,
    weekendAttendanceRateRounded,
    zeroAttendanceCount,
  ])

  const insightToneMeta: Record<
    InsightTone,
    { icon: typeof Sparkles; container: string; iconColor: string }
  > = {
    positive: {
      icon: Sparkles,
      container: 'border-emerald-200 bg-emerald-50/70',
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
    <div className="space-y-8">
      <Card className="border-none bg-gradient-to-br from-sky-600 via-cyan-500 to-emerald-500 text-white shadow-xl">
        <CardContent className="flex flex-col gap-6 p-6 pb-8 md:flex-row md:items-end md:justify-between md:p-8">
          <div className="space-y-4">
            <p className="text-sm font-medium uppercase tracking-wide text-white/80">
              {currentStore.name}・{selectedPeriodLabel}
            </p>
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">就業データ管理</h1>
              <p className="max-w-2xl text-sm leading-relaxed text-white/85">
                スタッフの稼働状況や欠勤傾向を把握し、迅速なケアとシフト調整を支援するマネージャー向けダッシュボードです。
              </p>
            </div>
          </div>
          <div className="grid w-full gap-3 rounded-xl border border-white/20 bg-white/10 p-4 text-sm md:w-80">
            <div className="flex items-center justify-between font-semibold">
              <span className="text-white/80">稼働スタッフ</span>
              <span className="text-lg">
                {activeStaff}/{totalStaff}人
              </span>
            </div>
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-white/75">稼働率</span>
              <span>{activeStaffRate.toFixed(1)}%</span>
            </div>
            <Separator className="border-white/20 bg-white/20" />
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-white/75">出勤率</span>
              <span>
                {attendanceRate.toFixed(1)}%（{formatDecimalDelta(attendanceRateDelta, 'pt', 1)}）
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
        <CardHeader className="space-y-1 border-b pb-4">
          <CardTitle className="text-base font-semibold">表示条件</CardTitle>
          <p className="text-sm text-muted-foreground">
            対象期間・ステータス・スタッフで絞り込むと、グラフとタブの内容がリアルタイムに更新されます。
          </p>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="space-y-1.5">
              <Label htmlFor="attendance-year">対象年</Label>
              <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
                <SelectTrigger id="attendance-year">
                  <SelectValue placeholder="年を選択" />
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
            <div className="space-y-1.5">
              <Label htmlFor="attendance-month">対象月</Label>
              <Select value={selectedMonth.toString()} onValueChange={(value) => setSelectedMonth(parseInt(value))}>
                <SelectTrigger id="attendance-month">
                  <SelectValue placeholder="月を選択" />
                </SelectTrigger>
                <SelectContent>
                  {months.map((month) => (
                    <SelectItem key={month} value={month.toString()}>
                      {month}月
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="attendance-status">出勤ステータス</Label>
              <Select
                id="attendance-status"
                value={selectedStatus}
                onValueChange={(value) => setSelectedStatus(value as StatusFilter)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="ステータスを選択" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="attendance-staff">スタッフ</Label>
              <Select id="attendance-staff" value={selectedStaff} onValueChange={setSelectedStaff}>
                <SelectTrigger>
                  <SelectValue placeholder="全スタッフ" />
                </SelectTrigger>
                <SelectContent>
                  {staffOptions.map((staff) => (
                    <SelectItem key={staff} value={staff}>
                      {staff}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">個別フォロー時に対象スタッフだけを表示可能です。</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <Button variant="outline" className="bg-muted/30" onClick={() => handleShiftMonth(-1)}>
                <ChevronLeft className="h-4 w-4" />
                前月
              </Button>
              <Button variant="outline" className="bg-muted/30" onClick={() => handleShiftMonth(1)}>
                来月
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              <span>表示: {selectedStatus}</span>
              <span>スタッフ: {selectedStaff}</span>
              <span>期間: {selectedPeriodLabel}</span>
            </div>
          </div>
          {isLoading && !error && (
            <p className="text-xs text-muted-foreground">最新データを取得しています...</p>
          )}
        </CardContent>
      </Card>

      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {keyMetrics.map((metric) => {
          const Icon = metric.icon
          const deltaClass =
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
                  <span className={`rounded-full p-2 ${metric.accent}`}>
                    <Icon className="h-4 w-4" />
                  </span>
                </div>
                <p className={`text-xs font-medium ${deltaClass}`}>{metric.helper}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-[2fr,1fr]">
        <div className="space-y-6">
          <Card className="shadow-sm">
            <CardHeader className="space-y-1">
              <CardTitle className="text-lg font-semibold">月間出勤推移</CardTitle>
              <p className="text-sm text-muted-foreground">
                日別の出勤人数を可視化しています。ピークや谷間を確認し、人員配置の調整に活用してください。
              </p>
            </CardHeader>
            <CardContent>
              {error ? (
                <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
                  データを表示できません。選択期間を変更するか、再読み込みしてください。
                </div>
              ) : isLoading ? (
                <div className="rounded-md border border-dashed border-border p-6 text-sm text-muted-foreground">
                  データを読み込み中です...
                </div>
              ) : (
                <StaffAttendanceChart
                  year={selectedYear}
                  month={selectedMonth}
                  data={filteredAttendance}
                />
              )}
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="space-y-1">
              <CardTitle className="text-lg font-semibold">詳細データビュー</CardTitle>
              <p className="text-sm text-muted-foreground">
                出勤表・シフト分析・欠勤状況の3つのタブから多面的に状況を把握できます。
              </p>
            </CardHeader>
            <CardContent>
              {error ? (
                <div className="rounded-md border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
                  詳細データを取得できませんでした。
                </div>
              ) : isLoading ? (
                <div className="rounded-md border border-dashed border-border p-6 text-sm text-muted-foreground">
                  データを読み込み中です...
                </div>
              ) : (
                <Tabs defaultValue="attendance" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="attendance">出勤表</TabsTrigger>
                    <TabsTrigger value="shift">シフト分析</TabsTrigger>
                    <TabsTrigger value="absence">欠勤状況</TabsTrigger>
                  </TabsList>
                  <TabsContent value="attendance" className="mt-4">
                    <StaffAttendanceTable
                      year={selectedYear}
                      month={selectedMonth}
                      data={filteredAttendance}
                    />
                  </TabsContent>
                  <TabsContent value="shift" className="mt-4">
                    <StaffShiftAnalysis
                      data={shiftStats}
                      daysInMonth={daysInMonth}
                      weekendDaysInMonth={weekendDaysInMonth}
                    />
                  </TabsContent>
                  <TabsContent value="absence" className="mt-4">
                    <StaffAbsenceTable data={absenceSummary} />
                  </TabsContent>
                </Tabs>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="shadow-sm">
            <CardHeader className="space-y-2">
              <CardTitle className="text-base font-semibold">前月対比サマリー</CardTitle>
              <p className="text-sm text-muted-foreground">
                主要指標の推移を俯瞰し、優先的に着手すべき論点を把握できます。
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">平均出勤人数</span>
                  <span className="font-semibold">{averageAttendance.toFixed(1)}人/日</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{previousPeriodLabel}</span>
                  <span className={averageAttendanceDiff >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                    {formatDecimalDelta(averageAttendanceDiff, '人', 1)}
                  </span>
                </div>
              </div>
              <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">出勤率</span>
                  <span className="font-semibold">{attendanceRate.toFixed(1)}%</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{previousPeriodLabel}</span>
                  <span className={attendanceRateDelta >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                    {formatDecimalDelta(attendanceRateDelta, 'pt', 1)}
                  </span>
                </div>
              </div>
              <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">未出勤日数</span>
                  <span className="font-semibold">{totalAbsences.toLocaleString()}日</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{previousPeriodLabel}</span>
                  <span className={totalAbsenceDelta <= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                    {formatIntegerDelta(totalAbsenceDelta, '日')}
                  </span>
                </div>
              </div>
              <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">週末出勤率</span>
                  <span className="font-semibold">{weekendAttendanceRateRounded.toFixed(1)}%</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  週末 {weekendDaysInMonth}日中 {weekendAttendanceTotal.toLocaleString()}日出勤
                </p>
              </div>
              <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">当日欠勤</span>
                  <span className={suddenAbsenceCount > 0 ? 'font-semibold text-amber-600' : 'text-muted-foreground'}>
                    {suddenAbsenceCount}名
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  欠勤理由のヒアリングとフォロー計画を設定してください。
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-sm">
            <CardHeader className="space-y-2">
              <CardTitle className="text-base font-semibold">マネージャー向けインサイト</CardTitle>
              <p className="text-sm text-muted-foreground">
                指標から抽出した要点です。会議やスタッフケアのアクションにご活用ください。
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
