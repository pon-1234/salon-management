/**
 * @design_doc   docs/PREVIEW_UAT_CHECKLIST.md
 * @related_to   DailyReportUseCases, DailySalesCharts, and the store-scoped daily-report API
 * @known_issues Chart data still comes from the separate daily-sales API
 */
'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import type { DailyReport } from '@/lib/report/types'
import { DailyReportTable } from '@/components/analytics/daily-report-table'
import { DailySalesCharts } from '@/components/analytics/daily-sales-charts'
import { addDays, format, isValid, parseISO } from 'date-fns'
import { Button } from '@/components/ui/button'
import { RefreshCw } from 'lucide-react'
import { useStore } from '@/contexts/store-context'
import { PageLoading } from '@/components/ui/page-loading'
import { DailySalesUseCases } from '@/lib/daily-sales/usecases'
import { DailySalesRepositoryImpl } from '@/lib/daily-sales/repository-impl'

export function DailyReportPageClient() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [report, setReport] = useState<DailyReport | null>(null)
  const [hourlyData, setHourlyData] = useState<Array<{ hour: string; sales: number }>>([])
  const [weeklyData, setWeeklyData] = useState<Array<{ day: string; sales: number }>>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { currentStore } = useStore()

  const dailySalesUseCases = useMemo(() => {
    const repository = new DailySalesRepositoryImpl(currentStore.id)
    return new DailySalesUseCases(repository)
  }, [currentStore.id])

  const fetchCharts = useCallback(
    async (date: Date) => {
      try {
        const data = await dailySalesUseCases.getDailySales(date)
        setHourlyData(
          data.hourlyBreakdown?.map((entry) => ({
            hour: entry.hour,
            sales: entry.sales,
          })) ?? []
        )
        setWeeklyData(
          data.weeklyTrend?.map((entry) => ({
            day: entry.date,
            sales: entry.sales,
          })) ?? []
        )
      } catch (chartError) {
        console.error('Error fetching daily sales charts:', chartError)
        setHourlyData([])
        setWeeklyData([])
      }
    },
    [dailySalesUseCases]
  )

  const fetchReport = useCallback(
    async (date: Date) => {
      setIsLoading(true)
      setError(null)
      try {
        const formattedDate = format(date, 'yyyy-MM-dd')
        const params = new URLSearchParams({
          date: formattedDate,
          storeId: currentStore.id,
        })
        const response = await fetch(`/api/analytics/daily-report?${params.toString()}`, {
          credentials: 'include',
          cache: 'no-store',
        })
        if (!response.ok) {
          const payload: unknown = await response.json().catch(() => null)
          const message =
            payload &&
            typeof payload === 'object' &&
            'error' in payload &&
            typeof payload.error === 'string'
              ? payload.error
              : '日報データの取得に失敗しました。'
          throw new Error(message)
        }
        const dailyReport = (await response.json()) as DailyReport
        setReport(dailyReport)
        await fetchCharts(date)
      } catch (error) {
        console.error('Error fetching daily report:', error)
        setReport(null)
        setError(error instanceof Error ? error.message : '日報データの取得に失敗しました。')
      } finally {
        setIsLoading(false)
      }
    },
    [currentStore.id, fetchCharts]
  )

  useEffect(() => {
    fetchReport(selectedDate)
  }, [fetchReport, selectedDate])

  const handleRefresh = () => {
    fetchReport(selectedDate)
  }

  const handleDateInputChange = (value: string) => {
    const date = parseISO(value)
    if (isValid(date) && format(date, 'yyyy-MM-dd') === value) {
      setSelectedDate(date)
    }
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="mb-4 text-2xl font-bold">当日売上</h1>
      <p className="mb-4 text-sm text-muted-foreground">
        閲覧専用です。当日の売上とキャスト別実績を確認できます。過去日の予約修正は月間売上へ即時反映されるため、日報の確定操作はありません。
      </p>
      <div className="mb-6 flex flex-wrap items-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => setSelectedDate((date) => addDays(date, -1))}
        >
          前日
        </Button>
        <div className="space-y-1">
          <label htmlFor="daily-report-date" className="block text-sm font-medium">
            対象日
          </label>
          <input
            id="daily-report-date"
            aria-label="日報の日付"
            type="date"
            value={format(selectedDate, 'yyyy-MM-dd')}
            onChange={(event) => handleDateInputChange(event.target.value)}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={() => setSelectedDate((date) => addDays(date, 1))}
        >
          翌日
        </Button>
        <Button type="button" variant="outline" onClick={() => setSelectedDate(new Date())}>
          今日
        </Button>
        <Button onClick={handleRefresh} variant="outline" size="icon" aria-label="日報を再読み込み">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>
      {isLoading ? (
        <PageLoading compact label="日報を読み込んでいます" />
      ) : error ? (
        <div
          role="alert"
          aria-label="日報データの取得エラー"
          className="rounded-md border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive"
        >
          {error}
        </div>
      ) : report ? (
        <div className="space-y-6">
          <DailyReportTable report={report} />
          <DailySalesCharts hourlyData={hourlyData} weeklyData={weeklyData} />
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">表示できる日報がありません。</p>
      )}
    </div>
  )
}
