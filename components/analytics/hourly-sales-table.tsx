import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { HourlySalesReport } from '@/lib/types/hourly-sales'
import { cn } from '@/lib/utils'

const TIME_BUCKETS = [
  { key: 'morning', label: 'モーニング', range: '7-12時', start: 7, end: 12, accent: 'bg-amber-400' },
  { key: 'daytime', label: 'デイタイム', range: '12-18時', start: 12, end: 18, accent: 'bg-sky-400' },
  { key: 'evening', label: 'イブニング', range: '18-22時', start: 18, end: 22, accent: 'bg-violet-400' },
  { key: 'late', label: 'レイト', range: '22-28時', start: 22, end: 28, accent: 'bg-emerald-400' },
] as const

const WEEKEND_DAYS = new Set(['土', '日'])

function sumBucket(hours: number[], startHour: number, endHour: number) {
  let total = 0
  for (let hour = startHour; hour < endHour; hour += 1) {
    const index = hour - 7
    if (index >= 0 && index < hours.length) {
      total += hours[index] ?? 0
    }
  }
  return total
}

function formatPeople(value: number) {
  if (Number.isNaN(value)) return '0'
  return Number.isInteger(value)
    ? value.toLocaleString()
    : value.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })
}

function formatSigned(value: number, unit = '') {
  if (value === 0) return `±0${unit}`
  const sign = value > 0 ? '+' : '-'
  const absValue = Math.abs(value)
  const formatted =
    absValue % 1 === 0
      ? absValue.toLocaleString()
      : absValue.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })
  return `${sign}${formatted}${unit}`
}

interface HourlySalesTableProps {
  data: HourlySalesReport
}

export function HourlySalesTable({ data }: HourlySalesTableProps) {
  const days = data.data

  if (!days.length || data.grandTotal === 0) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
        データがありません。
      </div>
    )
  }

  const averageDailyVisitors =
    days.length > 0 ? data.grandTotal / days.length : 0

  const bucketTotals = TIME_BUCKETS.map((bucket) => {
    const total = days.reduce(
      (sum, day) => sum + sumBucket(day.hours, bucket.start, bucket.end),
      0
    )
    const ratio =
      data.grandTotal > 0 ? Math.round((total / data.grandTotal) * 1000) / 10 : 0

    return { ...bucket, total, ratio }
  })

  const overallPeakSlot =
    data.timeSlots.reduce(
      (acc, slot) => (slot.count > acc.count ? slot : acc),
      { range: '--', count: 0, percentage: 0 }
    ) ?? { range: '--', count: 0, percentage: 0 }

  const averagePerHour =
    data.hourlyTotals.length > 0
      ? data.grandTotal / data.hourlyTotals.length
      : 0

  const rows = days.map((day) => {
    const bucketDetails = TIME_BUCKETS.map((bucket) => {
      const total = sumBucket(day.hours, bucket.start, bucket.end)
      const ratio = day.total > 0 ? Math.round((total / day.total) * 1000) / 10 : 0
      return { ...bucket, total, ratio }
    })

    const peak = day.hours.reduce(
      (acc, value, index) =>
        value > acc.value ? { value, index } : acc,
      { value: 0, index: -1 }
    )

    const peakRange =
      peak.index >= 0
        ? `${peak.index + 7}:00-${peak.index + 8}:00`
        : '--'

    const averagePerDayHour =
      day.hours.length > 0 ? day.total / day.hours.length : 0

    const dateLabel = `${String(data.month).padStart(2, '0')}/${String(day.date).padStart(2, '0')}`
    const isWeekend = WEEKEND_DAYS.has(day.dayOfWeek)

    return {
      key: `${day.date}`,
      dateLabel,
      dayOfWeek: day.dayOfWeek,
      total: day.total,
      bucketDetails,
      peakRange,
      peakCount: peak.value,
      averagePerHour: averagePerDayHour,
      isWeekend,
    }
  })

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <Table className="min-w-[720px]">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[140px]">日付</TableHead>
              <TableHead className="w-[140px] text-right">総来客数</TableHead>
              {TIME_BUCKETS.map((bucket) => (
                <TableHead key={bucket.key}>
                  <div className="flex flex-col">
                    <span>{bucket.label}</span>
                    <span className="text-xs text-muted-foreground">{bucket.range}</span>
                  </div>
                </TableHead>
              ))}
              <TableHead className="w-[140px]">ピーク帯</TableHead>
              <TableHead className="w-[120px] text-right">平均/時</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow
                key={row.key}
                className={cn(
                  'align-top',
                  row.isWeekend && 'bg-amber-50/60 hover:bg-amber-50'
                )}
              >
                <TableCell className="whitespace-nowrap">
                  <div className="flex items-center gap-2 font-medium">
                    <span>{row.dateLabel}</span>
                    <Badge
                      variant={row.isWeekend ? 'destructive' : 'secondary'}
                      className="text-xs uppercase tracking-wide"
                    >
                      {row.dayOfWeek}
                    </Badge>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="text-lg font-semibold">
                    {row.total.toLocaleString()}人
                  </div>
                  <div className="text-xs text-muted-foreground">
                    平均比 {formatSigned(row.total - averageDailyVisitors, '人')}
                  </div>
                </TableCell>
                {row.bucketDetails.map((bucket) => (
                  <TableCell key={bucket.key} className="align-top">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{bucket.total.toLocaleString()}人</span>
                      <span className="text-xs text-muted-foreground">{bucket.ratio.toFixed(1)}%</span>
                    </div>
                    <div className="mt-2 h-1.5 rounded-full bg-muted">
                      <div
                        className={cn('h-full rounded-full', bucket.accent)}
                        style={{ width: `${Math.min(100, Math.max(0, bucket.ratio))}%` }}
                      />
                    </div>
                  </TableCell>
                ))}
                <TableCell className="align-top">
                  <div className="font-medium">{row.peakRange}</div>
                  <div className="text-xs text-muted-foreground">{row.peakCount.toLocaleString()}人</div>
                </TableCell>
                <TableCell className="text-right">
                  <div className="text-lg font-semibold">
                    {formatPeople(row.averagePerHour)}人
                  </div>
                  <div className="text-xs text-muted-foreground">平均/時</div>
                </TableCell>
              </TableRow>
            ))}
            <TableRow className="bg-muted/40 font-semibold">
              <TableCell>合計 / 平均</TableCell>
              <TableCell className="text-right">
                <div className="text-lg font-semibold">
                  {data.grandTotal.toLocaleString()}人
                </div>
                <div className="text-xs text-muted-foreground">
                  平均 {formatPeople(averageDailyVisitors)}人/日
                </div>
              </TableCell>
              {bucketTotals.map((bucket) => (
                <TableCell key={bucket.key}>
                  <div className="flex items-center justify-between text-sm">
                    <span>{bucket.total.toLocaleString()}人</span>
                    <span className="text-xs text-muted-foreground">
                      {bucket.ratio.toFixed(1)}%
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 rounded-full bg-muted">
                    <div
                      className={cn('h-full rounded-full', bucket.accent)}
                      style={{ width: `${Math.min(100, Math.max(0, bucket.ratio))}%` }}
                    />
                  </div>
                </TableCell>
              ))}
              <TableCell>
                <div className="font-medium">{overallPeakSlot.range}</div>
                <div className="text-xs text-muted-foreground">
                  {overallPeakSlot.count.toLocaleString()}人
                </div>
              </TableCell>
              <TableCell className="text-right">
                <div className="text-lg font-semibold">
                  {formatPeople(averagePerHour)}人
                </div>
                <div className="text-xs text-muted-foreground">全時間平均</div>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
      {data.timeSlots.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="font-semibold uppercase tracking-wide">時間帯比率</span>
          {data.timeSlots.map((slot) => (
            <span
              key={slot.range}
              className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-1"
            >
              <span className="font-medium text-foreground">{slot.range}</span>
              <span>{slot.percentage}%</span>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
