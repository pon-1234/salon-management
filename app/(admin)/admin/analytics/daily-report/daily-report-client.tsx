/**
 * @design_doc   docs/PREVIEW_UAT_CHECKLIST.md
 * @related_to   DailyReportUseCases and the store-scoped daily-report API
 * @known_issues None
 */
'use client'

import { useCallback, useEffect, useState } from 'react'
import type { DailyReport } from '@/lib/report/types'
import { DailyReportTable } from '@/components/analytics/daily-report-table'
import { addDays, format, isValid, parseISO } from 'date-fns'
import { Button } from '@/components/ui/button'
import { RefreshCw } from 'lucide-react'
import { useStore } from '@/contexts/store-context'
import { PageLoading } from '@/components/ui/page-loading'

export function DailyReportPageClient() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [report, setReport] = useState<DailyReport | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { currentStore } = useStore()

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
      } catch (error) {
        console.error('Error fetching daily report:', error)
        setReport(null)
        setError(error instanceof Error ? error.message : '日報データの取得に失敗しました。')
      } finally {
        setIsLoading(false)
      }
    },
    [currentStore.id]
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
      <h1 className="mb-4 text-2xl font-bold">日報</h1>
      <p className="mb-4 text-sm text-muted-foreground">
        営業日は5:30から翌5:30までです。完了予約の現金/カード、値引き、ホテル、厚生費、店舗売上、手取りと出勤時間を表示します。
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
        <DailyReportTable report={report} />
      ) : (
        <p className="text-sm text-muted-foreground">表示できる日報がありません。</p>
      )}
    </div>
  )
}
