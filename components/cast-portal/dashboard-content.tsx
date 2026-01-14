'use client'

import { useCallback, useEffect, useMemo, useState, useTransition } from 'react'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { CalendarDays, CheckCircle2, Clock, Loader2, RefreshCcw, TrendingUp, UserCheck } from 'lucide-react'
import type { CastDashboardData, CastPortalReservation } from '@/lib/cast-portal/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { useToast } from '@/components/ui/use-toast'
import { cn } from '@/lib/utils'
import { CastScheduleManager } from '@/components/cast-portal/schedule-manager'

interface Props {
  initialData: CastDashboardData
}

export function CastDashboardContent({ initialData }: Props) {
  const [data, setData] = useState<CastDashboardData>(initialData)
  const [isPending, startTransition] = useTransition()
  const [isStatusPending, startStatusTransition] = useTransition()
  const [isRequestPending, startRequestTransition] = useTransition()
  const { toast } = useToast()
  const [requestAttendanceEnabled, setRequestAttendanceEnabled] = useState(
    Boolean(initialData.cast.requestAttendanceEnabled)
  )

  useEffect(() => {
    setRequestAttendanceEnabled(Boolean(data.cast.requestAttendanceEnabled))
  }, [data.cast.requestAttendanceEnabled])

  const currentReservation = useMemo(() => {
    if (!data.attendance.currentReservationId) {
      return null
    }
    return (
      data.todayReservations.find((reservation) => reservation.id === data.attendance.currentReservationId) ??
      (data.nextReservation && data.nextReservation.id === data.attendance.currentReservationId
        ? data.nextReservation
        : null)
    )
  }, [data])

  const refreshDashboard = useCallback(async () => {
    const response = await fetch('/api/cast-portal/dashboard', {
      cache: 'no-store',
    })

    if (!response.ok) {
      throw new Error('Failed to refresh dashboard')
    }

    const refreshed = (await response.json()) as CastDashboardData
    setData(refreshed)
  }, [])

  const handleAttendanceAction = useCallback(
    (action: 'check-in' | 'check-out', reservationId?: string) => {
      if (!reservationId) {
        toast({
          title: '操作できません',
          description: '対象の予約がありません。',
          variant: 'destructive',
        })
        return
      }

      startTransition(async () => {
        try {
          const response = await fetch(
            `/api/cast-portal/reservations/${reservationId}/attendance`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ action }),
            }
          )

          if (!response.ok) {
            const payload = await response.json().catch(() => ({}))
            throw new Error(payload.error ?? '勤怠の更新に失敗しました。')
          }

          await refreshDashboard()

          toast({
            title: action === 'check-in' ? 'チェックインしました' : 'チェックアウトしました',
            description: '勤怠情報が更新されました。',
          })
        } catch (error) {
          toast({
            title: 'エラー',
            description: error instanceof Error ? error.message : '勤怠更新に失敗しました。',
            variant: 'destructive',
          })
        }
      })
    },
    [refreshDashboard, toast]
  )

  const handleRefresh = useCallback(() => {
    startTransition(async () => {
      try {
        await refreshDashboard()
        toast({ title: '最新情報に更新しました。' })
      } catch (error) {
        toast({
          title: '更新に失敗しました',
          description: error instanceof Error ? error.message : undefined,
          variant: 'destructive',
        })
      }
    })
  }, [refreshDashboard, toast])

  const handleWorkStatusChange = useCallback(
    (nextStatus: '出勤' | '未出勤' | '休日') => {
      if (nextStatus === data.cast.workStatus) {
        return
      }

      startStatusTransition(async () => {
        try {
          const response = await fetch('/api/cast-portal/work-status', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ workStatus: nextStatus }),
          })

          if (!response.ok) {
            const payload = await response.json().catch(() => ({}))
            throw new Error(payload.error ?? 'ステータスの更新に失敗しました。')
          }

          setData((prev) => ({
            ...prev,
            cast: {
              ...prev.cast,
              workStatus: nextStatus,
            },
          }))

          toast({ title: `ステータスを「${nextStatus}」に更新しました。` })
        } catch (error) {
          toast({
            title: '更新に失敗しました',
            description: error instanceof Error ? error.message : undefined,
            variant: 'destructive',
          })
        }
      })
    },
    [data.cast.workStatus, toast]
  )

  const shouldShowWorkStatusControl = data.cast.workStatus !== '休日' || data.isScheduledToday

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{format(new Date(), 'yyyy年M月d日（E）', { locale: ja })}</p>
          <h2 className="text-2xl font-bold">本日のサマリー</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isPending}>
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
            更新
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <SummaryCard
          icon={CalendarDays}
          label="本日の予約"
          value={`${data.stats.todayCount} 件`}
          helper={`完了 ${data.stats.completedToday} 件 / 未完了 ${Math.max(data.stats.todayCount - data.stats.completedToday, 0)} 件`}
        />
        <SummaryCard
          icon={Clock}
          label="直近の予定"
          value={data.nextReservation ? formatTimeline(data.nextReservation) : '次の予約はありません'}
          helper={data.nextReservation ? `${format(new Date(data.nextReservation.startTime), 'HH:mm')} 開始` : 'スケジュールを確認してください'}
        />
        <SummaryCard
          icon={TrendingUp}
          label="今月のキャスト売上"
          value={`¥${data.stats.monthRevenue.toLocaleString()}`}
          helper={`本日 ¥${data.stats.todayRevenue.toLocaleString()} / 厚生費 ¥${data.stats.welfareThisMonth.toLocaleString()}`}
        />
      </div>

      {shouldShowWorkStatusControl ? (
        <CastWorkStatusControl
          currentStatus={data.cast.workStatus}
          isPending={isStatusPending}
          onChange={handleWorkStatusChange}
        />
      ) : null}

      <CastRequestAttendanceControl
        enabled={requestAttendanceEnabled}
        isPending={isRequestPending}
        onChange={(next) => {
          startRequestTransition(async () => {
            try {
              const response = await fetch('/api/cast-portal/request-attendance', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ enabled: next }),
              })

              if (!response.ok) {
                const payload = await response.json().catch(() => ({}))
                throw new Error(payload.error ?? '更新に失敗しました。')
              }

              setRequestAttendanceEnabled(next)
              toast({
                title: next ? 'リクエスト出勤を受付中にしました' : 'リクエスト出勤を停止しました',
              })
            } catch (error) {
              toast({
                title: '更新に失敗しました',
                description: error instanceof Error ? error.message : undefined,
                variant: 'destructive',
              })
            }
          })
        }}
      />

      <AttendanceCard
        reservation={currentReservation}
        canCheckIn={data.attendance.canCheckIn}
        canCheckOut={data.attendance.canCheckOut}
        onCheckIn={() => handleAttendanceAction('check-in', data.attendance.currentReservationId ?? undefined)}
        onCheckOut={() => handleAttendanceAction('check-out', data.attendance.currentReservationId ?? undefined)}
        isPending={isPending}
      />
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">今日の予定</h3>
          <Badge variant="secondary">{data.todayReservations.length} 件</Badge>
        </div>
        <div className="space-y-3">
          {data.todayReservations.length === 0 ? (
            <EmptyState message="本日の予約はありません。" />
          ) : (
            data.todayReservations.map((reservation) => (
              <ReservationItem key={reservation.id} reservation={reservation} />
            ))
          )}
        </div>
      </section>

      <CastScheduleManager />
    </div>
  )
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  helper,
}: {
  icon: typeof CalendarDays
  label: string
  value: string
  helper?: string
}) {
  return (
    <Card className="border border-primary/10 bg-white">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
        <Icon className="h-4 w-4 text-primary" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold text-foreground">{value}</div>
        {helper ? <p className="text-xs text-muted-foreground">{helper}</p> : null}
      </CardContent>
    </Card>
  )
}

function AttendanceCard({
  reservation,
  canCheckIn,
  canCheckOut,
  onCheckIn,
  onCheckOut,
  isPending,
}: {
  reservation: CastPortalReservation | null
  canCheckIn: boolean
  canCheckOut: boolean
  onCheckIn: () => void
  onCheckOut: () => void
  isPending: boolean
}) {
  const statusMeta = useMemo(() => {
    if (!reservation) {
      return { label: '待機中', className: 'bg-muted text-muted-foreground' }
    }
    if (reservation.checkedOutAt) {
      return { label: '対応済み', className: 'bg-emerald-100 text-emerald-700' }
    }
    if (reservation.checkedInAt) {
      return { label: '出勤中', className: 'bg-primary text-primary-foreground' }
    }
    if (canCheckIn) {
      return { label: '出勤前', className: 'bg-amber-100 text-amber-700' }
    }
    return { label: '待機中', className: 'bg-muted text-muted-foreground' }
  }, [reservation, canCheckIn])

  return (
    <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent">
      <CardContent className="space-y-4 py-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase text-primary">次のアクション</p>
          </div>
          <span className={cn('rounded-full px-3 py-1 text-xs font-semibold', statusMeta.className)}>
            {statusMeta.label}
          </span>
        </div>
        <div>
          <p className="text-lg font-semibold text-foreground">
            {reservation ? formatTimeline(reservation) : '現在、対応する予約はありません'}
          </p>
          {reservation ? (
            <p className="text-sm text-muted-foreground">
              {format(new Date(reservation.startTime), 'HH:mm')} - {format(new Date(reservation.endTime), 'HH:mm')} / {reservation.courseName ?? 'コース未設定'}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">予定が入るとこちらに表示されます。</p>
          )}
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <Button
            variant="secondary"
            className="h-14 w-full justify-center text-base"
            onClick={onCheckIn}
            disabled={!canCheckIn || isPending}
          >
            {isPending ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <CheckCircle2 className="mr-2 h-5 w-5" />}
            チェックイン
          </Button>
          <Button
            variant="default"
            className="h-14 w-full justify-center text-base"
            onClick={onCheckOut}
            disabled={!canCheckOut || isPending}
          >
            {isPending ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Clock className="mr-2 h-5 w-5" />}
            チェックアウト
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function ReservationItem({ reservation }: { reservation: CastPortalReservation }) {
  const start = new Date(reservation.startTime)
  const end = new Date(reservation.endTime)
  const statusBadge = renderReservationStatus(reservation)

  return (
    <div className="rounded-lg border border-border bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold">
            <span>{format(start, 'HH:mm')} - {format(end, 'HH:mm')}</span>
            {statusBadge}
          </div>
          <p className="text-sm text-muted-foreground">
            {reservation.customerAlias} / {reservation.courseName ?? 'コース未設定'}
          </p>
          <p className="text-xs text-muted-foreground">
            {reservation.areaName ?? 'エリア未設定'}
            {reservation.designationType ? ` / 指名: ${renderDesignation(reservation.designationType)}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <StatusPill active={Boolean(reservation.checkedInAt)} label="IN" />
          <StatusPill active={Boolean(reservation.checkedOutAt)} label="OUT" />
          <span className="rounded-full bg-muted px-2 py-1 font-medium text-foreground">
            {reservation.durationMinutes} 分
          </span>
        </div>
      </div>
      <div className="mt-3 text-right">
        <Link
          href={`/cast/reservations?highlight=${encodeURIComponent(reservation.id)}`}
          className="text-sm font-medium text-primary underline-offset-2 hover:underline"
        >
          詳細を確認する
        </Link>
      </div>
    </div>
  )
}

function CastWorkStatusControl({
  currentStatus,
  isPending,
  onChange,
}: {
  currentStatus: string
  isPending: boolean
  onChange: (status: '出勤' | '未出勤' | '休日') => void
}) {
  const options: Array<{
    value: '出勤' | '未出勤' | '休日'
    label: string
    description: string
    className: string
  }> = [
    {
      value: '出勤',
      label: '出勤中',
      description: '対応可能な状態です',
      className: 'bg-primary text-primary-foreground',
    },
    {
      value: '未出勤',
      label: '待機中',
      description: 'まだ出勤していません',
      className: 'bg-muted text-muted-foreground',
    },
    {
      value: '休日',
      label: '休日',
      description: '本日はお休みです',
      className: 'bg-amber-100 text-amber-700',
    },
  ]

  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-sm">今日の出勤ステータス</CardTitle>
        <p className="text-xs text-muted-foreground">
          予約とは別に、管理側へ現在の稼働状況を共有できます。
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid gap-2 sm:grid-cols-3">
          {options.map((option) => {
            const isActive = currentStatus === option.value
            return (
              <Button
                key={option.value}
                variant={isActive ? 'default' : 'outline'}
                className={cn(
                  'h-16 flex-col items-start justify-center text-left',
                  isActive && option.className,
                  isPending && 'pointer-events-none opacity-70'
                )}
                onClick={() => onChange(option.value)}
              >
                <span className="text-sm font-semibold">{option.label}</span>
                <span className="text-xs text-muted-foreground/90">{option.description}</span>
              </Button>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}

function CastRequestAttendanceControl({
  enabled,
  isPending,
  onChange,
}: {
  enabled: boolean
  isPending: boolean
  onChange: (enabled: boolean) => void
}) {
  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="flex items-center gap-2 text-sm">
          <UserCheck className="h-4 w-4" />
          リクエスト出勤の受付
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          受付をオンにするとプロフィールページにリクエスト出勤ボタンが表示されます。
        </p>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant={enabled ? 'default' : 'outline'}
            size="sm"
            className={cn('h-10 px-4', enabled && 'bg-emerald-600 hover:bg-emerald-700')}
            onClick={() => onChange(true)}
            disabled={isPending}
          >
            受付する
          </Button>
          <Button
            variant={!enabled ? 'default' : 'outline'}
            size="sm"
            className={cn('h-10 px-4', !enabled && 'bg-gray-800 hover:bg-gray-900')}
            onClick={() => onChange(false)}
            disabled={isPending}
          >
            受付しない
          </Button>
          <span className="text-xs text-muted-foreground">現在: {enabled ? '受付中' : '停止中'}</span>
        </div>
      </CardContent>
    </Card>
  )
}

function StatusPill({ active, label }: { active: boolean; label: string }) {
  return (
    <span
      className={cn(
        'flex h-6 items-center rounded-full px-2 font-medium transition-colors',
        active ? 'bg-emerald-100 text-emerald-700' : 'bg-muted text-muted-foreground'
      )}
    >
      {label}
    </span>
  )
}

function EmptyState({ message, compact = false }: { message: string; compact?: boolean }) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground',
        compact ? 'py-6' : 'py-12'
      )}
    >
      {message}
    </div>
  )
}

function formatTimeline(reservation: CastPortalReservation) {
  const start = format(new Date(reservation.startTime), 'HH:mm')
  const end = format(new Date(reservation.endTime), 'HH:mm')
  return `${start}〜${end} ${reservation.customerAlias}`
}

function renderDesignation(type?: string | null) {
  if (!type) return 'フリー'
  switch (type) {
    case 'special':
      return '特別指名'
    case 'regular':
      return '本指名'
    default:
      return 'フリー'
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
