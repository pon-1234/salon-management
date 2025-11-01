'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Printer, Users, Calendar, TrendingUp, TrendingDown } from 'lucide-react'
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

function calculateGrowth(current: number, previous: number): number {
  if (previous === 0) {
    return current === 0 ? 0 : 100
  }
  return ((current - previous) / previous) * 100
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

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold">就業データ管理</h1>
          <div className="flex flex-wrap gap-2">
            <Select
              value={selectedYear.toString()}
              onValueChange={(value) => setSelectedYear(parseInt(value))}
            >
              <SelectTrigger className="w-[100px]">
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

            <Select
              value={selectedMonth.toString()}
              onValueChange={(value) => setSelectedMonth(parseInt(value))}
            >
              <SelectTrigger className="w-[80px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {months.map((month) => (
                  <SelectItem key={month} value={month.toString()}>
                    {month}月
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedStatus} onValueChange={(value) => setSelectedStatus(value as StatusFilter)}>
              <SelectTrigger className="w-[130px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedStaff} onValueChange={setSelectedStaff}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {staffOptions.map((staff) => (
                  <SelectItem key={staff} value={staff}>
                    {staff}
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

      {/* KPIカード */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">稼働スタッフ数</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {activeStaff}/{totalStaff}人
            </div>
            <p className="text-xs text-muted-foreground">
              稼働率: {totalStaff > 0 ? Math.round((activeStaff / totalStaff) * 100) : 0}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">平均出勤人数</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{averageAttendance}人/日</div>
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              {averageAttendance >= previousAverageAttendance ? (
                <TrendingUp className="h-3 w-3 text-green-600" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-600" />
              )}
              <span
                className={
                  averageAttendance >= previousAverageAttendance ? 'text-green-600' : 'text-red-600'
                }
              >
                {calculateGrowth(averageAttendance, previousAverageAttendance).toFixed(1)}%
              </span>
              前月比
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">出勤率</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{attendanceRate.toFixed(1)}%</div>
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              {attendanceRate >= previousAttendanceRate ? (
                <TrendingUp className="h-3 w-3 text-green-600" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-600" />
              )}
              <span
                className={
                  attendanceRate >= previousAttendanceRate ? 'text-green-600' : 'text-red-600'
                }
              >
                {(attendanceRate - previousAttendanceRate).toFixed(1)}pt
              </span>
              前月差
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">未出勤日数</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalAbsences}日</div>
            <p className="text-xs text-muted-foreground">
              前月比 {totalAbsences - previousTotalAbsences >= 0 ? '+' : ''}
              {totalAbsences - previousTotalAbsences}日
            </p>
          </CardContent>
        </Card>
      </div>

      {!isLoading && (
        <>
          {/* 出勤推移グラフ */}
          <Card>
            <CardHeader>
              <CardTitle>月間出勤推移</CardTitle>
            </CardHeader>
            <CardContent>
              <StaffAttendanceChart year={selectedYear} month={selectedMonth} data={filteredAttendance} />
            </CardContent>
          </Card>

          {/* 詳細データテーブル */}
          <Card>
            <CardHeader>
              <CardTitle>詳細データ</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="attendance" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="attendance">出勤表</TabsTrigger>
                  <TabsTrigger value="shift">シフト分析</TabsTrigger>
                  <TabsTrigger value="absence">欠勤状況</TabsTrigger>
                </TabsList>
                <TabsContent value="attendance" className="mt-4">
                  <StaffAttendanceTable year={selectedYear} month={selectedMonth} data={filteredAttendance} />
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
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
