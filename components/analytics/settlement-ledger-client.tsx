/**
 * @design_doc   Store-wide payment and settlement processing screens
 * @related_to   GET /api/admin/settlements, POST /api/admin/cast/settlements
 * @known_issues Yearly archive tables and SK-DB guarantee rows remain outside the current extract
 */
'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { formatInTimeZone } from 'date-fns-tz'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useStore } from '@/contexts/store-context'
import { buildStoreScopedEndpoint } from '@/lib/store/endpoints'
import type { StoreSettlementLedger } from '@/lib/settlement/store-ledger'
import { displaySettlementMethodLabel } from '@/lib/payment/method-labels'
import { PageLoading } from '@/components/ui/page-loading'

const JST_TIME_ZONE = 'Asia/Tokyo'

function legacyDirectionLabel(direction: string): string {
  if (direction === 'inbound') return '入金'
  if (direction === 'outbound') return '出金'
  if (direction === 'deduction') return '控除'
  return direction
}

function legacyKindLabel(kind: string): string {
  if (kind === 'cash') return '現金'
  if (kind === 'transfer') return '振込'
  if (kind === 'payout') return '支払'
  if (kind === 'welfare') return '厚生費'
  return kind
}

export function SettlementLedgerClient({ mode: _mode }: { mode: 'payment' | 'settlement' }) {
  const { currentStore } = useStore()
  const now = useMemo(() => new Date(), [])
  const [year, setYear] = useState(Number(formatInTimeZone(now, JST_TIME_ZONE, 'yyyy')))
  const [month, setMonth] = useState(Number(formatInTimeZone(now, JST_TIME_ZONE, 'M')))
  const [ledger, setLedger] = useState<StoreSettlementLedger | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchLedger = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch(
        buildStoreScopedEndpoint(
          `/api/admin/settlements?year=${year}&month=${month}`,
          currentStore.id
        ),
        { cache: 'no-store', credentials: 'include' }
      )
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        throw new Error(payload.error ?? '精算情報の取得に失敗しました。')
      }
      setLedger((await response.json()) as StoreSettlementLedger)
    } catch (caught) {
      setLedger(null)
      setError(caught instanceof Error ? caught.message : '精算情報の取得に失敗しました。')
    } finally {
      setIsLoading(false)
    }
  }, [currentStore.id, month, year])

  useEffect(() => {
    void fetchLedger()
  }, [fetchLedger])

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

  const title = '精算'

  return (
    <div className="container mx-auto space-y-6 py-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="text-sm text-muted-foreground">
            完了本数と店舗売上を基準に、精算済み・未精算を確認します。
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" onClick={() => shiftMonth(-1)}>
            前月
          </Button>
          <div className="min-w-[7rem] text-center font-medium">
            {year}年{month}月
          </div>
          <Button type="button" variant="outline" onClick={() => shiftMonth(1)}>
            翌月
          </Button>
          <Button type="button" variant="outline" onClick={() => void fetchLedger()}>
            更新
          </Button>
          <Button type="button" variant="outline" onClick={() => window.print()}>
            印刷
          </Button>
        </div>
      </div>

      {error ? (
        <div
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive"
        >
          {error}
        </div>
      ) : null}

      {isLoading ? (
        <PageLoading compact label="精算情報を読み込んでいます" />
      ) : ledger ? (
        <div className="space-y-6">
          <div className="overflow-x-auto rounded-lg border bg-white">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">キャスト</th>
                  <th className="px-3 py-2 font-medium">本数</th>
                  <th className="px-3 py-2 font-medium">キャスト売上</th>
                  <th className="px-3 py-2 font-medium">店舗売上</th>
                  <th className="px-3 py-2 font-medium">精算済み</th>
                  <th className="px-3 py-2 font-medium">未精算</th>
                  <th className="px-3 py-2 font-medium"> </th>
                </tr>
              </thead>
              <tbody>
                {ledger.casts.map((cast) => (
                  <tr key={cast.castId} className="border-t">
                    <td className="px-3 py-2 font-medium">{cast.castName}</td>
                    <td className="px-3 py-2">{cast.completedCount}本</td>
                    <td className="px-3 py-2">¥{cast.staffRevenue.toLocaleString()}</td>
                    <td className="px-3 py-2">¥{cast.storeRevenue.toLocaleString()}</td>
                    <td className="px-3 py-2">¥{cast.settledAmount.toLocaleString()}</td>
                    <td
                      className={
                        cast.pendingAmount > 0 ? 'px-3 py-2 font-medium text-red-600' : 'px-3 py-2'
                      }
                    >
                      ¥{cast.pendingAmount.toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/admin/cast/manage/${cast.castId}?tab=settlement`}>
                          精算状況を見る
                        </Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>精算履歴</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {ledger.payments.map((payment) => (
                <div
                  key={payment.id}
                  className="flex flex-wrap justify-between gap-2 border-b py-2"
                >
                  <span>
                    {payment.castName} / {displaySettlementMethodLabel(payment.method)}
                  </span>
                  <span>¥{payment.amount.toLocaleString()}</span>
                </div>
              ))}
              {ledger.payments.length === 0 ? (
                <p className="text-muted-foreground">この月の精算記録はありません。</p>
              ) : null}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>旧台帳</CardTitle>
              <CardDescription>
                旧システムの入金・出金・厚生費です。時給保証単価は ¥
                {ledger.hourlyGuaranteeAmount.toLocaleString()}
                。同じ店舗の年次入金は含みます。別DBの保証実績は含みません。
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {ledger.legacyEntries.map((entry) => (
                <div key={entry.id} className="flex flex-wrap justify-between gap-2 border-b py-2">
                  <span>
                    {entry.castName} / {legacyDirectionLabel(entry.direction)} /{' '}
                    {legacyKindLabel(entry.kind)}
                  </span>
                  <span>¥{entry.amount.toLocaleString()}</span>
                </div>
              ))}
              {ledger.legacyEntries.length === 0 ? (
                <p className="text-muted-foreground">この月の旧台帳はありません。</p>
              ) : null}
            </CardContent>
          </Card>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">表示できる精算情報がありません。</p>
      )}
    </div>
  )
}
