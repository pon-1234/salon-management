/**
 * @design_doc   Cast work performance backed by an accurate completed-reservation contract
 * @related_to   CastPerformanceReport and the store-scoped cast-performance analytics API
 * @known_issues Attendance hours are excluded because reservation dates are not attendance records
 */
'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { formatInTimeZone } from 'date-fns-tz'
import {
  AlertCircle,
  Banknote,
  CalendarDays,
  CreditCard,
  Heart,
  HelpCircle,
  Layers3,
  Loader2,
  ReceiptText,
  Repeat2,
  Sparkles,
  TrendingUp,
  UserPlus,
} from 'lucide-react'

import type { CastPerformanceReport } from '@/lib/types/cast-performance'
import { useStore } from '@/contexts/store-context'
import { buildStoreScopedEndpoint } from '@/lib/store/endpoints'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface WorkPerformanceTabProps {
  castId: string
  castName: string
  initialPerformance?: CastPerformanceReport
}

const formatCurrency = (amount: number) => `¥${amount.toLocaleString()}`
const JST_TIMEZONE = 'Asia/Tokyo'

export function getJstYearMonth(date: Date): { year: number; month: number } {
  return {
    year: Number(formatInTimeZone(date, JST_TIMEZONE, 'yyyy')),
    month: Number(formatInTimeZone(date, JST_TIMEZONE, 'M')),
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null
const isNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value)
const isCount = (value: unknown): value is number =>
  isNumber(value) && Number.isInteger(value) && value >= 0
const isNullableNumber = (value: unknown): value is number | null =>
  value === null || isNumber(value)

const isCountAmount = (value: unknown) =>
  isRecord(value) && isCount(value.count) && isNumber(value.amount)

const isCoursePerformance = (value: unknown) =>
  isRecord(value) &&
  typeof value.id === 'string' &&
  typeof value.name === 'string' &&
  isCount(value.count) &&
  isNumber(value.reservationSales)

const isOptionPerformance = (value: unknown) =>
  isRecord(value) &&
  typeof value.id === 'string' &&
  typeof value.name === 'string' &&
  isCount(value.count) &&
  isNumber(value.sales) &&
  isNumber(value.selectionRate) &&
  value.selectionRate >= 0 &&
  value.selectionRate <= 100

const isCastPerformanceReport = (value: unknown): value is CastPerformanceReport => {
  if (
    !isRecord(value) ||
    !isRecord(value.cast) ||
    typeof value.cast.id !== 'string' ||
    typeof value.cast.name !== 'string' ||
    !isRecord(value.period) ||
    !isCount(value.period.year) ||
    !isCount(value.period.month) ||
    value.period.month < 1 ||
    value.period.month > 12 ||
    value.period.timeZone !== JST_TIMEZONE ||
    !isCount(value.completedReservations) ||
    !isCount(value.reservationDays) ||
    !isNumber(value.totalSales) ||
    !isNullableNumber(value.staffRevenue) ||
    !isNullableNumber(value.storeRevenue) ||
    !isRecord(value.missingRevenue) ||
    !isCount(value.missingRevenue.staff) ||
    !isCount(value.missingRevenue.store) ||
    !isRecord(value.payments) ||
    !isCountAmount(value.payments.cash) ||
    !isCountAmount(value.payments.card) ||
    !isCountAmount(value.payments.unclassified) ||
    !isRecord(value.customers) ||
    !isCount(value.customers.new) ||
    !isCount(value.customers.storeRepeat) ||
    !isCount(value.customers.returningRegular) ||
    !isCount(value.customers.unclassified) ||
    !isRecord(value.designations) ||
    !isCount(value.designations.regular) ||
    !isCount(value.designations.free) ||
    !isCount(value.designations.none) ||
    !isCount(value.designations.unclassified) ||
    !isRecord(value.marketing) ||
    !isCount(value.marketing.princess) ||
    !isCount(value.marketing.other) ||
    !isCount(value.marketing.unclassified) ||
    !Array.isArray(value.courses) ||
    !value.courses.every(isCoursePerformance) ||
    !Array.isArray(value.options) ||
    !value.options.every(isOptionPerformance)
  ) {
    return false
  }
  return true
}

export function WorkPerformanceTab({
  castId,
  castName,
  initialPerformance,
}: WorkPerformanceTabProps) {
  if (initialPerformance) {
    return <PerformanceLayout castName={castName} performance={initialPerformance} />
  }
  return <AdminPerformanceLoader castId={castId} castName={castName} />
}

function AdminPerformanceLoader({
  castId,
  castName,
}: Omit<WorkPerformanceTabProps, 'initialPerformance'>) {
  const { currentStore } = useStore()
  const { year, month } = getJstYearMonth(new Date())
  const [performance, setPerformance] = useState<CastPerformanceReport | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    let ignore = false

    const load = async () => {
      setIsLoading(true)
      setError(null)
      setPerformance(null)

      try {
        const endpoint = buildStoreScopedEndpoint(
          `/api/analytics/cast-performance?castId=${encodeURIComponent(castId)}&year=${year}&month=${month}`,
          currentStore.id
        )
        const response = await fetch(endpoint, { cache: 'no-store' })
        if (!response.ok) {
          const payload = await response.json().catch(() => ({}))
          throw new Error(payload.error ?? payload.message ?? '就業成績の取得に失敗しました。')
        }

        const payload: unknown = await response.json()
        if (
          !isCastPerformanceReport(payload) ||
          payload.cast.id !== castId ||
          payload.period.year !== year ||
          payload.period.month !== month
        ) {
          throw new Error('就業成績の応答形式が不正です。')
        }
        if (!ignore) setPerformance(payload)
      } catch (caught) {
        if (!ignore) {
          setError(caught instanceof Error ? caught.message : '就業成績の取得に失敗しました。')
        }
      } finally {
        if (!ignore) setIsLoading(false)
      }
    }

    void load()
    return () => {
      ignore = true
    }
  }, [castId, currentStore.id, month, year])

  if (isLoading) {
    return (
      <StatusLayout castName={castName} year={year} month={month}>
        <Loader2 className="h-4 w-4 animate-spin" />
        就業成績を読み込んでいます...
      </StatusLayout>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <PerformanceHeader castName={castName} year={year} month={month} />
        <Card role="alert" className="border-destructive/40 bg-destructive/5">
          <CardContent className="flex items-center gap-2 py-6 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </CardContent>
        </Card>
      </div>
    )
  }

  return performance ? (
    <PerformanceLayout castName={castName} performance={performance} />
  ) : (
    <StatusLayout castName={castName} year={year} month={month}>
      <HelpCircle className="h-4 w-4" />
      今月の実績データはありません
    </StatusLayout>
  )
}

function PerformanceLayout({
  castName,
  performance,
}: {
  castName: string
  performance: CastPerformanceReport
}) {
  return (
    <div className="space-y-6">
      <PerformanceHeader
        castName={castName}
        year={performance.period.year}
        month={performance.period.month}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          icon={ReceiptText}
          label="完了予約"
          value={`${performance.completedReservations.toLocaleString()}本`}
        />
        <MetricCard
          icon={CalendarDays}
          label="予約実績日"
          value={`${performance.reservationDays.toLocaleString()}日`}
        />
        <MetricCard
          icon={TrendingUp}
          label="総売上"
          value={formatCurrency(performance.totalSales)}
        />
        <MetricCard
          icon={Sparkles}
          label="キャスト売上"
          value={formatKnownRevenue(performance.staffRevenue, performance.missingRevenue.staff)}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <BreakdownCard title="顧客区分">
          <ValueRow icon={UserPlus} label="新規" value={performance.customers.new} />
          <ValueRow icon={Repeat2} label="店リピ" value={performance.customers.storeRepeat} />
          <ValueRow
            icon={Sparkles}
            label="本指名再来"
            value={performance.customers.returningRegular}
          />
          <ValueRow
            icon={HelpCircle}
            label="顧客未分類"
            value={performance.customers.unclassified}
          />
        </BreakdownCard>

        <BreakdownCard title="指名区分">
          <ValueRow icon={Sparkles} label="本指名" value={performance.designations.regular} />
          <ValueRow icon={Layers3} label="フリー指名" value={performance.designations.free} />
          <ValueRow icon={ReceiptText} label="指名なし" value={performance.designations.none} />
          <ValueRow
            icon={HelpCircle}
            label="指名未分類"
            value={performance.designations.unclassified}
          />
        </BreakdownCard>

        <BreakdownCard title="受付媒体">
          <ValueRow icon={Heart} label="姫予約" value={performance.marketing.princess} />
          <ValueRow icon={ReceiptText} label="その他" value={performance.marketing.other} />
          <ValueRow
            icon={HelpCircle}
            label="媒体未分類"
            value={performance.marketing.unclassified}
          />
          <p className="text-xs text-muted-foreground">
            旧システムの media 番号だけでは媒体を推測せず、未分類として表示します。
          </p>
        </BreakdownCard>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <BreakdownCard title="決済方法">
          <ValueRow
            icon={Banknote}
            label="現金"
            value={performance.payments.cash.count}
            helper={formatCurrency(performance.payments.cash.amount)}
          />
          <ValueRow
            icon={CreditCard}
            label="カード"
            value={performance.payments.card.count}
            helper={formatCurrency(performance.payments.card.amount)}
          />
          <ValueRow
            icon={HelpCircle}
            label="決済未分類"
            value={performance.payments.unclassified.count}
            helper={formatCurrency(performance.payments.unclassified.amount)}
          />
        </BreakdownCard>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">売上配分</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <RevenueValue
              label="キャスト売上"
              value={performance.staffRevenue}
              missingCount={performance.missingRevenue.staff}
            />
            <RevenueValue
              label="店舗売上"
              value={performance.storeRevenue}
              missingCount={performance.missingRevenue.store}
            />
          </CardContent>
        </Card>
      </div>

      <CourseBreakdown performance={performance} />
      <OptionBreakdown performance={performance} />
    </div>
  )
}

function PerformanceHeader({
  castName,
  year,
  month,
}: {
  castName: string
  year: number
  month: number
}) {
  return (
    <div>
      <h2 className="text-2xl font-bold">{castName}さんの就業成績</h2>
      <p className="text-sm text-muted-foreground">
        {year}年{month}月の完了予約実績
      </p>
    </div>
  )
}

function CourseBreakdown({ performance }: { performance: CastPerformanceReport }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">コース別実績</CardTitle>
      </CardHeader>
      <CardContent>
        {performance.courses.length === 0 ? (
          <EmptyBreakdown>完了予約のコース実績はありません</EmptyBreakdown>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>コース</TableHead>
                <TableHead className="text-right">本数</TableHead>
                <TableHead className="text-right">予約売上</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {performance.courses.map((course) => (
                <TableRow key={course.id}>
                  <TableCell className="font-medium">{course.name}</TableCell>
                  <TableCell className="text-right">{course.count.toLocaleString()}本</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(course.reservationSales)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}

function OptionBreakdown({ performance }: { performance: CastPerformanceReport }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">オプション別実績</CardTitle>
        <p className="text-xs text-muted-foreground">
          選択率は当月の完了予約 {performance.completedReservations.toLocaleString()}{' '}
          本に対する割合です。
        </p>
      </CardHeader>
      <CardContent>
        {performance.options.length === 0 ? (
          <EmptyBreakdown>完了予約のオプション実績はありません</EmptyBreakdown>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>オプション</TableHead>
                <TableHead className="text-right">本数</TableHead>
                <TableHead className="text-right">選択率</TableHead>
                <TableHead className="text-right">売上</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {performance.options.map((option) => (
                <TableRow key={option.id}>
                  <TableCell className="font-medium">{option.name}</TableCell>
                  <TableCell className="text-right">{option.count.toLocaleString()}本</TableCell>
                  <TableCell className="text-right">
                    {option.selectionRate.toLocaleString()}%
                  </TableCell>
                  <TableCell className="text-right">{formatCurrency(option.sales)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  )
}

function MetricCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof ReceiptText
  label: string
  value: string
}) {
  return (
    <Card data-slot="card">
      <CardContent className="p-4">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-primary" />
          <div>
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            <p className="text-2xl font-bold">{value}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function BreakdownCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
    </Card>
  )
}

function ValueRow({
  icon: Icon,
  label,
  value,
  helper,
}: {
  icon: typeof ReceiptText
  label: string
  value: number
  helper?: string
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 text-sm">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span>{label}</span>
      </div>
      <div className="text-right">
        <span className="font-medium">{value.toLocaleString()}本</span>
        {helper ? <div className="text-xs text-muted-foreground">{helper}</div> : null}
      </div>
    </div>
  )
}

function formatKnownRevenue(value: number | null, missingCount: number): string {
  return value === null ? `未集計（${missingCount}件）` : formatCurrency(value)
}

function RevenueValue({
  label,
  value,
  missingCount,
}: {
  label: string
  value: number | null
  missingCount: number
}) {
  return (
    <div>
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="text-xl font-semibold">{formatKnownRevenue(value, missingCount)}</div>
    </div>
  )
}

function StatusLayout({
  castName,
  year,
  month,
  children,
}: {
  castName: string
  year: number
  month: number
  children: ReactNode
}) {
  return (
    <div className="space-y-6">
      <PerformanceHeader castName={castName} year={year} month={month} />
      <Card>
        <CardContent className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
          {children}
        </CardContent>
      </Card>
    </div>
  )
}

function EmptyBreakdown({ children }: { children: ReactNode }) {
  return <div className="py-8 text-center text-sm text-muted-foreground">{children}</div>
}
