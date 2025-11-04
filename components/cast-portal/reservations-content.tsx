'use client'

import { useCallback, useState, useTransition } from 'react'
import { format } from 'date-fns'
import { Loader2 } from 'lucide-react'
import type { CastReservationListResponse, CastPortalReservation, CastReservationScope } from '@/lib/cast-portal/types'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import { cn } from '@/lib/utils'

const SCOPES: CastReservationScope[] = ['upcoming', 'today', 'past']

export function CastReservationsContent({ initialData }: { initialData: CastReservationListResponse }) {
  const [scope, setScope] = useState<CastReservationScope>(initialData.meta.scope)
  const [reservations, setReservations] = useState<CastPortalReservation[]>(initialData.items)
  const [isPending, startTransition] = useTransition()
  const { toast } = useToast()

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
          reservations.map((reservation) => <ReservationCard key={reservation.id} reservation={reservation} />)
        )}
      </div>
    </div>
  )
}

function ReservationCard({ reservation }: { reservation: CastPortalReservation }) {
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
