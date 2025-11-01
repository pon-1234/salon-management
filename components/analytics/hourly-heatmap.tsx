'use client'

import { Fragment } from 'react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { HourlySalesReport } from '@/lib/types/hourly-sales'
import { cn } from '@/lib/utils'

interface HourlyHeatmapProps {
  data: HourlySalesReport
}

export function HourlyHeatmap({ data }: HourlyHeatmapProps) {
  const daysOfWeekOrder = ['月', '火', '水', '木', '金', '土', '日'] as const
  const hours = Array.from({ length: 21 }, (_, i) => i + 7)

  if (!data.data.length) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
        データがありません。
      </div>
    )
  }

  // 曜日別に集計
  const daySummaries = daysOfWeekOrder.map((day) => {
    const entries = data.data.filter((d) => d.dayOfWeek === day)
    const totals = Array.from({ length: hours.length }, () => 0)

    entries.forEach((entry) => {
      entry.hours.forEach((value, index) => {
        totals[index] += value
      })
    })

    const totalVisitors = entries.reduce((sum, entry) => sum + entry.total, 0)
    const averageVisitors =
      entries.length > 0 ? Math.round((totalVisitors / entries.length) * 10) / 10 : 0

    return {
      day,
      entries,
      totals,
      averageVisitors,
      totalVisitors,
    }
  })

  const flattened = daySummaries.flatMap((summary) => summary.totals)
  const maxValue = flattened.length > 0 ? Math.max(...flattened) : 0

  const getCellClasses = (value: number) => {
    if (value === 0 || maxValue === 0) {
      return 'bg-muted text-muted-foreground/70'
    }
    const ratio = value / maxValue
    if (ratio >= 0.9) return 'bg-emerald-600 text-white'
    if (ratio >= 0.7) return 'bg-emerald-500 text-white'
    if (ratio >= 0.5) return 'bg-emerald-400 text-emerald-950'
    if (ratio >= 0.3) return 'bg-emerald-200 text-emerald-900'
    return 'bg-emerald-100 text-emerald-800'
  }

  const peakByDay = daySummaries.map((summary) => {
    const totalsWithIndex = summary.totals.map((value, index) => ({ value, index }))
    const peak = totalsWithIndex.reduce(
      (acc, current) => (current.value > acc.value ? current : acc),
      { value: 0, index: 0 }
    )
    return {
      day: summary.day,
      value: peak.value,
      range: `${peak.index + 7}:00-${peak.index + 8}:00`,
    }
  })

  const highestPeak = peakByDay.reduce(
    (acc, current) => (current.value > acc.value ? current : acc),
    peakByDay[0] ?? { day: '', value: 0, range: '--' }
  )

  const lowestPeak = peakByDay.reduce(
    (acc, current) => (current.value < acc.value ? current : acc),
    peakByDay[0] ?? { day: '', value: 0, range: '--' }
  )

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold">ピーク帯サマリー</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-border/60 bg-muted/10 p-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">ピーク帯が最も強い曜日</p>
              <Badge variant="secondary">{highestPeak.range}</Badge>
            </div>
            <p className="text-sm font-semibold">
              {highestPeak.day}曜日 · {highestPeak.value.toLocaleString()}人
            </p>
          </div>
          <div className="rounded-lg border border-border/60 bg-muted/10 p-3">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">ピーク帯が弱い曜日</p>
              <Badge variant="outline">{lowestPeak.range}</Badge>
            </div>
            <p className="text-sm font-semibold">
              {lowestPeak.day}曜日 · {lowestPeak.value.toLocaleString()}人
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="overflow-x-auto">
        <div className="inline-grid min-w-full grid-cols-[96px_repeat(21,minmax(46px,1fr))] gap-1 text-[11px] md:text-xs">
          <div className="h-12 rounded-md bg-muted px-2 py-3 text-left font-medium text-muted-foreground">
            曜日
          </div>
          {hours.map((hour) => (
            <div
              key={`header-${hour}`}
              className="flex h-12 items-center justify-center rounded-md bg-muted text-xs font-medium text-muted-foreground"
            >
              {hour}時
            </div>
          ))}

          {daySummaries.map((summary) => (
            <Fragment key={summary.day}>
              <div className="flex h-[70px] flex-col justify-center gap-1 rounded-md bg-muted/60 px-3 py-2 text-xs font-medium text-muted-foreground">
                <div className="flex items-center gap-2">
                  <span>{summary.day}曜日</span>
                  {summary.day === '土' || summary.day === '日' ? (
                    <Badge variant="destructive" className="rounded-sm text-[10px] uppercase">
                      weekend
                    </Badge>
                  ) : null}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  平均 {summary.averageVisitors.toLocaleString()}人 / 日
                </div>
              </div>
              {summary.totals.map((value, index) => (
                <div
                  key={`${summary.day}-${hours[index]}`}
                  className={cn(
                    'flex h-[70px] flex-col items-center justify-center rounded-md border border-border/40 text-[11px] font-medium transition',
                    getCellClasses(value)
                  )}
                >
                  <span>{value > 0 ? value : '-'}</span>
                  <span className="text-[10px] text-white/80">
                    {hours[index]}時
                  </span>
                </div>
              ))}
            </Fragment>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <span className="font-semibold uppercase tracking-wide">凡例</span>
        <div className="flex items-center gap-1">
          <span className="h-3 w-3 rounded-full bg-muted" />
          <span>データなし</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="h-3 w-3 rounded-full bg-emerald-100" />
          <span>少ない</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="h-3 w-3 rounded-full bg-emerald-400" />
          <span>平均的</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="h-3 w-3 rounded-full bg-emerald-600" />
          <span>非常に多い</span>
        </div>
      </div>
    </div>
  )
}
