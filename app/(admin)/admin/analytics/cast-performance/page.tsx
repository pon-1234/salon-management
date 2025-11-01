'use client'

import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Printer,
  Sparkles,
  AlertTriangle,
  RotateCcw,
  Users,
} from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CastPerformanceTable } from '@/components/analytics/cast-performance-table'
import { AnalyticsUseCases } from '@/lib/analytics/usecases'
import { AnalyticsRepositoryImpl } from '@/lib/analytics/repository'

const analyticsRepository = new AnalyticsRepositoryImpl()
const analyticsUseCases = new AnalyticsUseCases(analyticsRepository)

export default function CastPerformancePage() {
  const now = new Date()
  const defaultYear = now.getFullYear()
  const defaultMonth = now.getMonth() + 1

  const [selectedYear, setSelectedYear] = useState(defaultYear)
  const [selectedMonth, setSelectedMonth] = useState(defaultMonth)
  const [displayType, setDisplayType] = useState('全て表示')
  const [selectedCast, setSelectedCast] = useState('')

  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i)
  const months = Array.from({ length: 12 }, (_, i) => i + 1)
  const displayTypes = ['全て表示', '出勤のみ', '休みのみ']
  const castList = ['----------', 'きょうか', 'れいな', 'はるひ']

  const handlePrint = () => {
    window.print()
  }

  const handleResetFilters = () => {
    setSelectedYear(defaultYear)
    setSelectedMonth(defaultMonth)
    setDisplayType('全て表示')
    setSelectedCast('')
  }

  const periodLabel = useMemo(
    () => `${selectedYear}年${selectedMonth}月`,
    [selectedMonth, selectedYear]
  )

  const castFilterActive = selectedCast !== '' && selectedCast !== '----------'
  const selectedCastLabel = castFilterActive ? selectedCast : '全キャスト'
  const hasCustomFilters =
    displayType !== '全て表示' ||
    castFilterActive ||
    selectedYear !== defaultYear ||
    selectedMonth !== defaultMonth

  const lastUpdated = useMemo(() => new Date(), [])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-4">
          <h1 className="text-2xl font-bold">キャスト実績</h1>
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
            <Select value={displayType} onValueChange={setDisplayType}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {displayTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedCast} onValueChange={setSelectedCast}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="キャスト：" />
              </SelectTrigger>
              <SelectContent>
                {castList.map((cast) => (
                  <SelectItem key={cast} value={cast}>
                    {cast}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          {hasCustomFilters && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetFilters}
              className="flex items-center gap-1"
            >
              <RotateCcw className="h-4 w-4" />
              条件をリセット
            </Button>
          )}
          <Button
            onClick={handlePrint}
            className="bg-emerald-600 text-white hover:bg-emerald-700"
          >
            <Printer className="mr-2 h-4 w-4" />
            印刷する
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
        <span>対象期間: {periodLabel}</span>
        <span>表示: {displayType}</span>
        <span>キャスト: {selectedCastLabel}</span>
        <span>
          最終更新:{' '}
          {lastUpdated.toLocaleDateString('ja-JP', {
            year: 'numeric',
            month: 'numeric',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </span>
      </div>

      <div className="rounded-md border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-700">
        ※ 厚生費は未払いも含めて全て表示しています
      </div>

      <CastPerformanceTable analyticsUseCases={analyticsUseCases} />
    </div>
  )
}
