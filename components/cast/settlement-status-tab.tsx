'use client'

import { useCallback, useEffect, useMemo, useState, useTransition } from 'react'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { ChevronDown, Loader2, PiggyBank, Receipt } from 'lucide-react'
import type { CastSettlementsData } from '@/lib/cast-portal/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'

interface SettlementStatusTabProps {
  castId: string
  castName: string
}

const settlementStatusStyles = {
  pending: 'border-amber-200 bg-amber-50 text-amber-700',
  partial: 'border-blue-200 bg-blue-50 text-blue-700',
  settled: 'border-emerald-200 bg-emerald-50 text-emerald-700',
} as const

export function SettlementStatusTab({ castId }: SettlementStatusTabProps) {
  const [data, setData] = useState<CastSettlementsData | null>(null)
  const [isPending, startTransition] = useTransition()
  const [expandedDates, setExpandedDates] = useState<Record<string, boolean>>({})
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    const response = await fetch(
      `/api/admin/cast/settlements?castId=${encodeURIComponent(castId)}`,
      { cache: 'no-store' }
    )

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}))
      throw new Error(payload.error ?? '精算情報の取得に失敗しました。')
    }

    return (await response.json()) as CastSettlementsData
  }, [castId])

  useEffect(() => {
    let ignore = false

    const load = async () => {
      setError(null)
      startTransition(async () => {
        try {
          const payload = await fetchData()
          if (!ignore) {
            setData(payload)
          }
        } catch (err) {
          if (!ignore) {
            setError(err instanceof Error ? err.message : '精算情報の取得に失敗しました。')
          }
        }
      })
    }

    load()

    return () => {
      ignore = true
    }
  }, [fetchData])

  const toggleDay = useCallback((date: string) => {
    setExpandedDates((prev) => ({
      ...prev,
      [date]: !prev[date],
    }))
  }, [])

  const settlementStats = useMemo(() => {
    if (!data) return null

    const records = data.days.flatMap((day) => day.records)
    const netSum = (targets: typeof records) =>
      targets.reduce(
        (sum, record) => sum + Math.max(record.staffRevenue - record.welfareExpense, 0),
        0
      )

    const inProgress = records.filter((record) => record.settlementStatus !== 'settled')
    const settled = records.filter((record) => record.settlementStatus === 'settled')

    return {
      takeHome: Math.max(data.summary.staffRevenue - data.summary.welfareExpense, 0),
      staffRevenue: data.summary.staffRevenue,
      welfareExpense: data.summary.welfareExpense,
      inProgressAmount: netSum(inProgress),
      settledAmount: netSum(settled),
      inProgressCount: inProgress.length,
      settledCount: settled.length,
    }
  }, [data])

  if (!data) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
          {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {error ?? '精算情報を読み込み中...'}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold">精算状況</h2>
          <p className="text-sm text-muted-foreground">
            当月の精算状況と日別の内訳を確認できます。
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            startTransition(async () => {
              try {
                const payload = await fetchData()
                setData(payload)
              } catch (err) {
                setError(err instanceof Error ? err.message : '精算情報の取得に失敗しました。')
              }
            })
          }
          disabled={isPending}
        >
          {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          更新
        </Button>
      </div>

      {settlementStats ? (
        <div className="grid gap-4 md:grid-cols-3">
          <SummaryTile
            icon={PiggyBank}
            title="今月の手取り見込み"
            value={`¥${settlementStats.takeHome.toLocaleString()}`}
            helper={`キャスト売上 ¥${settlementStats.staffRevenue.toLocaleString()} ／ 厚生費 ¥${settlementStats.welfareExpense.toLocaleString()}`}
          />
          <SummaryTile
            icon={Receipt}
            title="未精算・一部"
            value={`¥${settlementStats.inProgressAmount.toLocaleString()}`}
            helper={`件数 ${settlementStats.inProgressCount} 件`}
            tone="warning"
          />
          <SummaryTile
            icon={Receipt}
            title="精算済み"
            value={`¥${settlementStats.settledAmount.toLocaleString()}`}
            helper={`件数 ${settlementStats.settledCount} 件`}
            tone="success"
          />
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">日別の精算内訳</CardTitle>
          <p className="text-sm text-muted-foreground">
            日付ごとにコース本数・オプション・手取り金額を表で確認できます。
          </p>
        </CardHeader>
        <CardContent>
          {data.days.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              今月の精算データはまだありません。
            </p>
          ) : (
            <div className="divide-y rounded-md border">
              <div className="grid grid-cols-[1.5fr_repeat(2,_1fr)_auto] gap-3 bg-muted/40 px-4 py-2 text-xs font-medium text-muted-foreground">
                <span>日付</span>
                <span className="text-right">売上合計</span>
                <span className="text-right">本数</span>
                <span className="text-right">詳細</span>
              </div>
              {data.days.map((day) => (
                <DayRow
                  key={day.date}
                  day={day}
                  isExpanded={Boolean(expandedDates[day.date])}
                  onToggle={() => toggleDay(day.date)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function DayRow({
  day,
  isExpanded,
  onToggle,
}: {
  day: CastSettlementsData['days'][number]
  isExpanded: boolean
  onToggle: () => void
}) {
  const dayLabel = useMemo(
    () => format(new Date(`${day.date}T00:00:00`), 'M月d日(E)', { locale: ja }),
    [day.date]
  )
  const dayStatus = useMemo(() => {
    const inProgress = day.records.filter((record) => record.settlementStatus !== 'settled')
    const settled = day.records.filter((record) => record.settlementStatus === 'settled')
    const netSum = (targets: typeof day.records) =>
      targets.reduce(
        (sum, record) => sum + Math.max(record.staffRevenue - record.welfareExpense, 0),
        0
      )

    return {
      inProgressCount: inProgress.length,
      settledCount: settled.length,
      inProgressAmount: netSum(inProgress),
      settledAmount: netSum(settled),
    }
  }, [day.records])
  const summary = useMemo(() => {
    const map = new Map<
      string,
      {
        courseName: string
        count: number
        optionTotal: number
        netTotal: number
      }
    >()
    day.records.forEach((record) => {
      const courseName = record.courseName ?? 'コース未設定'
      const optionTotal = record.options.reduce((sum, option) => sum + option.price, 0)
      const netTotal = Math.max(record.staffRevenue - record.welfareExpense, 0)
      const current = map.get(courseName) ?? {
        courseName,
        count: 0,
        optionTotal: 0,
        netTotal: 0,
      }
      current.count += 1
      current.optionTotal += optionTotal
      current.netTotal += netTotal
      map.set(courseName, current)
    })
    const rows = Array.from(map.values()).sort((a, b) => b.netTotal - a.netTotal)
    const totals = rows.reduce(
      (acc, row) => {
        acc.count += row.count
        acc.optionTotal += row.optionTotal
        acc.netTotal += row.netTotal
        return acc
      },
      { count: 0, optionTotal: 0, netTotal: 0 }
    )
    return { rows, totals }
  }, [day.records])
  const breakdown = useMemo(() => {
    return day.records.reduce(
      (acc, record) => {
        const optionTotal = record.options.reduce((sum, option) => sum + option.price, 0)
        const designation = record.designationFee ?? 0
        const adjustment = (record.additionalFee ?? 0) - (record.discountAmount ?? 0)
        const coursePortion = Math.max(record.price - optionTotal - designation - adjustment, 0)
        acc.courseTotal += coursePortion
        acc.optionTotal += optionTotal
        acc.designationTotal += designation
        acc.adjustmentTotal += adjustment
        acc.staffSubtotal += record.staffRevenue ?? 0
        acc.welfareTotal += record.welfareExpense ?? 0
        return acc
      },
      {
        courseTotal: 0,
        optionTotal: 0,
        designationTotal: 0,
        adjustmentTotal: 0,
        staffSubtotal: 0,
        welfareTotal: 0,
      }
    )
  }, [day.records])

  return (
    <div className="divide-y">
      <button
        type="button"
        onClick={onToggle}
        className="grid w-full grid-cols-[1.5fr_repeat(2,_1fr)_auto] items-center gap-3 px-4 py-3 text-sm hover:bg-muted/30"
      >
        <span className="text-left font-medium text-foreground">{dayLabel}</span>
        <span className="text-right font-semibold text-foreground">
          ¥{day.totalRevenue.toLocaleString()}
        </span>
        <span className="text-right text-muted-foreground">{day.reservationCount} 件</span>
        <span className="flex items-center justify-end gap-2">
          <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">
            未/一部 {dayStatus.inProgressCount}件
          </Badge>
          <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">
            済 {dayStatus.settledCount}件
          </Badge>
          <ChevronDown
            className={cn(
              'h-4 w-4 text-muted-foreground transition-transform',
              isExpanded && 'rotate-180'
            )}
          />
        </span>
      </button>
      {isExpanded ? (
        <div className="space-y-3 bg-muted/20 px-4 py-4">
          <div className="rounded-md border bg-white px-3 py-3">
            <div className="text-xs font-semibold text-muted-foreground">内訳</div>
            <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded border border-dashed px-3 py-2">
                <p className="text-xs text-muted-foreground">コース</p>
                <p className="text-lg font-semibold">¥{breakdown.courseTotal.toLocaleString()}</p>
              </div>
              <div className="rounded border border-dashed px-3 py-2">
                <p className="text-xs text-muted-foreground">オプション</p>
                <p className="text-lg font-semibold">¥{breakdown.optionTotal.toLocaleString()}</p>
              </div>
              <div className="rounded border border-dashed px-3 py-2">
                <p className="text-xs text-muted-foreground">指名料</p>
                <p className="text-lg font-semibold">¥{breakdown.designationTotal.toLocaleString()}</p>
              </div>
              <div className="rounded border border-dashed px-3 py-2">
                <p className="text-xs text-muted-foreground">調整分</p>
                <p className="text-lg font-semibold">
                  {breakdown.adjustmentTotal >= 0 ? '+' : '-'}¥{Math.abs(breakdown.adjustmentTotal).toLocaleString()}
                </p>
              </div>
              <div className="rounded border border-dashed px-3 py-2">
                <p className="text-xs text-muted-foreground">女性小計 (キャスト売上)</p>
                <p className="text-lg font-semibold">¥{breakdown.staffSubtotal.toLocaleString()}</p>
              </div>
              <div className="rounded border border-dashed px-3 py-2">
                <p className="text-xs text-muted-foreground">雑費 / 厚生費</p>
                <p className="text-lg font-semibold">-¥{breakdown.welfareTotal.toLocaleString()}</p>
              </div>
              <div className="rounded border border-emerald-200 bg-emerald-50 px-3 py-2 sm:col-span-2 lg:col-span-3">
                <p className="text-xs text-emerald-700">手取り</p>
                <p className="text-2xl font-bold text-emerald-700">
                  ¥{Math.max(breakdown.staffSubtotal - breakdown.welfareTotal, 0).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>コース</TableHead>
                <TableHead className="text-right">本数</TableHead>
                <TableHead className="text-right">オプション</TableHead>
                <TableHead className="text-right">手取り金額</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {summary.rows.map((row) => (
                <TableRow key={row.courseName}>
                  <TableCell className="font-medium text-foreground">
                    {row.courseName}
                  </TableCell>
                  <TableCell className="text-right">{row.count} 本</TableCell>
                  <TableCell className="text-right">
                    ¥{row.optionTotal.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">
                    ¥{row.netTotal.toLocaleString()}
                  </TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-muted/40">
                <TableCell className="font-semibold text-foreground">合計</TableCell>
                <TableCell className="text-right font-semibold">
                  {summary.totals.count} 本
                </TableCell>
                <TableCell className="text-right font-semibold">
                  ¥{summary.totals.optionTotal.toLocaleString()}
                </TableCell>
                <TableCell className="text-right font-semibold">
                  ¥{summary.totals.netTotal.toLocaleString()}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
          <div className="space-y-2 rounded-md border border-dashed border-muted-foreground/40 bg-white/70 px-3 py-2">
            <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
              <span>予約ごとの精算状況</span>
              <span className="text-[11px]">手取り = キャスト売上 - 厚生費</span>
            </div>
            <div className="divide-y">
              {day.records.map((record) => {
                const net = Math.max(record.staffRevenue - record.welfareExpense, 0)
                const style = settlementStatusStyles[record.settlementStatus ?? 'pending']
                const label =
                  record.settlementStatus === 'settled'
                    ? '精算済み'
                    : record.settlementStatus === 'partial'
                      ? '一部精算'
                      : '未精算'

                return (
                  <div key={record.id} className="flex flex-wrap items-center gap-3 py-2 text-sm">
                    <div className="font-mono text-[12px] text-muted-foreground">
                      {format(new Date(record.startTime), 'HH:mm')}
                    </div>
                    <div className="min-w-[160px] flex-1">
                      <div className="font-medium text-foreground">
                        {record.courseName ?? 'コース未設定'}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        オプション {record.options.length}件・キャスト売上 ¥{record.staffRevenue.toLocaleString()}
                      </div>
                    </div>
                    <Badge variant="outline" className={style}>
                      {label}
                    </Badge>
                    <div className="ml-auto text-right">
                      <div className="font-semibold text-foreground">¥{net.toLocaleString()}</div>
                      <div className="text-[11px] text-muted-foreground">手取り</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function SummaryTile({
  icon: Icon,
  title,
  value,
  helper,
  tone = 'default',
}: {
  icon: typeof PiggyBank
  title: string
  value: string
  helper?: string
  tone?: 'default' | 'success' | 'warning'
}) {
  const toneStyle = {
    default: 'border-primary/10 bg-white',
    success: 'border-emerald-200 bg-emerald-50/60',
    warning: 'border-amber-200 bg-amber-50/60',
  }[tone]
  const iconStyle = {
    default: 'text-primary',
    success: 'text-emerald-600',
    warning: 'text-amber-600',
  }[tone]

  return (
    <Card className={`border ${toneStyle}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${iconStyle}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold text-foreground">{value}</div>
        {helper ? <p className="text-xs text-muted-foreground">{helper}</p> : null}
      </CardContent>
    </Card>
  )
}
