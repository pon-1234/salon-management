/**
 * @design_doc   docs/LEGACY_GOLD_ADMIN_MIGRATION_INVENTORY.md cast settlement management
 * @related_to   CastSettlementsData, settlement status API
 * @known_issues Legacy settlement totals require production-data reconciliation
 */
'use client'

import { useCallback, useEffect, useMemo, useState, useTransition } from 'react'
import { format } from 'date-fns'
import { formatInTimeZone } from 'date-fns-tz'
import { ja } from 'date-fns/locale'
import { ChevronDown, Loader2, PiggyBank, Plus, Receipt } from 'lucide-react'
import type { CastSettlementsData } from '@/lib/cast-portal/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  PaymentRecordForm,
  type PaymentRecordSubmitData,
} from '@/components/cast/payment-record-form'
import { buildStoreScopedEndpoint } from '@/lib/store/endpoints'
import { cn } from '@/lib/utils'

interface SettlementStatusTabProps {
  castId: string
  castName: string
  storeId: string
  onSettled?: () => void
}

const settlementStatusStyles = {
  pending: 'border-amber-200 bg-amber-50 text-amber-700',
  partial: 'border-blue-200 bg-blue-50 text-blue-700',
  settled: 'border-emerald-200 bg-emerald-50 text-emerald-700',
} as const

const settlementStatusLabels = {
  pending: '未精算',
  partial: '一部精算',
  settled: '精算済み',
} as const

export function SettlementStatusTab({ castId, storeId, onSettled }: SettlementStatusTabProps) {
  const now = useMemo(() => new Date(), [])
  const [year, setYear] = useState(Number(formatInTimeZone(now, 'Asia/Tokyo', 'yyyy')))
  const [month, setMonth] = useState(Number(formatInTimeZone(now, 'Asia/Tokyo', 'M')))
  const [data, setData] = useState<CastSettlementsData | null>(null)
  const [isPending, startTransition] = useTransition()
  const [expandedDates, setExpandedDates] = useState<Record<string, boolean>>({})
  const [error, setError] = useState<string | null>(null)
  const [isSettleDialogOpen, setIsSettleDialogOpen] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const fetchData = useCallback(async () => {
    const response = await fetch(
      buildStoreScopedEndpoint(
        `/api/admin/cast/settlements?castId=${encodeURIComponent(castId)}&year=${year}&month=${month}`,
        storeId
      ),
      { cache: 'no-store' }
    )

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}))
      throw new Error(payload.error ?? '精算情報の取得に失敗しました。')
    }

    return (await response.json()) as CastSettlementsData
  }, [castId, month, storeId, year])

  const shiftMonth = (delta: number) => {
    const next = month + delta
    if (next < 1) {
      setYear((value) => value - 1)
      setMonth(12)
      return
    }
    if (next > 12) {
      setYear((value) => value + 1)
      setMonth(1)
      return
    }
    setMonth(next)
  }

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
    const staffRevenueSum = (targets: typeof records) =>
      targets.reduce((sum, record) => sum + record.staffRevenue, 0)
    const pending = records.filter((record) => (record.settlementStatus ?? 'pending') === 'pending')
    const partial = records.filter((record) => record.settlementStatus === 'partial')
    const settled = records.filter((record) => record.settlementStatus === 'settled')

    return {
      takeHome: data.summary.staffRevenue,
      staffRevenue: data.summary.staffRevenue,
      welfareExpense: data.summary.welfareExpense,
      pendingAmount: staffRevenueSum(pending),
      partialAmount: staffRevenueSum(partial),
      settledAmount: staffRevenueSum(settled),
      pendingCount: pending.length,
      partialCount: partial.length,
      settledCount: settled.length,
    }
  }, [data])

  const pendingReservations = useMemo(() => {
    if (!data) return []
    return data.days.flatMap((day) =>
      day.records.filter((record) => {
        if (record.status !== 'completed') return false
        const status = record.settlementStatus ?? 'pending'
        const unpaid = record.unpaidAmount ?? record.staffRevenue
        return status !== 'settled' && unpaid > 0
      })
    )
  }, [data])

  const handleAddPayment = async (payload: PaymentRecordSubmitData) => {
    setSaveError(null)
    setSaving(true)
    try {
      const response = await fetch(
        buildStoreScopedEndpoint('/api/admin/cast/settlements', storeId),
        {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            castId,
            storeId,
            amount: payload.amount,
            method: payload.method,
            handledBy: payload.handledBy,
            paidAt: payload.paidAt,
            notes: payload.notes,
            reservationIds: payload.reservationIds,
          }),
        }
      )
      if (!response.ok) {
        const body = await response.json().catch(() => ({}))
        throw new Error(
          typeof body.error === 'string' ? body.error : '入金記録の保存に失敗しました'
        )
      }
      const payloadData = await fetchData()
      setData(payloadData)
      setIsSettleDialogOpen(false)
      onSettled?.()
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : '保存に失敗しました')
    } finally {
      setSaving(false)
    }
  }

  if (!data) {
    return (
      <Card>
        <CardContent
          role={error ? 'alert' : undefined}
          className={cn(
            'flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground',
            error && 'text-destructive'
          )}
        >
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
            日付ごとの精算状況です。前月へ戻って未精算も確認できます。
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => shiftMonth(-1)}>
            前月
          </Button>
          <div className="min-w-[7rem] text-center text-sm font-medium">
            {year}年{month}月
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => shiftMonth(1)}>
            翌月
          </Button>
          <Dialog
            open={isSettleDialogOpen}
            onOpenChange={(open) => {
              setIsSettleDialogOpen(open)
              if (!open) setSaveError(null)
            }}
          >
            <Button type="button" onClick={() => setIsSettleDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              精算する
            </Button>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>精算する</DialogTitle>
                <DialogDescription>
                  対象予約は初期状態で全件選択されます。金額を変えると古い予約から充当します。
                </DialogDescription>
              </DialogHeader>
              {saveError ? (
                <div
                  role="alert"
                  className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
                >
                  {saveError}
                </div>
              ) : null}
              {isSettleDialogOpen ? (
                <PaymentRecordForm
                  onSubmit={handleAddPayment}
                  reservations={pendingReservations}
                  isSubmitting={saving}
                />
              ) : null}
            </DialogContent>
          </Dialog>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              startTransition(async () => {
                setError(null)
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
      </div>

      {error ? (
        <div
          role="alert"
          className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
        >
          {error}
        </div>
      ) : null}

      {settlementStats ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <SummaryTile
            icon={PiggyBank}
            title={`${year}年${month}月の手取り見込み`}
            value={`¥${settlementStats.takeHome.toLocaleString()}`}
            helper={`厚生費 ¥${settlementStats.welfareExpense.toLocaleString()} は反映済み`}
          />
          <SummaryTile
            icon={Receipt}
            title="未精算"
            value={`¥${settlementStats.pendingAmount.toLocaleString()}`}
            helper={`件数 ${settlementStats.pendingCount} 件`}
            tone="warning"
          />
          <SummaryTile
            icon={Receipt}
            title="一部精算"
            value={`¥${settlementStats.partialAmount.toLocaleString()}`}
            helper={`件数 ${settlementStats.partialCount} 件`}
            tone="info"
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
    const pending = day.records.filter(
      (record) => (record.settlementStatus ?? 'pending') === 'pending'
    )
    const partial = day.records.filter((record) => record.settlementStatus === 'partial')
    const settled = day.records.filter((record) => record.settlementStatus === 'settled')

    return {
      pendingCount: pending.length,
      partialCount: partial.length,
      settledCount: settled.length,
    }
  }, [day])
  const courseSummary = useMemo(() => {
    const map = new Map<
      string,
      {
        courseLabel: string
        count: number
        total: number
      }
    >()
    day.records.forEach((record) => {
      const courseName = record.courseName ?? 'コース未設定'
      const courseLabel = record.courseDuration ? `${record.courseDuration}分コース` : courseName
      const optionTotal = record.options.reduce((sum, option) => sum + option.price, 0)
      const designation = record.designationFee ?? 0
      const adjustment = (record.additionalFee ?? 0) - (record.discountAmount ?? 0)
      const coursePortion = Math.max(record.price - optionTotal - designation - adjustment, 0)
      const current = map.get(courseLabel) ?? {
        courseLabel,
        count: 0,
        total: 0,
      }
      current.count += 1
      current.total += coursePortion
      map.set(courseLabel, current)
    })
    const rows = Array.from(map.values()).sort((a, b) => b.total - a.total)
    const totals = rows.reduce(
      (acc, row) => {
        acc.count += row.count
        acc.total += row.total
        return acc
      },
      { count: 0, total: 0 }
    )
    return { rows, totals }
  }, [day.records])
  const optionSummary = useMemo(() => {
    const map = new Map<
      string,
      {
        name: string
        count: number
        total: number
        takeHome: number
      }
    >()
    day.records.forEach((record) => {
      record.options.forEach((option) => {
        const name = option.name ?? 'オプション'
        const price = Math.max(option.price ?? 0, 0)
        const takeHome = Math.max(option.castShare ?? price, 0)
        const current = map.get(name) ?? { name, count: 0, total: 0, takeHome: 0 }
        current.count += 1
        current.total += price
        current.takeHome += takeHome
        map.set(name, current)
      })
    })
    const rows = Array.from(map.values()).sort((a, b) => b.total - a.total)
    const totals = rows.reduce(
      (acc, row) => {
        acc.count += row.count
        acc.total += row.total
        acc.takeHome += row.takeHome
        return acc
      },
      { count: 0, total: 0, takeHome: 0 }
    )
    return { rows, totals }
  }, [day.records])
  const designationSummary = useMemo(() => {
    const map = new Map<
      string,
      {
        label: string
        count: number
        total: number
        takeHome: number
      }
    >()
    const labelFor = (type?: string | null) => {
      if (type === 'special') return '特別指名'
      if (type === 'regular') return '本指名'
      return '指名'
    }
    day.records.forEach((record) => {
      const fee = Math.max(record.designationFee ?? 0, 0)
      if (fee <= 0 && !record.designationType) return
      const label = labelFor(record.designationType)
      const current = map.get(label) ?? { label, count: 0, total: 0, takeHome: 0 }
      current.count += 1
      current.total += fee
      current.takeHome += fee
      map.set(label, current)
    })
    const rows = Array.from(map.values()).sort((a, b) => b.total - a.total)
    const totals = rows.reduce(
      (acc, row) => {
        acc.count += row.count
        acc.total += row.total
        acc.takeHome += row.takeHome
        return acc
      },
      { count: 0, total: 0, takeHome: 0 }
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
            未精算 {dayStatus.pendingCount}件
          </Badge>
          <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700">
            一部 {dayStatus.partialCount}件
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
                <p className="text-lg font-semibold">
                  ¥{breakdown.designationTotal.toLocaleString()}
                </p>
              </div>
              <div className="rounded border border-dashed px-3 py-2">
                <p className="text-xs text-muted-foreground">調整分</p>
                <p className="text-lg font-semibold">
                  {breakdown.adjustmentTotal >= 0 ? '+' : '-'}¥
                  {Math.abs(breakdown.adjustmentTotal).toLocaleString()}
                </p>
              </div>
              <div className="rounded border border-dashed px-3 py-2">
                <p className="text-xs text-muted-foreground">女性小計 (キャスト売上)</p>
                <p className="text-lg font-semibold">¥{breakdown.staffSubtotal.toLocaleString()}</p>
              </div>
              <div className="rounded border border-dashed px-3 py-2">
                <p className="text-xs text-muted-foreground">雑費 / 厚生費（反映済み）</p>
                <p className="text-lg font-semibold">¥{breakdown.welfareTotal.toLocaleString()}</p>
              </div>
              <div className="rounded border border-emerald-200 bg-emerald-50 px-3 py-2 sm:col-span-2 lg:col-span-3">
                <p className="text-xs text-emerald-700">手取り</p>
                <p className="text-2xl font-bold text-emerald-700">
                  ¥{breakdown.staffSubtotal.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-md border bg-white px-3 py-3">
            <div className="text-xs font-semibold text-muted-foreground">内訳</div>
            <div className="mt-2 space-y-4 text-sm">
              <div>
                <div className="text-xs font-semibold text-muted-foreground">コース</div>
                <div className="mt-2 space-y-1">
                  {courseSummary.rows.map((row) => (
                    <div key={row.courseLabel} className="flex items-center justify-between">
                      <span className="font-medium text-foreground">
                        {row.courseLabel} ×{row.count}
                      </span>
                      <span>¥{row.total.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-2 text-xs text-muted-foreground">
                  合計 {courseSummary.totals.count} 本 / ¥
                  {courseSummary.totals.total.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold text-muted-foreground">オプション</div>
                {optionSummary.rows.length > 0 ? (
                  <div className="mt-2 space-y-1">
                    {optionSummary.rows.map((row) => (
                      <div key={row.name} className="flex items-center justify-between">
                        <span className="font-medium text-foreground">
                          {row.name} ×{row.count}
                        </span>
                        <span>¥{row.total.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-2 text-xs text-muted-foreground">なし</div>
                )}
              </div>
              <div>
                <div className="text-xs font-semibold text-muted-foreground">指名</div>
                {designationSummary.rows.length > 0 ? (
                  <div className="mt-2 space-y-1">
                    {designationSummary.rows.map((row) => (
                      <div key={row.label} className="flex items-center justify-between">
                        <span className="font-medium text-foreground">
                          {row.label} ×{row.count}
                        </span>
                        <span>¥{row.total.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-2 text-xs text-muted-foreground">なし</div>
                )}
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">調整</span>
                <span>
                  {breakdown.adjustmentTotal === 0
                    ? '¥0'
                    : `${breakdown.adjustmentTotal > 0 ? '+' : '-'}¥${Math.abs(breakdown.adjustmentTotal).toLocaleString()}`}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">※姫予約など手取りを変動した場合</p>
              <div className="border-t pt-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">女性小計</span>
                  <span>¥{breakdown.staffSubtotal.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>雑費 / 厚生費（取り分に反映済み）</span>
                  <span>¥{breakdown.welfareTotal.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between font-semibold text-emerald-700">
                  <span>手取り</span>
                  <span>¥{breakdown.staffSubtotal.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="space-y-2 rounded-md border border-dashed border-muted-foreground/40 bg-white/70 px-3 py-2">
            <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
              <span>予約ごとの精算状況</span>
              <span className="text-xs">キャスト売上は厚生費反映済みの最終取り分です</span>
            </div>
            <div className="divide-y">
              {day.records.map((record) => {
                const status = record.settlementStatus ?? 'pending'
                const style = settlementStatusStyles[status]
                const label = settlementStatusLabels[status]

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
                        オプション {record.options.length}件・キャスト売上 ¥
                        {record.staffRevenue.toLocaleString()}
                      </div>
                    </div>
                    <Badge variant="outline" className={style}>
                      {label}
                    </Badge>
                    <div className="ml-auto text-right">
                      <div className="font-semibold text-foreground">
                        ¥{record.staffRevenue.toLocaleString()}
                      </div>
                      <div className="text-xs text-muted-foreground">手取り</div>
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
  tone?: 'default' | 'success' | 'warning' | 'info'
}) {
  const toneStyle = {
    default: 'border-primary/10 bg-white',
    success: 'border-emerald-200 bg-emerald-50/60',
    warning: 'border-amber-200 bg-amber-50/60',
    info: 'border-blue-200 bg-blue-50/60',
  }[tone]
  const iconStyle = {
    default: 'text-primary',
    success: 'text-emerald-600',
    warning: 'text-amber-600',
    info: 'text-blue-600',
  }[tone]

  return (
    <Card role="group" aria-label={title} className={`border ${toneStyle}`}>
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
