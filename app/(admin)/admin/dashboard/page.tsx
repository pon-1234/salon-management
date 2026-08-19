/**
 * @design_doc   docs/UX_FOUNDATIONS.md
 * @related_to   CustomerSelectionDialog, CastScheduleUseCases, and dashboard.utils
 * @known_issues Charts and period tabs belong on analytics screens, not this ops home
 */
'use client'

import { useState, useEffect, useMemo, useRef, type FormEvent } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Calendar,
  Clock,
  ArrowUpRight,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  Phone,
  Search,
  FileText,
  LayoutGrid,
  ListChecks,
} from 'lucide-react'
import { getAllReservations } from '@/lib/reservation/data'
import { addHours, subHours, differenceInMinutes } from 'date-fns'
import { ja } from 'date-fns/locale'
import { formatInTimeZone } from 'date-fns-tz'
import {
  type Reservation,
  type ReservationData,
  type ReservationSavePayload,
} from '@/lib/types/reservation'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { ReservationDialog } from '@/components/reservation/reservation-dialog'
import { CustomerSelectionDialog } from '@/components/customer/customer-selection-dialog'
import { useStore } from '@/contexts/store-context'
import { mapReservationToReservationData } from '@/lib/reservation/transformers'
import { useSession } from 'next-auth/react'
import { hasPermission } from '@/lib/auth/permissions'
import {
  formatPhoneNumber,
  getCustomerPhoneIdentityVariants,
  normalizeWritableCustomerPhoneIdentity,
} from '@/lib/customer/utils'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { toast } from '@/hooks/use-toast'
import { CastScheduleUseCases } from '@/lib/cast-schedule/usecases'
import type { WeeklySchedule } from '@/lib/cast-schedule/old-types'
import { buildStoreScopedEndpoint } from '@/lib/store/endpoints'
import {
  fetchAllDashboardReservations,
  getDashboardQueryWindow,
  getJstPeriodBounds,
  isWithinPeriod,
  sumActiveReservationRevenue,
} from './dashboard.utils'

const JST_TIMEZONE = 'Asia/Tokyo'
const castScheduleUseCases = new CastScheduleUseCases()

interface PhoneCustomerSearchResult {
  id: string
  name: string
  phone: string
}

type PhoneSearchStatus = 'idle' | 'loading' | 'ready' | 'error'

function StatusBadge({ status }: { status: string }) {
  const statusConfig = {
    confirmed: {
      label: '確定',
      variant: 'default' as const,
      icon: <CheckCircle2 className="h-3 w-3" />,
    },
    pending: {
      label: '仮予約',
      variant: 'secondary' as const,
      icon: <Clock className="h-3 w-3" />,
    },
    tentative: {
      label: '仮予約',
      variant: 'secondary' as const,
      icon: <Clock className="h-3 w-3" />,
    },
    cancelled: {
      label: 'キャンセル',
      variant: 'destructive' as const,
      icon: <XCircle className="h-3 w-3" />,
    },
    completed: {
      label: '対応済み',
      variant: 'outline' as const,
      icon: <CheckCircle2 className="h-3 w-3" />,
    },
    modifiable: {
      label: '修正待ち',
      variant: 'outline' as const,
      icon: <AlertCircle className="h-3 w-3" />,
    },
  }

  const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending

  return (
    <Badge variant={config.variant} className="gap-1">
      {config.icon}
      {config.label}
    </Badge>
  )
}

function getUpcomingTimingBadge(startTime: Date) {
  const now = new Date()
  const minutesUntil = differenceInMinutes(startTime, now)

  if (minutesUntil <= 0) {
    return { label: '施術中', variant: 'secondary' as const }
  }
  if (minutesUntil <= 30) {
    return { label: 'まもなく開始', variant: 'default' as const }
  }
  if (minutesUntil < 60) {
    return { label: `${minutesUntil}分後に開始`, variant: 'success' as const }
  }
  if (minutesUntil < 180) {
    return { label: `開始まで約${Math.round(minutesUntil / 60)}時間`, variant: 'success' as const }
  }
  return {
    label: `${formatInTimeZone(startTime, JST_TIMEZONE, 'MM月dd日 HH:mm')} 開始予定`,
    variant: 'outline' as const,
  }
}

export default function DashboardPage() {
  const { data: session, status } = useSession()
  const { currentStore } = useStore()
  const grantedPermissions = session?.user?.permissions ?? []
  const isAdminUser = session?.user?.role === 'admin'
  const canViewAnalytics = hasPermission(grantedPermissions, 'analytics:read')
  const canViewFinancials = canViewAnalytics || hasPermission(grantedPermissions, 'dashboard:view')
  const canUpdateReservations = hasPermission(grantedPermissions, 'reservation:update')
  const canReadCustomers = hasPermission(grantedPermissions, 'customer:read')
  const canCreateReservation =
    canReadCustomers && hasPermission(grantedPermissions, 'reservation:create')
  const canCreateCustomers = hasPermission(grantedPermissions, 'customer:create')

  const [reservations, setReservations] = useState<Reservation[]>([])
  const [weeklySchedule, setWeeklySchedule] = useState<WeeklySchedule | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null)
  const [customerDialogMode, setCustomerDialogMode] = useState<'reservation' | 'lookup' | null>(
    null
  )
  const [phoneQuery, setPhoneQuery] = useState('')
  const [phoneResults, setPhoneResults] = useState<PhoneCustomerSearchResult[]>([])
  const [phoneSearchStatus, setPhoneSearchStatus] = useState<PhoneSearchStatus>('idle')
  const [phoneSearchMessage, setPhoneSearchMessage] = useState<string | null>(null)
  const [lastSearchedPhone, setLastSearchedPhone] = useState<string | null>(null)
  const phoneSearchRequestIdRef = useRef(0)
  const canRegisterSearchedPhone =
    canCreateReservation &&
    canCreateCustomers &&
    phoneSearchStatus === 'ready' &&
    phoneResults.length === 0 &&
    lastSearchedPhone !== null &&
    normalizeWritableCustomerPhoneIdentity(lastSearchedPhone) !== null

  useEffect(() => {
    phoneSearchRequestIdRef.current += 1
    setPhoneQuery('')
    setPhoneResults([])
    setPhoneSearchStatus('idle')
    setPhoneSearchMessage(null)
    setLastSearchedPhone(null)
  }, [currentStore.id])

  useEffect(() => {
    if (status === 'loading') {
      return
    }

    if (!isAdminUser || status !== 'authenticated') {
      setLoading((prev) => (prev ? false : prev))
      setReservations((prev) => (prev.length ? [] : prev))
      setWeeklySchedule(null)
      return
    }

    let ignore = false

    const fetchData = async () => {
      setLoading(true)
      const now = new Date()
      const queryWindow = getDashboardQueryWindow('today', now)
      const [reservationResult, scheduleResult] = await Promise.allSettled([
        fetchAllDashboardReservations({
          storeId: currentStore.id,
          start: queryWindow.start,
          endExclusive: queryWindow.endExclusive,
          fetchPage: getAllReservations,
        }),
        castScheduleUseCases.getWeeklySchedule({
          date: now,
          castFilter: 'all',
          storeId: currentStore.id,
        }),
      ])

      if (ignore) return

      if (reservationResult.status === 'fulfilled') {
        setReservations(reservationResult.value)
      } else {
        console.error('Failed to fetch reservations:', reservationResult.reason)
        setReservations([])
      }

      if (scheduleResult.status === 'fulfilled') {
        setWeeklySchedule(scheduleResult.value)
      } else {
        console.error('Failed to fetch weekly schedule:', scheduleResult.reason)
        setWeeklySchedule(null)
      }

      if (!ignore) {
        setLoading(false)
      }
    }

    void fetchData()

    return () => {
      ignore = true
    }
  }, [currentStore.id, isAdminUser, status])

  const isSessionLoading = status === 'loading'
  const isUnauthorized = !isSessionLoading && !isAdminUser

  const convertToReservationData = (reservation: Reservation): ReservationData | null => {
    if (!reservation) return null
    return mapReservationToReservationData(reservation)
  }

  const handleReservationSave = async (
    reservationId: string,
    payload: ReservationSavePayload
  ): Promise<void> => {
    const currentReservation = reservations.find((reservation) => reservation.id === reservationId)
    if (!currentReservation) {
      throw new Error('対象の予約が見つかりません。')
    }

    const response = await fetch(
      `/api/reservation?storeId=${encodeURIComponent(currentStore.id)}`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ id: reservationId, ...payload }),
      }
    )
    const responseBody = await response.json().catch(() => null)

    if (!response.ok) {
      const message =
        responseBody && typeof responseBody.error === 'string'
          ? responseBody.error
          : '予約を更新できませんでした。'
      throw new Error(message)
    }

    const updatedReservation = {
      ...currentReservation,
      ...responseBody,
      startTime: new Date(responseBody?.startTime ?? currentReservation.startTime),
      endTime: new Date(responseBody?.endTime ?? currentReservation.endTime),
      updatedAt: new Date(responseBody?.updatedAt ?? Date.now()),
    } as Reservation

    setReservations((current) =>
      current.map((reservation) =>
        reservation.id === reservationId ? updatedReservation : reservation
      )
    )
    setSelectedReservation(updatedReservation.status === 'cancelled' ? null : updatedReservation)
    toast({ description: '予約を更新しました。' })
  }

  const handlePhoneSearch = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const requestId = ++phoneSearchRequestIdRef.current
    const phoneIdentities = getCustomerPhoneIdentityVariants(phoneQuery)
    const normalizedPhone = phoneIdentities[1] ?? phoneIdentities[0]

    if (!normalizedPhone) {
      setPhoneResults([])
      setPhoneSearchStatus('error')
      setPhoneSearchMessage('電話番号を10〜11桁で入力してください。')
      setLastSearchedPhone(null)
      return
    }

    setPhoneSearchStatus('loading')
    setPhoneSearchMessage(null)
    setLastSearchedPhone(null)

    try {
      const response = await fetch(
        buildStoreScopedEndpoint(
          `/api/customer?phone=${encodeURIComponent(normalizedPhone)}&limit=10`,
          currentStore.id
        ),
        { credentials: 'include', cache: 'no-store' }
      )
      if (requestId !== phoneSearchRequestIdRef.current) {
        return
      }
      if (!response.ok) {
        throw new Error(`Customer search failed: ${response.status}`)
      }

      const payload = (await response.json()) as
        | PhoneCustomerSearchResult[]
        | { data?: PhoneCustomerSearchResult[] }
      const results = Array.isArray(payload)
        ? payload
        : Array.isArray(payload.data)
          ? payload.data
          : []
      if (requestId !== phoneSearchRequestIdRef.current) {
        return
      }
      setPhoneResults(results)
      setPhoneSearchStatus('ready')
      setPhoneSearchMessage(results.length === 0 ? '該当する顧客が見つかりませんでした。' : null)
      setLastSearchedPhone(normalizedPhone)
    } catch (error) {
      if (requestId !== phoneSearchRequestIdRef.current) {
        return
      }
      console.error('Dashboard customer phone search failed:', error)
      setPhoneResults([])
      setPhoneSearchStatus('error')
      setPhoneSearchMessage('顧客検索に失敗しました。もう一度お試しください。')
      setLastSearchedPhone(null)
    }
  }

  const todaysReservations = useMemo(() => {
    const bounds = getJstPeriodBounds('today')
    return reservations.filter((reservation) =>
      isWithinPeriod(new Date(reservation.startTime), bounds)
    )
  }, [reservations])

  const todaySummary = useMemo(() => {
    const active = todaysReservations.filter((reservation) => reservation.status !== 'cancelled')
    const pendingStatuses = new Set(['pending', 'tentative', 'modifiable'])
    return {
      bookings: active.length,
      confirmed: active.filter((reservation) => reservation.status === 'confirmed').length,
      pending: active.filter((reservation) => pendingStatuses.has(reservation.status)).length,
      revenue: sumActiveReservationRevenue(todaysReservations),
    }
  }, [todaysReservations])

  const { displayReservations, hasUpcomingReservations } = useMemo(() => {
    if (!reservations.length) {
      return {
        displayReservations: [] as Reservation[],
        hasUpcomingReservations: false,
      }
    }

    const now = new Date()
    const windowStart = subHours(now, 1)
    const windowEnd = addHours(now, 48)

    const activeReservations = reservations.filter(
      (reservation) => reservation.status !== 'cancelled'
    )
    const upcoming = activeReservations
      .filter((reservation) => {
        const start =
          reservation.startTime instanceof Date
            ? reservation.startTime
            : new Date(reservation.startTime)
        return start >= windowStart && start <= windowEnd
      })
      .sort((a, b) => {
        const aStart = a.startTime instanceof Date ? a.startTime : new Date(a.startTime)
        const bStart = b.startTime instanceof Date ? b.startTime : new Date(b.startTime)
        return aStart.getTime() - bStart.getTime()
      })

    if (upcoming.length > 0) {
      return {
        displayReservations: upcoming.slice(0, 5),
        hasUpcomingReservations: true,
      }
    }

    const latest = [...activeReservations].sort((a, b) => {
      const aStart = a.startTime instanceof Date ? a.startTime : new Date(a.startTime)
      const bStart = b.startTime instanceof Date ? b.startTime : new Date(b.startTime)
      return bStart.getTime() - aStart.getTime()
    })

    return {
      displayReservations: latest.slice(0, 5),
      hasUpcomingReservations: false,
    }
  }, [reservations])

  const todayDateKey = formatInTimeZone(new Date(), JST_TIMEZONE, 'yyyy-MM-dd')
  const todaysWorkingCasts = useMemo(
    () =>
      (weeklySchedule?.entries ?? [])
        .map((entry) => ({ entry, shift: entry.schedule[todayDateKey] }))
        .filter(({ shift }) => shift?.type === '出勤予定')
        .sort((left, right) => {
          const timeOrder = (left.shift?.startTime ?? '').localeCompare(
            right.shift?.startTime ?? ''
          )
          return timeOrder || left.entry.name.localeCompare(right.entry.name, 'ja')
        }),
    [todayDateKey, weeklySchedule]
  )

  if (isSessionLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          今日の状況を読み込み中です...
        </div>
      </div>
    )
  }

  if (isUnauthorized) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-6">
        <div className="max-w-md">
          <Alert variant="destructive">
            <AlertDescription>
              ダッシュボードへのアクセス権限がありません。必要な場合は管理者にお問い合わせください。
            </AlertDescription>
          </Alert>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <div className="h-10 w-48 animate-pulse rounded bg-muted" />
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <Card className="animate-pulse">
            <CardContent className="h-48" />
          </Card>
          <Card className="animate-pulse">
            <CardContent className="h-48" />
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 md:text-3xl">今日の状況</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {formatInTimeZone(new Date(), JST_TIMEZONE, 'yyyy年MM月dd日 (E)', {
              locale: ja,
            })}{' '}
            {currentStore.displayName}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link href="/admin/reservation" aria-label="予約表を開く">
              <LayoutGrid className="mr-2 h-4 w-4" />
              予約表
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href="/admin/reservation-list" aria-label="予約一覧を開く">
              <ListChecks className="mr-2 h-4 w-4" />
              予約一覧
            </Link>
          </Button>
          {canViewAnalytics ? (
            <>
              <Button variant="outline" asChild>
                <Link href="/admin/analytics/daily-report" aria-label="業務日報を開く">
                  <FileText className="mr-2 h-4 w-4" />
                  日報
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/admin/analytics/payment-processing" aria-label="入金処理を開く">
                  入金処理
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/admin/analytics/settlement-processing" aria-label="入金精算処理を開く">
                  入金精算
                </Link>
              </Button>
            </>
          ) : null}
        </div>
      </div>

      <div data-testid="today-ops-summary" className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-lg border bg-white px-4 py-3">
          <p className="text-xs text-muted-foreground">本日の予約</p>
          <p className="text-xl font-semibold tabular-nums">{todaySummary.bookings}件</p>
        </div>
        <div className="rounded-lg border bg-white px-4 py-3">
          <p className="text-xs text-muted-foreground">確定</p>
          <p className="text-xl font-semibold tabular-nums">{todaySummary.confirmed}件</p>
        </div>
        <div className="rounded-lg border bg-white px-4 py-3">
          <p className="text-xs text-muted-foreground">仮予約</p>
          <p className="text-xl font-semibold tabular-nums">{todaySummary.pending}件</p>
        </div>
        <div className="rounded-lg border bg-white px-4 py-3">
          <p className="text-xs text-muted-foreground">本日売上</p>
          <p className="text-xl font-semibold tabular-nums">
            {canViewFinancials ? `¥${todaySummary.revenue.toLocaleString()}` : '閲覧不可'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card className="border-emerald-200 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-emerald-600" />
              予約受付
            </CardTitle>
            <CardDescription>電話が来たら、ここで顧客を探して予約を作ります。</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2">
              {canCreateReservation ? (
                <Button
                  type="button"
                  size="lg"
                  className="h-12 text-base"
                  onClick={() => setCustomerDialogMode('reservation')}
                >
                  <Calendar className="mr-2 h-5 w-5" />
                  予約作成
                </Button>
              ) : null}
              {canReadCustomers ? (
                <Button
                  type="button"
                  size="lg"
                  variant="outline"
                  className="h-12 text-base"
                  onClick={() => setCustomerDialogMode('lookup')}
                >
                  <Search className="mr-2 h-5 w-5" />
                  顧客検索
                </Button>
              ) : null}
            </div>

            {canReadCustomers ? (
              <form className="space-y-2 border-t pt-4" onSubmit={handlePhoneSearch}>
                <Label htmlFor="dashboard-phone-search">電話番号</Label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <div className="relative flex-1">
                    <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="dashboard-phone-search"
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      value={phoneQuery}
                      onChange={(event) => {
                        phoneSearchRequestIdRef.current += 1
                        setPhoneQuery(event.target.value)
                        setPhoneResults([])
                        setPhoneSearchStatus('idle')
                        setPhoneSearchMessage(null)
                        setLastSearchedPhone(null)
                      }}
                      placeholder="090-1234-5678"
                      className="pl-9"
                    />
                  </div>
                  <Button
                    type="submit"
                    variant="secondary"
                    disabled={phoneSearchStatus === 'loading'}
                  >
                    {phoneSearchStatus === 'loading' ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="mr-2 h-4 w-4" />
                    )}
                    電話番号で顧客を検索
                  </Button>
                </div>

                {phoneSearchMessage && (
                  <p
                    role={phoneSearchStatus === 'error' ? 'alert' : 'status'}
                    className={cn(
                      'text-sm',
                      phoneSearchStatus === 'error' ? 'text-destructive' : 'text-muted-foreground'
                    )}
                  >
                    {phoneSearchMessage}
                  </p>
                )}

                {canRegisterSearchedPhone ? (
                  <Button asChild>
                    <Link
                      href={`/admin/customers/new?returnTo=reservation&phone=${encodeURIComponent(lastSearchedPhone)}&store=${encodeURIComponent(currentStore.slug)}`}
                    >
                      この番号で新規顧客を登録
                    </Link>
                  </Button>
                ) : null}

                {phoneResults.length > 0 && (
                  <div className="space-y-2 pt-2">
                    {phoneResults.map((customer) => (
                      <div
                        key={customer.id}
                        className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div>
                          <p className="font-medium">{customer.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatPhoneNumber(customer.phone)}
                          </p>
                        </div>
                        <div className="flex flex-col gap-2 sm:flex-row">
                          <Button size="sm" variant="outline" asChild>
                            <Link
                              href={`/admin/customers/${encodeURIComponent(customer.id)}`}
                              aria-label={`${customer.name}の顧客詳細を見る`}
                            >
                              顧客詳細を見る
                            </Link>
                          </Button>
                          {canCreateReservation ? (
                            <Button size="sm" asChild>
                              <Link
                                href={`/admin/reservation?customerId=${encodeURIComponent(customer.id)}`}
                                aria-label={`${customer.name}で予約を作成`}
                              >
                                この顧客で予約
                              </Link>
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </form>
            ) : null}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold leading-none tracking-tight">本日出勤一覧</h2>
                <CardDescription className="mt-2">出勤開始時刻順で表示しています。</CardDescription>
              </div>
              <Badge variant="secondary">出勤 {todaysWorkingCasts.length}名</Badge>
            </div>
            <Button variant="outline" size="sm" className="w-full sm:w-fit" asChild>
              <Link href="/admin/cast/weekly-schedule">週間出勤表を見る</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {todaysWorkingCasts.length === 0 ? (
              <div className="flex min-h-24 items-center justify-center rounded-lg border border-dashed px-4 text-center text-sm text-muted-foreground">
                本日の出勤予定はありません。週間出勤表で登録状況を確認できます。
              </div>
            ) : (
              <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                {todaysWorkingCasts.map(({ entry, shift }) => (
                  <div
                    key={entry.castId}
                    className="flex items-center justify-between gap-4 rounded-lg border p-3"
                  >
                    <p className="font-medium">{entry.name}</p>
                    <Badge variant="outline" className="whitespace-nowrap">
                      {shift?.startTime ?? '--:--'}〜{shift?.endTime ?? '--:--'}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold leading-none tracking-tight">
              <Clock className="h-5 w-5 text-emerald-600" />
              直近の予約
            </h2>
            <CardDescription>
              {hasUpcomingReservations
                ? '今から48時間以内に始まる予約です。行を押すと内容を確認できます。'
                : '直近の予約5件です。行を押すと内容を確認できます。'}
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link href="/admin/reservation-list">
              すべて見る
              <ArrowUpRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {displayReservations.length === 0 ? (
              <div className="flex h-24 items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
                表示できる予約がありません
              </div>
            ) : (
              displayReservations.map((reservation) => {
                const customerDisplayName =
                  reservation.customerName ??
                  (reservation.customerId ? `顧客${reservation.customerId.slice(0, 8)}` : '顧客')
                const staffDisplayName =
                  reservation.staffName ??
                  (reservation.staffId
                    ? `担当キャスト${reservation.staffId.slice(0, 8)}`
                    : '担当キャスト')
                const startAt =
                  reservation.startTime instanceof Date
                    ? reservation.startTime
                    : new Date(reservation.startTime)
                const endAt =
                  reservation.endTime instanceof Date
                    ? reservation.endTime
                    : new Date(reservation.endTime)
                const timingBadge = hasUpcomingReservations ? getUpcomingTimingBadge(startAt) : null

                return (
                  <div
                    key={reservation.id}
                    className="flex cursor-pointer items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/50"
                    onClick={() => setSelectedReservation(reservation)}
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{customerDisplayName}</p>
                        <StatusBadge status={reservation.status} />
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">担当: {staffDisplayName}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatInTimeZone(startAt, JST_TIMEZONE, 'MM月dd日 HH:mm')} -{' '}
                        {formatInTimeZone(endAt, JST_TIMEZONE, 'HH:mm')}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      {canViewFinancials ? (
                        <p className="font-medium">¥{reservation.price.toLocaleString()}</p>
                      ) : null}
                      {timingBadge ? (
                        <Badge variant={timingBadge.variant} className="whitespace-nowrap">
                          {timingBadge.label}
                        </Badge>
                      ) : null}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </CardContent>
      </Card>

      <ReservationDialog
        open={!!selectedReservation}
        onOpenChange={(open) => !open && setSelectedReservation(null)}
        reservation={selectedReservation ? convertToReservationData(selectedReservation) : null}
        onSave={canUpdateReservations ? handleReservationSave : undefined}
      />

      {canReadCustomers && (customerDialogMode !== 'reservation' || canCreateReservation) ? (
        <CustomerSelectionDialog
          open={customerDialogMode !== null}
          mode={customerDialogMode ?? 'reservation'}
          onOpenChange={(open) => {
            if (!open) setCustomerDialogMode(null)
          }}
        />
      ) : null}
    </div>
  )
}
