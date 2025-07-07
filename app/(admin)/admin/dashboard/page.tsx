'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  TrendingUp,
  TrendingDown,
  Users,
  Calendar,
  DollarSign,
  Clock,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  PieChart,
  Target,
  Award,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Timer,
  UserCheck,
  MessageSquare,
  Sparkles,
} from 'lucide-react'
import { getAllReservations } from '@/lib/reservation/data'
import {
  format,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  subDays,
  subMonths,
} from 'date-fns'
import { ja } from 'date-fns/locale'
import { Reservation } from '@/lib/types/reservation'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { ReservationDialog } from '@/components/reservation/reservation-dialog'
import { ReservationData } from '@/lib/types/reservation'
import { recordModification } from '@/lib/modification-history/data'
import { CustomerSelectionDialog } from '@/components/customer/customer-selection-dialog'
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

// カラーパレット
const colors = {
  primary: '#8b5cf6',
  secondary: '#ec4899',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  info: '#3b82f6',
  muted: '#6b7280',
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

export default function DashboardPage() {
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month'>('today')
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null)
  const [showCustomerSelection, setShowCustomerSelection] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const fetchedReservations = await getAllReservations()
        setReservations(fetchedReservations)
      } catch (error) {
        console.error('Failed to fetch reservations:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  // 予約データをダイアログ用に変換
  const convertToReservationData = (reservation: Reservation): ReservationData | null => {
    if (!reservation) return null

    return {
      id: reservation.id,
      customerId: reservation.customerId,
      customerName: `顧客${reservation.customerId}`, // 実際のデータから取得
      customerType: '通常顧客',
      phoneNumber: '090-1234-5678', // 実際のデータから取得
      points: 100,
      bookingStatus: reservation.status,
      staffConfirmation: '確認済み',
      customerConfirmation: '確認済み',
      prefecture: '東京都',
      district: '渋谷区',
      location: 'アパホテル',
      locationType: 'ホテル',
      specificLocation: '502号室',
      staff: `スタッフ${reservation.staffId}`,
      marketingChannel: 'WEB',
      date: format(reservation.startTime, 'yyyy-MM-dd'),
      time: format(reservation.startTime, 'HH:mm'),
      inOutTime: `${format(reservation.startTime, 'HH:mm')}-${format(reservation.endTime, 'HH:mm')}`,
      course: 'リラクゼーションコース',
      freeExtension: 'なし',
      designation: '指名',
      designationFee: '3,000円',
      options: {},
      transportationFee: 0,
      paymentMethod: '現金',
      discount: '0円',
      additionalFee: 0,
      totalPayment: reservation.price,
      storeRevenue: Math.floor(reservation.price * 0.6),
      staffRevenue: Math.floor(reservation.price * 0.4),
      staffBonusFee: 0,
      startTime: reservation.startTime,
      endTime: reservation.endTime,
      staffImage: '/placeholder-user.jpg',
    }
  }

  const handleMakeModifiable = (reservationId: string) => {
    const reservation = reservations.find((r) => r.id === reservationId)
    if (!reservation) return

    // 修正履歴を記録
    recordModification(
      reservationId,
      'user_current', // 実際のアプリではログインユーザーIDを使用
      '現在のユーザー', // 実際のアプリではログインユーザー名を使用
      'status',
      'ステータス',
      reservation.status,
      'modifiable',
      '確定済み予約を修正可能状態に変更',
      '192.168.1.100', // 実際のアプリでは実際のIPを取得
      navigator.userAgent,
      'current_session'
    )

    setReservations((prev) =>
      prev.map((reservation) =>
        reservation.id === reservationId
          ? {
              ...reservation,
              status: 'modifiable' as const,
              modifiableUntil: new Date(Date.now() + 30 * 60 * 1000), // 30分後まで修正可能
              lastModified: new Date(),
            }
          : reservation
      )
    )
  }

  // 期間に基づくデータフィルタリング
  const getFilteredData = () => {
    const now = new Date()
    let startDate: Date
    let endDate: Date

    switch (selectedPeriod) {
      case 'today':
        startDate = startOfDay(now)
        endDate = endOfDay(now)
        break
      case 'week':
        startDate = startOfWeek(now, { locale: ja })
        endDate = endOfWeek(now, { locale: ja })
        break
      case 'month':
        startDate = startOfMonth(now)
        endDate = endOfMonth(now)
        break
    }

    return reservations.filter((r) => r.startTime >= startDate && r.startTime <= endDate)
  }

  // KPI計算
  const calculateKPIs = () => {
    const filtered = getFilteredData()
    const totalRevenue = filtered.reduce((sum, r) => sum + r.price, 0)
    const avgRevenue = filtered.length > 0 ? totalRevenue / filtered.length : 0
    const confirmedCount = filtered.filter((r) => r.status === 'confirmed').length
    const cancelledCount = filtered.filter((r) => r.status === 'cancelled').length
    const cancelRate = filtered.length > 0 ? (cancelledCount / filtered.length) * 100 : 0

    // 前期間との比較
    const previousFiltered = reservations.filter((r) => {
      const now = new Date()
      let startDate: Date
      let endDate: Date

      switch (selectedPeriod) {
        case 'today':
          startDate = startOfDay(subDays(now, 1))
          endDate = endOfDay(subDays(now, 1))
          break
        case 'week':
          startDate = startOfWeek(subDays(now, 7), { locale: ja })
          endDate = endOfWeek(subDays(now, 7), { locale: ja })
          break
        case 'month':
          startDate = startOfMonth(subMonths(now, 1))
          endDate = endOfMonth(subMonths(now, 1))
          break
      }

      return r.startTime >= startDate && r.startTime <= endDate
    })

    const previousRevenue = previousFiltered.reduce((sum, r) => sum + r.price, 0)
    const revenueChange =
      previousRevenue > 0 ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 : 0

    return {
      totalRevenue,
      avgRevenue,
      confirmedCount,
      cancelRate,
      revenueChange,
      totalBookings: filtered.length,
      previousBookings: previousFiltered.length,
    }
  }

  const kpis = calculateKPIs()

  // 売上推移データの生成
  const generateSalesData = () => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = subDays(new Date(), 6 - i)
      const dayReservations = reservations.filter(
        (r) => format(r.startTime, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
      )
      return {
        date: format(date, 'MM/dd'),
        revenue: dayReservations.reduce((sum, r) => sum + r.price, 0),
        count: dayReservations.length,
      }
    })
    return last7Days
  }

  // 時間帯別予約データ
  const generateHourlyData = () => {
    const hourlyData = Array.from({ length: 24 }, (_, hour) => ({
      hour: `${hour}時`,
      count: 0,
      revenue: 0,
    }))

    getFilteredData().forEach((r) => {
      const hour = r.startTime.getHours()
      hourlyData[hour].count += 1
      hourlyData[hour].revenue += r.price
    })

    return hourlyData.filter((h) => h.count > 0)
  }

  // ステータス別分布
  const statusDistribution = [
    {
      name: '確定済み',
      value: reservations.filter((r) => r.status === 'confirmed').length,
      color: colors.success,
    },
    {
      name: '保留中',
      value: reservations.filter((r) => r.status === 'pending').length,
      color: colors.warning,
    },
    {
      name: 'キャンセル',
      value: reservations.filter((r) => r.status === 'cancelled').length,
      color: colors.danger,
    },
    {
      name: '修正可能',
      value: reservations.filter((r) => r.status === 'modifiable').length,
      color: colors.info,
    },
  ]

  const salesData = generateSalesData()
  const hourlyData = generateHourlyData()

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
            {format(new Date(), 'yyyy年MM月dd日 (E)', { locale: ja })} 現在の統計
          </p>
        </div>

        <Tabs value={selectedPeriod} onValueChange={(v) => setSelectedPeriod(v as any)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="today">今日</TabsTrigger>
            <TabsTrigger value="week">今週</TabsTrigger>
            <TabsTrigger value="month">今月</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* メインKPIカード */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
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

        <KPICard
          title="平均単価"
          value={`¥${Math.round(kpis.avgRevenue).toLocaleString()}`}
          icon={<Target />}
          color="warning"
        />

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
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* ステータス分布 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              予約ステータス分布
            </CardTitle>
            <CardDescription>全期間の予約ステータス内訳</CardDescription>
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
              onClick={() => setShowCustomerSelection(true)}
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
                  <p className="text-sm text-muted-foreground">スタッフ一覧</p>
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
            <CardDescription>直近の予約状況</CardDescription>
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
            {reservations.slice(0, 5).map((reservation) => (
              <div
                key={reservation.id}
                className="flex cursor-pointer items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/50"
                onClick={() => setSelectedReservation(reservation)}
              >
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-purple-400 to-pink-400" />
                  <div>
                    <p className="font-medium">予約ID: {reservation.id}</p>
                    <p className="text-sm text-muted-foreground">
                      {format(reservation.startTime, 'MM月dd日 HH:mm')} -{' '}
                      {format(reservation.endTime, 'HH:mm')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="font-medium">¥{reservation.price.toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground">スタッフ{reservation.staffId}</p>
                  </div>
                  <StatusBadge status={reservation.status} />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <ReservationDialog
        open={!!selectedReservation}
        onOpenChange={(open) => !open && setSelectedReservation(null)}
        reservation={selectedReservation ? convertToReservationData(selectedReservation) : null}
      />

      <CustomerSelectionDialog
        open={showCustomerSelection}
        onOpenChange={setShowCustomerSelection}
      />
    </div>
  )
}
