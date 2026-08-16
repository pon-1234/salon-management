/**
 * @design_doc   Store-wide payment and settlement processing screens
 * @related_to   GET /api/admin/settlements, POST /api/admin/cast/settlements
 * @known_issues Legacy settlement history is not imported
 */
'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { formatInTimeZone } from 'date-fns-tz'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useStore } from '@/contexts/store-context'
import { buildStoreScopedEndpoint } from '@/lib/store/endpoints'
import type { StoreSettlementLedger } from '@/lib/settlement/store-ledger'
import { PageLoading } from '@/components/ui/page-loading'

const JST_TIME_ZONE = 'Asia/Tokyo'

export function SettlementLedgerClient({ mode }: { mode: 'payment' | 'settlement' }) {
  const { currentStore } = useStore()
  const now = useMemo(() => new Date(), [])
  const [year, setYear] = useState(Number(formatInTimeZone(now, JST_TIME_ZONE, 'yyyy')))
  const [month, setMonth] = useState(Number(formatInTimeZone(now, JST_TIME_ZONE, 'M')))
  const [ledger, setLedger] = useState<StoreSettlementLedger | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)

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

  const recordFullPayment = async (castId: string, reservationIds: string[], amount: number) => {
    setSavingId(castId)
    setError(null)
    try {
      const response = await fetch(
        buildStoreScopedEndpoint('/api/admin/cast/settlements', currentStore.id),
        {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            castId,
            amount,
            method: 'cash',
            handledBy: 'admin',
            reservationIds,
          }),
        }
      )
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        throw new Error(payload.error ?? '入金記録の保存に失敗しました。')
      }
      await fetchLedger()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : '入金記録の保存に失敗しました。')
    } finally {
      setSavingId(null)
    }
  }

  const title = mode === 'payment' ? '入金処理' : '入金精算処理'
  const description =
    mode === 'payment'
      ? '完了予約の入金を記録します。カード管理番号がある予約もここに表示されます。一部金額でも記録できます。'
      : 'キャストごとの未精算・精算済みと、記録済みの入金を確認します。手取りはキャスト売上（厚生費反映済み）です。'

  return (
    <div className="container mx-auto space-y-6 py-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="text-sm text-muted-foreground">{description}</p>
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
        mode === 'payment' ? (
          <div className="space-y-4">
            {ledger.casts.flatMap((cast) =>
              cast.pendingReservations.map((reservation) => (
                <Card key={reservation.id}>
                  <CardHeader>
                    <CardTitle className="text-lg">
                      {reservation.customerName} / {cast.castName}
                    </CardTitle>
                    <CardDescription>
                      {reservation.courseName ?? 'コース未設定'} ・ 管理番号{' '}
                      {reservation.paymentReference ?? 'なし'} ・{' '}
                      {reservation.paymentMethod ?? '支払方法未設定'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-wrap items-center justify-between gap-3">
                    <div className="text-sm">
                      手取り ¥{reservation.takeHome.toLocaleString()} / 店舗売上 ¥
                      {reservation.storeRevenue.toLocaleString()}
                    </div>
                    <Button
                      type="button"
                      disabled={savingId === cast.castId}
                      onClick={() =>
                        void recordFullPayment(cast.castId, [reservation.id], reservation.takeHome)
                      }
                    >
                      全額入金する
                    </Button>
                  </CardContent>
                </Card>
              ))
            )}
            {ledger.casts.every((cast) => cast.pendingReservations.length === 0) ? (
              <p className="text-sm text-muted-foreground">未精算の完了予約はありません。</p>
            ) : null}
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              {ledger.casts.map((cast) => (
                <Card key={cast.castId}>
                  <CardHeader>
                    <CardTitle>{cast.castName}</CardTitle>
                    <CardDescription>
                      手取り ¥{cast.staffRevenue.toLocaleString()} / 店舗売上 ¥
                      {cast.storeRevenue.toLocaleString()}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="text-sm">
                    <p>
                      未精算 {cast.pendingCount}件 ¥{cast.pendingAmount.toLocaleString()}
                    </p>
                    <p>精算済み ¥{cast.settledAmount.toLocaleString()}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
            <Card>
              <CardHeader>
                <CardTitle>入金記録</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {ledger.payments.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex flex-wrap justify-between gap-2 border-b py-2"
                  >
                    <span>
                      {payment.castName} / {payment.method}
                    </span>
                    <span>¥{payment.amount.toLocaleString()}</span>
                  </div>
                ))}
                {ledger.payments.length === 0 ? (
                  <p className="text-muted-foreground">この月の入金記録はありません。</p>
                ) : null}
              </CardContent>
            </Card>
          </div>
        )
      ) : (
        <p className="text-sm text-muted-foreground">表示できる精算情報がありません。</p>
      )}
    </div>
  )
}
