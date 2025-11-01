'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Printer, TrendingUp, TrendingDown, Package, DollarSign, Users } from 'lucide-react'
import { MonthSelector } from '@/components/analytics/month-selector'
import { CourseSalesChart } from '@/components/analytics/course-sales-chart'
import { CourseSalesTable } from '@/components/analytics/course-sales-table'
import { CourseRankingTable } from '@/components/analytics/course-ranking-table'
import { CourseTrendTable } from '@/components/analytics/course-trend-table'
import { AnalyticsUseCases } from '@/lib/analytics/usecases'
import { AnalyticsRepositoryImpl } from '@/lib/analytics/repository'
import { CourseSalesData } from '@/lib/types/analytics'
import { useStore } from '@/contexts/store-context'

interface CourseSummary {
  id: string
  name: string
  duration: number
  price: number
  totalBookings: number
  revenue: number
}

interface CourseTrendSeries {
  label: string
  year: number
  month: number
  summaries: CourseSummary[]
}

export default function CourseSalesPage() {
  const now = new Date()
  const [selectedYear, setSelectedYear] = useState(now.getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1)
  const [courses, setCourses] = useState<CourseSalesData[]>([])
  const [previousCourses, setPreviousCourses] = useState<CourseSalesData[]>([])
  const [trendSeries, setTrendSeries] = useState<CourseTrendSeries[]>([])
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

    const fetchCourseSales = async () => {
      const monthsToFetch = buildTrailingMonths(selectedYear, selectedMonth, 3)
      const results = await Promise.allSettled(
        monthsToFetch.map(({ year, month }) =>
          analyticsUseCases.getCourseSalesReport(year, month)
        )
      )

      if (!isMounted) return

      if (results[0].status !== 'fulfilled') {
        throw results[0].reason ?? new Error('Failed to fetch course sales')
      }

      const normalized = monthsToFetch.map((target, index) => ({
        ...target,
        label: `${target.year}年${target.month}月`,
        data: results[index]?.status === 'fulfilled' ? results[index].value : [],
      }))

      setCourses(normalized[0].data)
      setPreviousCourses(normalized[1]?.data ?? [])
      setTrendSeries(
        normalized.map((entry) => ({
          label: entry.label,
          year: entry.year,
          month: entry.month,
          summaries: summarizeCourses(entry.data),
        }))
      )
    }

    fetchCourseSales()
      .catch((err) => {
        console.error('[CourseSalesPage] failed to fetch course analytics', err)
        if (!isMounted) return
        setCourses([])
        setPreviousCourses([])
        setTrendSeries([])
        setError('コース別の集計データを取得できませんでした。')
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false)
        }
      })

    return () => {
      isMounted = false
    }
  }, [analyticsUseCases, selectedMonth, selectedYear])

  const handlePrint = () => {
    window.print()
  }

  const courseSummaries = useMemo(() => summarizeCourses(courses), [courses])
  const previousSummaries = useMemo(
    () => summarizeCourses(previousCourses),
    [previousCourses]
  )
  const chartData = useMemo(() => {
    const totalRevenue = courseSummaries.reduce((sum, course) => sum + course.revenue, 0)
    if (totalRevenue === 0) return []

    return courseSummaries
      .filter((course) => course.revenue > 0)
      .sort((a, b) => b.revenue - a.revenue)
      .map((course) => ({
        id: course.id,
        name: course.name,
        revenue: course.revenue,
        share: Number(((course.revenue / totalRevenue) * 100).toFixed(1)),
      }))
  }, [courseSummaries])

  const totalCourseSales = courseSummaries.reduce((sum, course) => sum + course.revenue, 0)
  const previousMonthCourseSales = previousSummaries.reduce(
    (sum, course) => sum + course.revenue,
    0
  )
  const totalBookings = courseSummaries.reduce((sum, course) => sum + course.totalBookings, 0)
  const courseCount = courseSummaries.length
  const activeCoursesCount = courseSummaries.filter((course) => course.totalBookings > 0).length
  const topCourse = courseSummaries.reduce<CourseSummary | null>((acc, course) => {
    if (!acc || course.revenue > acc.revenue) return course
    return acc
  }, null)
  const averagePrice =
    totalBookings > 0 ? Math.round(totalCourseSales / totalBookings) : 0

  const calculateGrowthRate = (current: number, previous: number) => {
    if (previous === 0) {
      return current === 0 ? 0 : 100
    }
    return ((current - previous) / previous) * 100
  }

  const salesGrowth = calculateGrowthRate(totalCourseSales, previousMonthCourseSales)
  const haveValues = !isLoading && !error && courseSummaries.length > 0

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
            <CardTitle className="text-sm font-medium">コース売上高</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {haveValues ? `¥${totalCourseSales.toLocaleString()}` : '--'}
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
            <div className="text-2xl font-bold">
              {haveValues ? `${totalBookings.toLocaleString()}件` : '--'}
            </div>
            <p className="text-xs text-muted-foreground">
              平均単価:{' '}
              {haveValues ? `¥${averagePrice.toLocaleString()}` : <span className="text-muted-foreground">--</span>}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">人気No.1コース</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="truncate text-sm font-bold">
              {haveValues ? topCourse?.name ?? '-' : '--'}
            </div>
            <p className="text-xs text-muted-foreground">
              売上:{' '}
              {haveValues && topCourse ? (
                `¥${topCourse.revenue.toLocaleString()}`
              ) : (
                <span className="text-muted-foreground">--</span>
              )}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">稼働コース数</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {haveValues ? `${activeCoursesCount} / ${courseCount}` : '--'}
            </div>
            <p className="text-xs text-muted-foreground">
              稼働率:{' '}
              {haveValues && courseCount > 0
                ? `${Math.round((activeCoursesCount / courseCount) * 100)}%`
                : '--'}
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
          <CourseSalesChart data={chartData} />
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
                courses={courses}
              />
            </TabsContent>
            <TabsContent value="ranking" className="mt-4">
              <CourseRankingTable current={courseSummaries} previous={previousSummaries} />
            </TabsContent>
            <TabsContent value="trend" className="mt-4">
              <CourseTrendTable series={trendSeries} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}

function summarizeCourses(courses: CourseSalesData[]): CourseSummary[] {
  return courses.map((course) => {
    const totalBookings = course.sales.reduce((sum, count) => sum + count, 0)
    return {
      id: course.id,
      name: course.name,
      duration: course.duration,
      price: course.price,
      totalBookings,
      revenue: totalBookings * course.price,
    }
  })
}

function buildTrailingMonths(year: number, month: number, count: number) {
  const months: { year: number; month: number }[] = []
  let currentYear = year
  let currentMonth = month

  for (let i = 0; i < count; i += 1) {
    months.push({ year: currentYear, month: currentMonth })
    currentMonth -= 1
    if (currentMonth === 0) {
      currentMonth = 12
      currentYear -= 1
    }
  }

  return months
}
