'use client'

import { useCallback, useEffect, useMemo, useState, useTransition } from 'react'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { ChevronDown, Loader2, PiggyBank, Receipt, Shield } from 'lucide-react'
import type { CastSettlementsData } from '@/lib/cast-portal/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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

      <div className="grid gap-4 md:grid-cols-3">
        <SummaryTile
          icon={PiggyBank}
          title="今月のキャスト売上"
          value={`¥${data.summary.staffRevenue.toLocaleString()}`}
          helper={`総売上 ¥${data.summary.totalRevenue.toLocaleString()}`}
        />
        <SummaryTile
          icon={Shield}
          title="厚生費累計"
          value={`¥${data.summary.welfareExpense.toLocaleString()}`}
          helper="雑費（厚生費）を含む控除合計"
        />
        <SummaryTile
          icon={Receipt}
          title="精算状況"
          value={`${data.summary.completedCount} 件 完了`}
          helper={`未精算 ${data.summary.pendingCount} 件`}
        />
      </div>

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
        <span className="flex justify-end">
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
          <p className="text-xs text-muted-foreground">手取り金額 = キャスト売上 - 厚生費</p>
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
}: {
  icon: typeof PiggyBank
  title: string
  value: string
  helper?: string
}) {
  return (
    <Card className="border border-primary/10 bg-white">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-primary" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold text-foreground">{value}</div>
        {helper ? <p className="text-xs text-muted-foreground">{helper}</p> : null}
      </CardContent>
    </Card>
  )
}
