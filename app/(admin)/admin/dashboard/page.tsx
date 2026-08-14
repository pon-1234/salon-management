/**
 * @design_doc   docs/LEGACY_GOLD_ADMIN_MIGRATION_INVENTORY.md admin dashboard mapping
 * @related_to   CustomerSelectionDialog, CastScheduleUseCases, and dashboard.utils
 * @known_issues None currently
 */
'use client'

import { useState, useEffect, useMemo, type FormEvent } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  TrendingUp,
  TrendingDown,
  Users,
  Calendar,
  DollarSign,
  Clock,
  Activity,
  ArrowUpRight,
  BarChart3,
  PieChart,
  Target,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Sparkles,
  Loader2,
  Phone,
  Search,
  FileText,
} from 'lucide-react'
import { getAllReservations } from '@/lib/reservation/data'
import { subDays, addHours, subHours, differenceInMinutes } from 'date-fns'
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
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart as RePieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from 'recharts'
import { useSession } from 'next-auth/react'
import { hasPermission } from '@/lib/auth/permissions'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { toast } from '@/hooks/use-toast'
import { CastScheduleUseCases } from '@/lib/cast-schedule/usecases'
import type { WeeklySchedule } from '@/lib/cast-schedule/old-types'
import {
  fetchAllDashboardReservations,
  getDashboardQueryWindow,
  getJstPeriodBounds,
  isWithinPeriod,
  sumActiveReservationRevenue,
  type DashboardPeriod,
} from './dashboard.utils'

const JST_TIMEZONE = 'Asia/Tokyo'
const castScheduleUseCases = new CastScheduleUseCases()

interface PhoneCustomerSearchResult {
  id: string
  name: string
  phone: string
}

type PhoneSearchStatus = 'idle' | 'loading' | 'ready' | 'error'

// カラーパレット
const colors = {
  primary: '#8b5cf6',
  secondary: '#ec4899',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#3b82f6',
}

// KPIカード用のインターフェース
interface KPICardProps {
  title: string
  value: string | number
  change?: number
  changeLabel?: string
  icon: React.ReactNode
  trend?: 'up' | 'down' | 'neutral'
  color?: 'primary' | 'success' | 'warning' | 'danger'
  sparklineData?: number[]
}

// KPIカードコンポーネント
function KPICard({
  title,
  value,
  change,
  changeLabel,
  icon,
  trend,
  color = 'primary',
  sparklineData,
}: KPICardProps) {
  const trendColors = {
    up: 'text-green-600',
    down: 'text-red-600',
    neutral: 'text-gray-600',
  }

  const bgColors = {
    primary: 'bg-purple-100',
    success: 'bg-green-100',
    warning: 'bg-yellow-100',
    danger: 'bg-red-100',
  }

  const iconColors = {
    primary: 'text-purple-600',
    success: 'text-green-600',
    warning: 'text-yellow-600',
    danger: 'text-red-600',
  }

  return (
    <Card className="transition-shadow duration-300 hover:shadow-lg">
      <CardContent className="p-6">
        <div className="mb-4 flex items-start justify-between">
          <div className={cn('rounded-lg p-3', bgColors[color])}>
            <div className={cn('h-5 w-5', iconColors[color])}>{icon}</div>
          </div>
          {trend && (
            <div className="flex items-center gap-1">
              {trend === 'up' ? (
                <TrendingUp className="h-4 w-4 text-green-600" />
              ) : trend === 'down' ? (
                <TrendingDown className="h-4 w-4 text-red-600" />
              ) : null}
              {change !== undefined && (
                <span className={cn('text-sm font-medium', trendColors[trend])}>
                  {change > 0 ? '+' : ''}
                  {change}%
                </span>
              )}
            </div>
          )}
        </div>

        <div className="space-y-1">
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
          {changeLabel && <p className="text-xs text-muted-foreground">{changeLabel}</p>}
        </div>

        {sparklineData && sparklineData.length > 0 && (
          <div className="mt-4 h-12">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sparklineData.map((v, i) => ({ value: v, index: i }))}>
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke={colors[color] || colors.primary}
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// ステータスバッジコンポーネント
function StatusBadge({ status }: { status: string }) {
  const statusConfig = {
    confirmed: {
      label: '確定',
      variant: 'default' as const,
      icon: <CheckCircle2 className="h-3 w-3" />,
    },
    pending: {
      label: '保留中',
      variant: 'secondary' as const,
      icon: <Clock className="h-3 w-3" />,
    },
    cancelled: {
      label: 'キャンセル',
      variant: 'destructive' as const,
      icon: <XCircle className="h-3 w-3" />,
    },
    completed: {
      label: '完了',
      variant: 'outline' as const,
      icon: <CheckCircle2 className="h-3 w-3" />,
    },
    modifiable: {
      label: '修正可能',
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
    return {
      label: '施術中',
      variant: 'secondary' as const,
    }
  }

  if (minutesUntil <= 30) {
    return {
      label: 'まもなく開始',
      variant: 'default' as const,
    }
  }

  if (minutesUntil < 60) {
    return {
      label: `${minutesUntil}分後に開始`,
      variant: 'success' as const,
    }
  }

  if (minutesUntil < 180) {
    return {
      label: `開始まで約${Math.round(minutesUntil / 60)}時間`,
      variant: 'success' as const,
    }
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
  const isAdmin = session?.user?.role === 'admin'
  const isAdminUser = isAdmin
  const canViewAnalytics = hasPermission(grantedPermissions, 'analytics:read')
  const canViewFinancials = canViewAnalytics || hasPermission(grantedPermissions, 'dashboard:view')
  const canUpdateReservations = hasPermission(grantedPermissions, 'reservation:update')

  const [reservations, setReservations] = useState<Reservation[]>([])
  const [weeklySchedule, setWeeklySchedule] = useState<WeeklySchedule | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState<DashboardPeriod>('today')
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null)
  const [customerDialogMode, setCustomerDialogMode] = useState<'reservation' | 'lookup' | null>(
    null
  )
  const [phoneQuery, setPhoneQuery] = useState('')
  const [phoneResults, setPhoneResults] = useState<PhoneCustomerSearchResult[]>([])
  const [phoneSearchStatus, setPhoneSearchStatus] = useState<PhoneSearchStatus>('idle')
  const [phoneSearchMessage, setPhoneSearchMessage] = useState<string | null>(null)

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
      const queryWindow = getDashboardQueryWindow(selectedPeriod, now)
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
  }, [currentStore.id, isAdminUser, selectedPeriod, status])

  const isSessionLoading = status === 'loading'
  const isUnauthorized = !isSessionLoading && !isAdminUser

  // 予約データをダイアログ用に変換
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
    const normalizedPhone = phoneQuery.replace(/\D/g, '')

    if (normalizedPhone.length < 3) {
      setPhoneResults([])
      setPhoneSearchStatus('error')
      setPhoneSearchMessage('電話番号を3桁以上入力してください。')
      return
    }

    setPhoneSearchStatus('loading')
    setPhoneSearchMessage(null)

    try {
      const response = await fetch(
        `/api/customer?phone=${encodeURIComponent(normalizedPhone)}&limit=10`,
        { credentials: 'include', cache: 'no-store' }
      )
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
      setPhoneResults(results)
      setPhoneSearchStatus('ready')
      setPhoneSearchMessage(results.length === 0 ? '該当する顧客が見つかりませんでした。' : null)
    } catch (error) {
      console.error('Dashboard customer phone search failed:', error)
      setPhoneResults([])
      setPhoneSearchStatus('error')
      setPhoneSearchMessage('顧客検索に失敗しました。もう一度お試しください。')
    }
  }

  const filteredReservations = useMemo(() => {
    const bounds = getJstPeriodBounds(selectedPeriod)
    return reservations.filter((reservation) =>
      isWithinPeriod(new Date(reservation.startTime), bounds)
    )
  }, [reservations, selectedPeriod])

  const previousPeriodReservations = useMemo(() => {
    const bounds = getJstPeriodBounds(selectedPeriod, new Date(), true)
    return reservations.filter((reservation) =>
      isWithinPeriod(new Date(reservation.startTime), bounds)
    )
  }, [reservations, selectedPeriod])

  const kpis = useMemo(() => {
    const activeReservations = filteredReservations.filter(
      (reservation) => reservation.status !== 'cancelled'
    )
    const activePreviousReservations = previousPeriodReservations.filter(
      (reservation) => reservation.status !== 'cancelled'
    )
    const totalRevenue = sumActiveReservationRevenue(filteredReservations)
    const avgRevenue = activeReservations.length > 0 ? totalRevenue / activeReservations.length : 0
    const confirmedCount = activeReservations.filter((r) => r.status === 'confirmed').length
    const cancelledCount = filteredReservations.length - activeReservations.length
    const cancelRate =
      filteredReservations.length > 0 ? (cancelledCount / filteredReservations.length) * 100 : 0

    const previousRevenue = sumActiveReservationRevenue(previousPeriodReservations)
    const revenueChange =
      previousRevenue > 0 ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 : 0

    return {
      totalRevenue,
      avgRevenue,
      confirmedCount,
      cancelRate,
      revenueChange,
      totalBookings: activeReservations.length,
      previousBookings: activePreviousReservations.length,
    }
  }, [filteredReservations, previousPeriodReservations])

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

  // 売上推移データ
  const salesData = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const date = subDays(new Date(), 6 - i)
      const dayReservations = reservations.filter(
        (reservation) =>
          reservation.status !== 'cancelled' &&
          formatInTimeZone(new Date(reservation.startTime), JST_TIMEZONE, 'yyyy-MM-dd') ===
            formatInTimeZone(date, JST_TIMEZONE, 'yyyy-MM-dd')
      )
      return {
        date: formatInTimeZone(date, JST_TIMEZONE, 'MM/dd'),
        revenue: sumActiveReservationRevenue(dayReservations),
        count: dayReservations.length,
      }
    })
  }, [reservations])
  const hourlyData = useMemo(() => {
    const hourly = Array.from({ length: 24 }, (_, hour) => ({
      hour: `${hour}時`,
      count: 0,
      revenue: 0,
    }))

    filteredReservations
      .filter((reservation) => reservation.status !== 'cancelled')
      .forEach((r) => {
        const hour = Number(formatInTimeZone(new Date(r.startTime), JST_TIMEZONE, 'H'))
        hourly[hour].count += 1
        hourly[hour].revenue += r.price
      })

    return hourly.filter((h) => h.count > 0)
  }, [filteredReservations])

  const statusDistribution = useMemo(
    () => [
      {
        name: '確定済み',
        value: filteredReservations.filter((r) => r.status === 'confirmed').length,
        color: colors.success,
      },
      {
        name: '保留中',
        value: filteredReservations.filter((r) => r.status === 'pending').length,
        color: colors.warning,
      },
      {
        name: 'キャンセル',
        value: filteredReservations.filter((r) => r.status === 'cancelled').length,
        color: colors.danger,
      },
      {
        name: '修正可能',
        value: filteredReservations.filter((r) => r.status === 'modifiable').length,
        color: colors.info,
      },
    ],
    [filteredReservations]
  )

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
      <div className="flex min-h-[60vh] items-center justify-center bg-gray-50 p-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          ダッシュボードを読み込み中です...
        </div>
      </div>
    )
  }

  if (isUnauthorized) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-gray-50 p-6">
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
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={index} className="animate-pulse">
              <CardContent className="space-y-3 p-6">
                <div className="h-4 w-24 rounded bg-muted" />
                <div className="h-7 w-32 rounded bg-muted" />
                <div className="h-3 w-full rounded bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="animate-pulse">
          <CardContent className="space-y-4 p-6">
            <div className="h-4 w-32 rounded bg-muted" />
            <div className="h-56 rounded bg-muted" />
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      {/* ヘッダー */}
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold">
            <Sparkles className="h-8 w-8 text-purple-600" />
            ダッシュボード
          </h1>
          <p className="mt-1 text-muted-foreground">
            {formatInTimeZone(new Date(), JST_TIMEZONE, 'yyyy年MM月dd日 (E)', {
              locale: ja,
            })}{' '}
            {currentStore.displayName}の状況
          </p>
        </div>

        <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
          {canViewAnalytics && (
            <Button variant="outline" asChild>
              <Link href="/admin/analytics/daily-report" aria-label="業務日報を開く">
                <FileText className="mr-2 h-4 w-4" />
                業務日報
              </Link>
            </Button>
          )}
          <Tabs
            value={selectedPeriod}
            onValueChange={(value) => {
              if (value === 'today' || value === 'week' || value === 'month') {
                setSelectedPeriod(value)
              }
            }}
          >
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="today">今日</TabsTrigger>
              <TabsTrigger value="week">今週</TabsTrigger>
              <TabsTrigger value="month">今月</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card className="border-purple-200 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-purple-600" />
              予約受付
            </CardTitle>
            <CardDescription>
              予約作成と顧客情報の確認は、それぞれ専用の入口から操作できます。
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <Button
                type="button"
                size="lg"
                className="h-12 text-base"
                onClick={() => setCustomerDialogMode('reservation')}
              >
                <Calendar className="mr-2 h-5 w-5" />
                予約作成
              </Button>
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
            </div>

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
                    onChange={(event) => setPhoneQuery(event.target.value)}
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

              {phoneResults.length > 0 && (
                <div className="space-y-2 pt-2">
                  {phoneResults.map((customer) => (
                    <div
                      key={customer.id}
                      className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="font-medium">{customer.name}</p>
                        <p className="text-sm text-muted-foreground">{customer.phone}</p>
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
                        <Button size="sm" asChild>
                          <Link
                            href={`/admin/reservation?customerId=${encodeURIComponent(customer.id)}`}
                            aria-label={`${customer.name}で予約を作成`}
                          >
                            この顧客で予約
                          </Link>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </form>
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

      {/* メインKPIカード */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {canViewFinancials ? (
          <KPICard
            title="総売上"
            value={`¥${kpis.totalRevenue.toLocaleString()}`}
            change={Math.round(kpis.revenueChange)}
            changeLabel={`前${selectedPeriod === 'today' ? '日' : selectedPeriod === 'week' ? '週' : '月'}比`}
            icon={<DollarSign />}
            trend={kpis.revenueChange > 0 ? 'up' : kpis.revenueChange < 0 ? 'down' : 'neutral'}
            color="primary"
            sparklineData={salesData.map((d) => d.revenue)}
          />
        ) : (
          <KPICard
            title="総売上"
            value="閲覧不可"
            changeLabel="売上情報の閲覧権限がありません"
            icon={<DollarSign />}
            color="primary"
          />
        )}

        <KPICard
          title="予約数"
          value={kpis.totalBookings}
          change={
            kpis.previousBookings > 0
              ? Math.round(
                  ((kpis.totalBookings - kpis.previousBookings) / kpis.previousBookings) * 100
                )
              : 0
          }
          changeLabel={`${kpis.confirmedCount}件確定済み`}
          icon={<Calendar />}
          trend={
            kpis.totalBookings > kpis.previousBookings
              ? 'up'
              : kpis.totalBookings < kpis.previousBookings
                ? 'down'
                : 'neutral'
          }
          color="success"
          sparklineData={salesData.map((d) => d.count)}
        />

        {canViewFinancials ? (
          <KPICard
            title="平均単価"
            value={`¥${Math.round(kpis.avgRevenue).toLocaleString()}`}
            icon={<Target />}
            color="warning"
          />
        ) : (
          <KPICard
            title="ステータス進捗"
            value={`${kpis.confirmedCount}件 確定済み`}
            changeLabel={`${reservations.filter((r) => r.status === 'pending').length}件が保留中`}
            icon={<Target />}
            color="warning"
          />
        )}

        <KPICard
          title="キャンセル率"
          value={`${kpis.cancelRate.toFixed(1)}%`}
          icon={<AlertCircle />}
          trend={kpis.cancelRate > 10 ? 'down' : 'neutral'}
          color={kpis.cancelRate > 10 ? 'danger' : 'success'}
        />
      </div>

      {/* チャートセクション */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* 売上推移 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              売上推移
            </CardTitle>
            <CardDescription>過去7日間の売上と予約数</CardDescription>
          </CardHeader>
          <CardContent>
            {canViewFinancials ? (
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={salesData}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={colors.primary} stopOpacity={0.8} />
                        <stop offset="95%" stopColor={colors.primary} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip
                      formatter={(value: any) => `¥${value.toLocaleString()}`}
                      labelFormatter={(label) => `日付: ${label}`}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke={colors.primary}
                      fillOpacity={1}
                      fill="url(#colorRevenue)"
                    />
                    <Line
                      type="monotone"
                      dataKey="count"
                      stroke={colors.secondary}
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-muted-foreground/40 bg-muted/20 text-sm text-muted-foreground">
                売上チャートを表示する権限がありません
              </div>
            )}
          </CardContent>
        </Card>

        {/* ステータス分布 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              予約ステータス分布
            </CardTitle>
            <CardDescription>選択期間の予約ステータス内訳</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <RePieChart>
                  <Pie
                    data={statusDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {statusDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </RePieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 時間帯別分析 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            時間帯別予約状況
          </CardTitle>
          <CardDescription>予約が集中する時間帯の分析</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill={colors.info} radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* クイックアクション */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="cursor-pointer transition-shadow hover:shadow-lg">
          <CardContent className="p-6">
            <div
              onClick={() => setCustomerDialogMode('reservation')}
              className="flex cursor-pointer items-center justify-between"
            >
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-blue-100 p-3">
                  <Calendar className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium">新規予約</p>
                  <p className="text-sm text-muted-foreground">予約を作成</p>
                </div>
              </div>
              <ArrowUpRight className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer transition-shadow hover:shadow-lg">
          <CardContent className="p-6">
            <Link href="/admin/analytics/daily-sales" className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-purple-100 p-3">
                  <BarChart3 className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="font-medium">詳細分析</p>
                  <p className="text-sm text-muted-foreground">レポートを表示</p>
                </div>
              </div>
              <ArrowUpRight className="h-5 w-5 text-muted-foreground" />
            </Link>
          </CardContent>
        </Card>

        <Card className="cursor-pointer transition-shadow hover:shadow-lg">
          <CardContent className="p-6">
            <Link href="/admin/cast/list" className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-green-100 p-3">
                  <Users className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="font-medium">キャスト管理</p>
                  <p className="text-sm text-muted-foreground">担当キャスト一覧</p>
                </div>
              </div>
              <ArrowUpRight className="h-5 w-5 text-muted-foreground" />
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* 最近の予約 */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              最近の予約
            </CardTitle>
            <CardDescription>
              {hasUpcomingReservations
                ? '今後48時間以内に開始する予約を表示しています'
                : '最新の予約5件を表示しています'}
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
          <div className="space-y-4">
            {displayReservations.length === 0 ? (
              <div className="flex h-24 items-center justify-center rounded-lg border border-dashed border-muted-foreground/40 text-sm text-muted-foreground">
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
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-400" />
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{customerDisplayName}</p>
                          <Badge variant="outline" className="font-mono text-xs uppercase">
                            {reservation.id.slice(0, 8)}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">担当: {staffDisplayName}</p>
                        <p className="whitespace-nowrap text-xs text-muted-foreground">
                          {formatInTimeZone(startAt, JST_TIMEZONE, 'MM月dd日 HH:mm')} -{' '}
                          {formatInTimeZone(endAt, JST_TIMEZONE, 'HH:mm')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-medium">¥{reservation.price.toLocaleString()}</p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        {timingBadge && (
                          <Badge variant={timingBadge.variant} className="whitespace-nowrap">
                            {timingBadge.label}
                          </Badge>
                        )}
                        <StatusBadge status={reservation.status} />
                      </div>
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

      <CustomerSelectionDialog
        open={customerDialogMode !== null}
        mode={customerDialogMode ?? 'reservation'}
        onOpenChange={(open) => {
          if (!open) setCustomerDialogMode(null)
        }}
      />
    </div>
  )
}
