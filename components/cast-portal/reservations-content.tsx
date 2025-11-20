'use client'

import { useCallback, useEffect, useMemo, useState, useTransition } from 'react'
import { format } from 'date-fns'
import { Loader2 } from 'lucide-react'
import type {
  CastReservationListResponse,
  CastPortalReservation,
  CastReservationScope,
  CastReservationDetail,
} from '@/lib/cast-portal/types'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import { cn } from '@/lib/utils'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'

const SCOPES: CastReservationScope[] = ['upcoming', 'today', 'past']

export function CastReservationsContent({ initialData }: { initialData: CastReservationListResponse }) {
  const [scope, setScope] = useState<CastReservationScope>(initialData.meta.scope)
  const [reservations, setReservations] = useState<CastPortalReservation[]>(initialData.items)
  const [isPending, startTransition] = useTransition()
  const { toast } = useToast()
  const [selectedReservation, setSelectedReservation] = useState<CastReservationDetail | null>(null)
  const [isDetailLoading, setIsDetailLoading] = useState(false)
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const fetchReservations = useCallback(
    async (nextScope: CastReservationScope) => {
      const response = await fetch(`/api/cast-portal/reservations?scope=${nextScope}`, {
        cache: 'no-store',
      })
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        throw new Error(payload.error ?? '予約情報の取得に失敗しました。')
      }
      const payload = (await response.json()) as CastReservationListResponse
      setScope(payload.meta.scope)
      setReservations(payload.items)
    },
    []
  )

  const handleScopeChange = (nextScope: CastReservationScope) => {
    if (nextScope === scope) return
    startTransition(async () => {
      try {
        await fetchReservations(nextScope)
      } catch (error) {
        toast({
          title: '読み込みに失敗しました',
          description: error instanceof Error ? error.message : undefined,
          variant: 'destructive',
        })
      }
    })
  }

  const handleRefresh = () => {
    startTransition(async () => {
      try {
        await fetchReservations(scope)
        toast({ title: '最新の情報に更新しました。' })
      } catch (error) {
        toast({
          title: '更新に失敗しました',
          description: error instanceof Error ? error.message : undefined,
          variant: 'destructive',
        })
      }
    })
  }

  const loadReservationDetail = useCallback(
    async (reservationId: string) => {
      setSelectedReservation(null)
      setIsDetailLoading(true)
      try {
        const response = await fetch(`/api/cast-portal/reservations/${reservationId}`, {
          cache: 'no-store',
        })
        if (response.status === 404) {
          toast({
            title: '予約が見つかりません',
            description: '対象の予約は削除されたか、アクセスできなくなっています。',
          })
          return null
        }
        if (!response.ok) {
          const payload = await response.json().catch(() => ({}))
          throw new Error(payload.error ?? '予約詳細の取得に失敗しました。')
        }
        const detail = (await response.json()) as CastReservationDetail
        setSelectedReservation(detail)
        return detail
      } catch (error) {
        toast({
          title: '読み込みに失敗しました',
          description: error instanceof Error ? error.message : undefined,
          variant: 'destructive',
        })
        return null
      } finally {
        setIsDetailLoading(false)
      }
    },
    [toast]
  )

  useEffect(() => {
    const highlight = searchParams.get('highlight')
    if (!highlight) return
    const params = new URLSearchParams(searchParams.toString())
    params.delete('highlight')
    void loadReservationDetail(highlight).finally(() => {
      const next = params.toString()
      router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false })
    })
  }, [searchParams, loadReservationDetail, router, pathname])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">予約一覧</h2>
          <p className="text-sm text-muted-foreground">ステータスごとに予約状況を確認し、抜け漏れを防ぎましょう。</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isPending}>
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            更新
          </Button>
        </div>
      </div>

      <Tabs value={scope} onValueChange={(value) => handleScopeChange(value as CastReservationScope)}>
        <TabsList className="grid w-full max-w-md grid-cols-3">
          {SCOPES.map((item) => (
            <TabsTrigger key={item} value={item} disabled={isPending}>
              {renderScopeLabel(item)}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="space-y-3">
        {isPending ? (
          <div className="flex items-center justify-center rounded-lg border border-dashed border-border py-12 text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 読み込み中です...
          </div>
        ) : reservations.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border py-16 text-center text-sm text-muted-foreground">
            表示する予約がありません。
          </div>
        ) : (
          reservations.map((reservation) => (
            <ReservationCard
              key={reservation.id}
              reservation={reservation}
              onViewDetail={() => loadReservationDetail(reservation.id)}
            />
          ))
        )}
      </div>

        <Dialog
          open={isDetailLoading || Boolean(selectedReservation)}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedReservation(null)
              setIsDetailLoading(false)
            }
          }}
        >
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto p-0">
            {isDetailLoading ? (
              <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 読み込み中です...
              </div>
            ) : selectedReservation ? (
              <ReservationDetailView reservation={selectedReservation} />
            ) : null}
          </DialogContent>
        </Dialog>
    </div>
  )
}

function ReservationCard({
  reservation,
  onViewDetail,
}: {
  reservation: CastPortalReservation
  onViewDetail: () => void
}) {
  const startTime = new Date(reservation.startTime)
  const endTime = new Date(reservation.endTime)

  return (
    <Card className="overflow-hidden border border-border bg-white">
      <CardHeader className="flex flex-col gap-2 space-y-0 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <span className="font-semibold text-foreground">
              {format(startTime, 'yyyy/MM/dd HH:mm')} - {format(endTime, 'HH:mm')}
            </span>
            {renderReservationStatus(reservation)}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {reservation.customerAlias} / {reservation.courseName ?? 'コース未設定'}
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="rounded-full bg-muted px-2 py-1">{reservation.durationMinutes} 分</span>
          <span className="rounded-full bg-muted px-2 py-1">指名: {renderDesignation(reservation.designationType)}</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm text-muted-foreground">
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          <span>エリア: {reservation.areaName ?? '未設定'}</span>
          <span>オプション: {reservation.options.length ? reservation.options.map((option) => option.name).join(' / ') : 'なし'}</span>
        </div>
        <div className="flex flex-wrap gap-3 text-xs">
          <StatusBadge active={Boolean(reservation.checkedInAt)} label="チェックイン" />
          <StatusBadge active={Boolean(reservation.checkedOutAt)} label="チェックアウト" />
        </div>
        <div className="pt-2">
          <Button variant="outline" size="sm" onClick={onViewDetail}>
            詳細を見る
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function StatusBadge({ active, label }: { active: boolean; label: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-3 py-1 font-medium',
        active ? 'bg-emerald-100 text-emerald-700' : 'bg-muted text-muted-foreground'
      )}
    >
      {label}
    </span>
  )
}

function renderScopeLabel(scope: CastReservationScope) {
  switch (scope) {
    case 'today':
      return '本日'
    case 'past':
      return '過去'
    default:
      return '今後'
  }
}

function renderReservationStatus(reservation: CastPortalReservation) {
  if (reservation.checkedOutAt) {
    return <Badge variant="outline" className="border-emerald-200 text-emerald-600">完了</Badge>
  }
  if (reservation.checkedInAt) {
    return <Badge variant="outline" className="border-primary/30 text-primary">対応中</Badge>
  }
  return <Badge variant="outline" className="border-muted-foreground/20 text-muted-foreground">待機</Badge>
}

function renderDesignation(type?: string | null) {
  switch (type) {
    case 'special':
      return '特別'
    case 'regular':
      return '本指名'
    default:
      return 'フリー'
  }
}

function ReservationDetailView({ reservation }: { reservation: CastReservationDetail }) {
  const startTime = new Date(reservation.startTime)
  const endTime = new Date(reservation.endTime)

  const pricingItems = useMemo<Array<{ label: string; value: string }>>(() => {
    const rows: Array<{ label: string; value: string }> = []
    if (reservation.courseName) {
      rows.push({ label: 'コース', value: `${reservation.courseName} ${reservation.courseDuration ?? ''}分` })
    }
    if (reservation.coursePrice) {
      rows.push({ label: 'コース料金', value: `¥${reservation.coursePrice.toLocaleString()}` })
    }
    if (reservation.designationFee) {
      rows.push({ label: '指名料', value: `¥${reservation.designationFee.toLocaleString()}` })
    }
    if (reservation.transportationFee) {
      rows.push({ label: '交通費', value: `¥${reservation.transportationFee.toLocaleString()}` })
    }
    if (reservation.additionalFee) {
      rows.push({ label: '追加費用', value: `¥${reservation.additionalFee.toLocaleString()}` })
    }
    if (reservation.discountAmount) {
      rows.push({ label: '割引', value: `-¥${reservation.discountAmount.toLocaleString()}` })
    }
    rows.push({ label: '店舗売上', value: `¥${(reservation.storeRevenue ?? 0).toLocaleString()}` })
    rows.push({ label: 'キャスト売上', value: `¥${(reservation.staffRevenue ?? 0).toLocaleString()}` })
    return rows
  }, [reservation])

  return (
    <div className="space-y-6 p-6">
      <DialogHeader>
        <DialogTitle className="text-lg">予約詳細</DialogTitle>
      </DialogHeader>
      <div className="space-y-6">
        <section className="grid gap-4 rounded-lg border border-border/60 bg-muted/20 p-4 sm:grid-cols-2">
          <InfoItem label="日時" value={`${format(startTime, 'yyyy/MM/dd (EEE) HH:mm')} - ${format(endTime, 'HH:mm')}`} />
          <InfoItem label="顧客" value={reservation.customerAlias} />
          <InfoItem label="電話番号" value={reservation.customerPhone ?? '未登録'} />
          <InfoItem label="支払い方法" value={reservation.paymentMethod ?? '未設定'} />
          <InfoItem label="マーケティング経路" value={reservation.marketingChannel ?? '未設定'} />
          <InfoItem label="指名種別" value={renderDesignation(reservation.designationType)} />
        </section>

        <section className="space-y-3 rounded-lg border border-border/60 p-4">
          <h3 className="text-sm font-semibold text-foreground">料金内訳</h3>
          <div className="grid gap-2 text-sm sm:grid-cols-2">
            {pricingItems.map((item) => (
              <InfoItem key={item.label} label={item.label} value={item.value} inline />
            ))}
          </div>
        </section>

        <section className="space-y-3 rounded-lg border border-border/60 p-4">
          <h3 className="text-sm font-semibold text-foreground">備考・移動情報</h3>
          <InfoItem label="集合場所" value={reservation.areaName ?? '未設定'} />
          <InfoItem label="詳細" value={reservation.locationMemo ?? reservation.areaMemo ?? '特記事項なし'} />
          <InfoItem label="メモ" value={reservation.notes ?? '入力されていません'} />
        </section>

        <section className="space-y-3 rounded-lg border border-border/60 p-4">
          <h3 className="text-sm font-semibold text-foreground">オプション</h3>
          {reservation.options.length === 0 ? (
            <p className="text-sm text-muted-foreground">選択されたオプションはありません。</p>
          ) : (
            <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
              {reservation.options.map((option) => (
                <li key={option.id}>{option.name}</li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}

function InfoItem({
  label,
  value,
  inline = false,
}: {
  label: string
  value?: string | number | null
  inline?: boolean
}) {
  return (
    <div className={cn('flex', inline ? 'items-center justify-between' : 'flex-col gap-1')}>
      <span className="text-xs font-medium uppercase text-muted-foreground">{label}</span>
      <span className="text-sm text-foreground">
        {value !== undefined && value !== null && String(value).trim().length > 0 ? String(value) : '未設定'}
      </span>
    </div>
  )
}
