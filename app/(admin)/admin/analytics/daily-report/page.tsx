'use client'

import { useCallback, useEffect, useState } from 'react'
import { DailyReport } from '@/lib/report/types'
import { DailyReportTable } from '@/components/analytics/daily-report-table'
import { DatePicker } from '@/components/ui/date-picker'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { RefreshCw } from 'lucide-react'
import { useStore } from '@/contexts/store-context'

export default function DailyReportPage() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [report, setReport] = useState<DailyReport | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const { currentStore } = useStore()

  const fetchReport = useCallback(
    async (date: Date) => {
      setIsLoading(true)
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
          throw new Error(`Failed to fetch daily report: ${response.statusText}`)
        }
        const dailyReport = (await response.json()) as DailyReport
        setReport(dailyReport)
      } catch (error) {
        console.error('Error fetching daily report:', error)
        setReport(null)
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

  return (
    <div className="container mx-auto py-8">
      <h1 className="mb-4 text-2xl font-bold">日報</h1>
      <div className="mb-6 flex items-center gap-4">
        <DatePicker selected={selectedDate} onSelect={(date) => date && setSelectedDate(date)} />
        <Button onClick={handleRefresh} variant="outline" size="icon">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>
      {isLoading ? (
        <p>Loading...</p>
      ) : report ? (
        <DailyReportTable report={report} />
      ) : (
        <p>No data available</p>
      )}
    </div>
  )
}
