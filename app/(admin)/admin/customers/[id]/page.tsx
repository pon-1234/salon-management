'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { DatePicker } from '@/components/ui/date-picker'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  MessageSquare,
  Crown,
  Calendar,
  Clock,
  Phone,
  Mail,
  Edit3,
  Save,
  X,
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  UserX,
  Plus,
  Trash2,
  FileText,
  Edit,
  Calendar as CalendarIcon,
} from 'lucide-react'
import { format } from 'date-fns'
import {
  Customer,
  CustomerUsageRecord,
  CustomerPointHistory,
  CustomerInsights,
  NgCastEntry,
} from '@/lib/customer/types'
import { Reservation } from '@/lib/types/reservation'
import { Cast } from '@/lib/cast/types'
import { FALLBACK_IMAGE, normalizeCastList } from '@/lib/cast/mapper'
import { getAllCasts } from '@/lib/cast/data'
import { NgCastDialog } from '@/components/customer/ng-cast-dialog'
import { ReservationDialog } from '@/components/reservation/reservation-dialog'
import { ReservationData } from '@/lib/types/reservation'
import { CustomerUseCases } from '@/lib/customer/usecases'
import { CustomerRepositoryImpl } from '@/lib/customer/repository-impl'
import { isVipMember } from '@/lib/utils'
import { calculateAge, deserializeCustomer } from '@/lib/customer/utils'
import { toast } from '@/hooks/use-toast'
import { mapReservationToReservationData } from '@/lib/reservation/transformers'
import { PointAdjustmentDialog } from '@/components/admin/point-adjustment-dialog'

const formSchema = z.object({
  name: z.string().min(1, '名前は必須です'),
  phone: z.string().min(1, '電話番号は必須です'),
  email: z.string().email('有効なメールアドレスを入力してください'),
  password: z
    .string()
    .min(8, 'パスワードは8文字以上で入力してください')
    .max(32, 'パスワードは32文字以下で入力してください'),
  birthDate: z.date({
    required_error: '生年月日を選択してください',
  }),
  memberType: z.enum(['regular', 'vip']),
  smsEnabled: z.boolean(),
  notes: z.string().max(1000, '特徴や好みは1000文字以内で入力してください').optional(),
  points: z.number().min(0),
  pointsToAdd: z.number().min(0).optional(),
  pointsAmount: z.number().min(0).optional(),
})

type FormData = z.infer<typeof formSchema>

type InsightMetric = {
  label: string
  value: string
  helper?: string
}

const NG_ASSIGNMENT_LABELS: Record<'customer' | 'cast' | 'staff', string> = {
  cast: 'キャストNG',
  customer: '顧客NG',
  staff: '店舗NG',
}

export default function CustomerProfile() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const idParam = params?.id
  const id = Array.isArray(idParam) ? idParam[0] : idParam ?? ''

  const [customer, setCustomer] = useState<Customer | null>(null)
  const [usageHistory, setUsageHistory] = useState<CustomerUsageRecord[]>([])
  const [pointHistory, setPointHistory] = useState<CustomerPointHistory[]>([])
  const [reservations, setReservations] = useState<Reservation[]>([])
  const [availableCasts, setAvailableCasts] = useState<Cast[]>([])
  const [isEditing, setIsEditing] = useState(false)
  const [pointsInputEnabled, setPointsInputEnabled] = useState(false)
  const [ngCastDialogOpen, setNgCastDialogOpen] = useState(false)
  const [editingNgCast, setEditingNgCast] = useState<NgCastEntry | null>(null)
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null)
  const [insights, setInsights] = useState<CustomerInsights | null>(null)
  const [insightsLoading, setInsightsLoading] = useState(false)
  const formatYen = (amount: number) => `¥${amount.toLocaleString('ja-JP')}`
  const fetchPointHistory = useCallback(async () => {
    if (!id) return
    try {
      const response = await fetch(
        `/api/customer/points?customerId=${encodeURIComponent(id)}&limit=100`,
        {
          credentials: 'include',
          cache: 'no-store',
        }
      )

      if (!response.ok) {
        throw new Error('ポイント履歴の取得に失敗しました')
      }

      const payload = await response.json()
      const entries: CustomerPointHistory[] = Array.isArray(payload.data)
        ? payload.data.map((entry: any) => ({
            id: entry.id,
            date: entry.createdAt ? new Date(entry.createdAt) : new Date(),
            type: entry.type,
            amount: entry.amount,
            description: entry.description,
            relatedService: entry.relatedService ?? undefined,
            balance: entry.balance,
          }))
        : []

      setPointHistory(entries)
    } catch (error) {
      toast({
        title: 'エラー',
        description:
          error instanceof Error ? error.message : 'ポイント履歴の取得に失敗しました',
        variant: 'destructive',
      })
    }
  }, [id])

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      phone: '',
      email: '',
      password: '',
      memberType: 'regular',
      smsEnabled: false,
      notes: '',
      points: 0,
      pointsToAdd: 0,
      pointsAmount: 0,
    },
  })

  const birthDate = form.watch('birthDate')
  const age = birthDate ? calculateAge(birthDate) : null

  useEffect(() => {
    if (!id) return
    const fetchCustomerData = async () => {
      // Instantiate repository and use cases
      const customerRepository = new CustomerRepositoryImpl()
      const customerUseCases = new CustomerUseCases(customerRepository)

      // Fetch main customer data
      const fetchedCustomer = await customerUseCases.getById(id)

      if (!fetchedCustomer) {
        toast({
          title: 'エラー',
          description: '顧客情報が見つかりませんでした',
          variant: 'destructive',
        })
        router.replace('/admin/customers')
        return
      }

      const normalizedCustomer = deserializeCustomer(fetchedCustomer)
      setCustomer(normalizedCustomer)
      form.reset({
        name: normalizedCustomer.name,
        phone: normalizedCustomer.phone,
        email: normalizedCustomer.email,
        password: normalizedCustomer.password,
        birthDate: normalizedCustomer.birthDate,
        memberType: normalizedCustomer.memberType as 'regular' | 'vip',
        smsEnabled: normalizedCustomer.smsEnabled || false,
        notes: normalizedCustomer.notes || '',
        points: normalizedCustomer.points,
      })

      // TODO: Implement and call APIs for these sections
      setUsageHistory([])
      setReservations([])

      try {
        const response = await fetch('/api/cast', {
          cache: 'no-store',
          credentials: 'include',
        })
        if (response.ok) {
          const payload = await response.json()
          const data = Array.isArray(payload?.data) ? payload.data : payload
          setAvailableCasts(normalizeCastList(data))
        }
      } catch (error) {
        console.error('Failed to load cast list:', error)
      }
    }

    fetchCustomerData()
  }, [id, form, router])

  useEffect(() => {
    fetchPointHistory()
  }, [fetchPointHistory])

  useEffect(() => {
    if (!id) return
    let ignore = false

    const customerRepository = new CustomerRepositoryImpl()
    const customerUseCases = new CustomerUseCases(customerRepository)

    const loadInsights = async () => {
      setInsightsLoading(true)
      try {
        const data = await customerUseCases.getInsights(id)
        if (!ignore) {
          setInsights(data)
        }
      } catch (error) {
        if (!ignore) {
          console.error('Failed to load insights:', error)
          toast({
            title: '指標の取得に失敗しました',
            description: '通信環境をご確認のうえ再度お試しください。',
            variant: 'destructive',
          })
        }
      } finally {
        if (!ignore) {
          setInsightsLoading(false)
        }
      }
    }

    loadInsights()
    return () => {
      ignore = true
    }
  }, [id])

  const handlePointAdjustment = useCallback(
    (delta: number) => {
      setCustomer((prev) =>
        prev
          ? {
              ...prev,
              points: prev.points + delta,
            }
          : prev
      )
      const currentPoints = form.getValues('points') ?? 0
      form.setValue('points', currentPoints + delta)
      fetchPointHistory()
    },
    [fetchPointHistory, form]
  )

  const handleBooking = () => {
    router.push(`/admin/reservation?customerId=${id}`)
  }

  const handleSave = async (data: FormData) => {
    console.log('Updating customer with:', { ...data, age })

    const customerRepository = new CustomerRepositoryImpl()
    const customerUseCases = new CustomerUseCases(customerRepository)

    try {
      const updatedCustomer = await customerUseCases.update(id, {
        name: data.name,
        nameKana: (data as any).nameKana, // Assuming nameKana is part of the form, though not in schema
        phone: data.phone,
        email: data.email,
        password: data.password, // Password should ideally be handled differently
        birthDate: data.birthDate,
        memberType: data.memberType,
        points: data.points,
        // notes and smsEnabled are missing from schema, should be added
      })

      if (updatedCustomer) {
        const normalizedCustomer = deserializeCustomer(updatedCustomer)
        setCustomer(normalizedCustomer)
        form.reset({
          name: normalizedCustomer.name,
          phone: normalizedCustomer.phone,
          email: normalizedCustomer.email,
          password: normalizedCustomer.password,
          birthDate: normalizedCustomer.birthDate,
          memberType: normalizedCustomer.memberType as 'regular' | 'vip',
          smsEnabled: normalizedCustomer.smsEnabled || false,
          notes: normalizedCustomer.notes || '',
          points: normalizedCustomer.points,
        })
      }

      setIsEditing(false)
      console.log('Customer updated successfully')
      // Optionally, show a success toast message
    } catch (error) {
      console.error('Failed to update customer:', error)
      // Optionally, show an error toast message
    }
  }

  const handleCancel = () => {
    setIsEditing(false)
    // Reset form to original values
    if (customer) {
      form.reset({
        name: customer.name,
        phone: customer.phone,
        email: customer.email,
        password: customer.password,
        birthDate: customer.birthDate,
        memberType: customer.memberType,
        smsEnabled: customer.smsEnabled,
        notes: customer.notes || '',
        points: customer.points,
        pointsToAdd: 0,
        pointsAmount: 0,
      })
    }
  }

  const handleAddNgCast = () => {
    setEditingNgCast(null)
    setNgCastDialogOpen(true)
  }

  const handleEditNgCast = (ngCast: NgCastEntry) => {
    setEditingNgCast(ngCast)
    setNgCastDialogOpen(true)
  }

  const mapApiNgCastEntry = (entry: any): NgCastEntry => ({
    castId: entry.castId,
    notes: entry.notes ?? undefined,
    addedDate: entry.assignedAt ? new Date(entry.assignedAt) : new Date(),
    assignedBy: entry.assignedBy ?? 'customer',
  })

  const handleSaveNgCast = async (ngCast: NgCastEntry) => {
    if (!customer) return false
    try {
      const response = await fetch('/api/customer/ng', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          customerId: customer.id,
          castId: ngCast.castId,
          notes: ngCast.notes ?? null,
          assignedBy: ngCast.assignedBy ?? 'cast',
        }),
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        toast({
          title: 'NG設定の保存に失敗しました',
          description: payload?.error ?? '通信環境をご確認のうえ再度お試しください。',
          variant: 'destructive',
        })
        return false
      }

      const payload = await response.json()
      const savedEntry = mapApiNgCastEntry(payload?.data ?? {})

      setCustomer((prev) => {
        if (!prev) return prev
        const filtered = (prev.ngCasts || []).filter((entry) => entry.castId !== savedEntry.castId)
        const merged = [...filtered, savedEntry]
        return {
          ...prev,
          ngCasts: merged,
          ngCastIds: merged.map((entry) => entry.castId),
        }
      })

      toast({
        title: 'NG設定を保存しました',
        description: '以降この組み合わせでの予約は自動的にブロックされます。',
      })
      return true
    } catch (error) {
      console.error('Failed to save NG cast:', error)
      toast({
        title: 'NG設定の保存に失敗しました',
        description: '通信環境をご確認のうえ再度お試しください。',
        variant: 'destructive',
      })
      return false
    }
  }

  const handleRemoveNgCast = async (castId: string) => {
    if (!customer) return

    try {
      const response = await fetch(
        `/api/customer/ng?customerId=${encodeURIComponent(customer.id)}&castId=${encodeURIComponent(castId)}`,
        {
          method: 'DELETE',
          credentials: 'include',
        }
      )

      if (!response.ok) {
        const payload = await response.json().catch(() => null)
        toast({
          title: 'NG設定の解除に失敗しました',
          description: payload?.error ?? '通信環境をご確認のうえ再度お試しください。',
          variant: 'destructive',
        })
        return
      }

      setCustomer((prev) => {
        if (!prev) return prev
        const updatedNgCasts = prev.ngCasts?.filter((ng) => ng.castId !== castId) || []
        const updatedNgCastIds = prev.ngCastIds?.filter((id) => id !== castId) || []
        return {
          ...prev,
          ngCasts: updatedNgCasts,
          ngCastIds: updatedNgCastIds,
        }
      })

      toast({
        title: 'NG設定を解除しました',
      })
    } catch (error) {
      console.error('Failed to remove NG cast:', error)
      toast({
        title: 'NG設定の解除に失敗しました',
        description: '通信環境をご確認のうえ再度お試しください。',
        variant: 'destructive',
      })
    }
  }

  // 予約データをダイアログ用に変換
  const convertToReservationData = (reservation: Reservation): ReservationData | null => {
    if (!reservation) return null

    return mapReservationToReservationData(reservation, {
      casts: availableCasts,
      customers: customer ? [customer] : undefined,
    })
  }

  const insightMetrics: InsightMetric[] = useMemo(() => {
    if (!insights) return []
    const lastVisitLabel = insights.lastVisitDate
      ? format(new Date(insights.lastVisitDate), 'yyyy/MM/dd')
      : '記録なし'
    const averageIntervalLabel =
      typeof insights.averageIntervalDays === 'number'
        ? `約${insights.averageIntervalDays}日`
        : 'データ不足'

    return [
      {
        label: '前回ご利用日',
        value: lastVisitLabel,
        helper: insights.lastCastName ? `担当: ${insights.lastCastName}` : undefined,
      },
      {
        label: 'キャンセル回数(お客様)',
        value: `${insights.customerCancelCount}/${insights.cancellationLimit}回`,
        helper: '上限3回で警告',
      },
      {
        label: '累計利用回数',
        value: `${insights.totalVisits}回`,
        helper: insights.totalVisits > 0 ? '完了済み予約ベース' : undefined,
      },
      {
        label: '本日のチャット数',
        value: `${insights.chatCountToday}回`,
      },
      {
        label: '前回ご利用のキャスト',
        value: insights.lastCastName ?? '未利用',
        helper: insights.lastCastName ? '直近の指名情報' : undefined,
      },
      {
        label: 'キャンセル回数(お店)',
        value: `${insights.storeCancelCount}/${insights.cancellationLimit}回`,
      },
      {
        label: '客単価',
        value: formatYen(insights.averageSpend),
        helper: insights.totalRevenue ? `累計 ${formatYen(insights.totalRevenue)}` : undefined,
      },
      {
        label: '昨日のチャット数',
        value: `${insights.chatCountYesterday}回`,
      },
      {
        label: '平均利用間隔',
        value: averageIntervalLabel,
        helper: insights.totalVisits > 1 ? '過去の来店から算出' : undefined,
      },
      {
        label: '好みのカップサイズ',
        value: insights.preferredBustCup ?? '分析中',
        helper: insights.preferredBustCup ? '過去の指名傾向' : undefined,
      },
      {
        label: '累計価格',
        value: formatYen(insights.totalRevenue),
      },
      {
        label: 'チャット累計数',
        value: `${insights.chatCountTotal}回`,
      },
    ]
  }, [formatYen, insights])

  if (!customer) {
    return <div className="flex h-64 items-center justify-center">Loading...</div>
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {customer.name} <span className="text-base font-medium text-muted-foreground">様</span>
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            会員ID: {customer.id}{' '}
            {customer.phone ? (
              <span className="ml-2">
                TEL: <span className="font-semibold">{customer.phone}</span>
              </span>
            ) : null}
            {customer.email ? (
              <span className="ml-2">
                MAIL: <span className="font-semibold">{customer.email}</span>
              </span>
            ) : null}
          </p>
          <div className="mt-3 flex items-center gap-3">
            <Badge variant="secondary" className="bg-blue-100 text-blue-700">
              <Crown className="mr-1 h-4 w-4" />
              {isVipMember(customer.memberType) ? 'VIPメンバー' : '通常会員'}
            </Badge>
            <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">
              レギュラーステージ
            </Badge>
            <Badge variant="outline" className="bg-gray-50 text-gray-600">
              ポイント残高: {customer.points.toLocaleString()}pt
            </Badge>
          </div>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={handleBooking}
            className="bg-emerald-600 text-white hover:bg-emerald-700"
          >
            新規予約
          </Button>
          {!isEditing ? (
            <Button
              onClick={() => setIsEditing(true)}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Edit3 className="h-4 w-4" />
              編集
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button
                onClick={form.handleSubmit(handleSave)}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700"
              >
                <Save className="h-4 w-4" />
                保存
              </Button>
              <Button onClick={handleCancel} variant="outline" className="flex items-center gap-2">
                <X className="h-4 w-4" />
                キャンセル
              </Button>
            </div>
          )}
        </div>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center justify-between text-lg">
            お客様の傾向
            {insights && (
              <span className="text-xs font-normal text-muted-foreground">
                {insights.totalVisits > 0
                  ? `累計 ${insights.totalVisits}件の利用履歴から算出`
                  : '利用履歴なし'}
              </span>
            )}
          </CardTitle>
          <CardDescription>予約およびチャット履歴から自動で集計された警戒度と嗜好データ</CardDescription>
        </CardHeader>
        <CardContent>
          {insightsLoading ? (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {Array.from({ length: 12 }).map((_, index) => (
                <div key={index} className="h-20 animate-pulse rounded-lg bg-muted/60" />
              ))}
            </div>
          ) : insightMetrics.length > 0 ? (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {insightMetrics.map((metric) => (
                <div key={metric.label} className="rounded-lg border bg-card p-3 shadow-sm">
                  <p className="text-xs font-medium text-muted-foreground">{metric.label}</p>
                  <p className="mt-1 text-xl font-semibold text-gray-900">{metric.value}</p>
                  {metric.helper && (
                    <p className="text-xs text-muted-foreground">{metric.helper}</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              指標を算出するためのデータが不足しています。
            </div>
          )}
        </CardContent>
      </Card>

      {/* 予約情報カード */}
      <Card
        className={`shadow-sm ${reservations.length > 0 ? 'border-emerald-200 bg-emerald-50' : 'border-gray-200 bg-gray-50'}`}
      >
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar
                className={`h-5 w-5 ${reservations.length > 0 ? 'text-emerald-600' : 'text-gray-500'}`}
              />
              現在の予約情報
              {reservations.length > 0 && (
                <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">
                  {reservations.length}件
                </Badge>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {reservations.length > 0 ? (
            <div className="space-y-3">
              {reservations
                .sort((a, b) => a.startTime.getTime() - b.startTime.getTime())
                .map((reservation) => {
                  const isToday =
                    new Date(reservation.startTime).toDateString() === new Date().toDateString()
                  const isTomorrow =
                    new Date(reservation.startTime).toDateString() ===
                    new Date(Date.now() + 24 * 60 * 60 * 1000).toDateString()

                  return (
                    <div
                      key={reservation.id}
                      className={`flex items-center gap-4 rounded-lg border p-3 transition-all ${
                        isToday
                          ? 'border-orange-200 bg-orange-50 shadow-md'
                          : isTomorrow
                            ? 'border-blue-200 bg-blue-50'
                            : 'border-emerald-100 bg-white'
                      }`}
                    >
                      <div className="shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={FALLBACK_IMAGE}
                          alt="Staff"
                          className="h-12 w-12 rounded-full object-cover"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium">スタッフ名</h3>
                          <Badge
                            variant={reservation.status === 'confirmed' ? 'default' : 'secondary'}
                          >
                            {reservation.status === 'confirmed'
                              ? '予約確定'
                              : reservation.status === 'modifiable'
                                ? '修正可能'
                                : '仮予約'}
                          </Badge>
                          {isToday && (
                            <Badge variant="destructive" className="text-xs">
                              本日
                            </Badge>
                          )}
                          {isTomorrow && (
                            <Badge variant="outline" className="bg-blue-100 text-xs text-blue-700">
                              明日
                            </Badge>
                          )}
                        </div>
                        <div className="mt-1 flex items-center gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {reservation.startTime.toLocaleDateString('ja-JP')}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {`${reservation.startTime.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })} - ${reservation.endTime.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}`}
                          </div>
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <div
                          className={`font-medium ${isToday ? 'text-orange-600' : isTomorrow ? 'text-blue-600' : 'text-emerald-600'}`}
                        >
                          ¥{reservation.price.toLocaleString()}
                        </div>
                        <Button
                          variant="link"
                          className={`p-0 text-sm ${isToday ? 'text-orange-600' : isTomorrow ? 'text-blue-600' : 'text-emerald-600'}`}
                          onClick={() => setSelectedReservation(reservation)}
                        >
                          予約詳細
                        </Button>
                      </div>
                    </div>
                  )
                })}
            </div>
          ) : (
            <div className="py-8 text-center text-gray-500">
              <Calendar className="mx-auto mb-3 h-12 w-12 text-gray-300" />
              <p className="mb-2 text-lg font-medium">予約はありません</p>
              <p className="text-sm">新しい予約を作成してください</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="border bg-white">
          <TabsTrigger value="profile" className="data-[state=active]:bg-emerald-50">
            基本情報
          </TabsTrigger>
          <TabsTrigger value="ng-cast" className="data-[state=active]:bg-emerald-50">
            NGキャスト
          </TabsTrigger>
          <TabsTrigger value="history" className="data-[state=active]:bg-emerald-50">
            利用履歴
          </TabsTrigger>
          <TabsTrigger value="points" className="data-[state=active]:bg-emerald-50">
            ポイント履歴
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSave)} className="space-y-6">
              {/* 基本情報 */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">基本情報</CardTitle>
                  <CardDescription>顧客の基本的な情報</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">
                            名前 <span className="text-red-500">*</span>
                          </FormLabel>
                          <div className="flex gap-2">
                            <FormControl>
                              <Input {...field} disabled={!isEditing} />
                            </FormControl>
                            <Button
                              type="button"
                              className="shrink-0 bg-blue-500 hover:bg-blue-600"
                              onClick={() => router.push('/admin/chat')}
                            >
                              <MessageSquare className="mr-2 h-4 w-4" />
                              メッセージ
                            </Button>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">
                            電話番号 <span className="text-red-500">*</span>
                          </FormLabel>
                          <div className="flex gap-2">
                            <FormControl>
                              <Input {...field} disabled={!isEditing} />
                            </FormControl>
                            <Button type="button" variant="destructive" className="shrink-0">
                              <Phone className="mr-2 h-4 w-4" />
                              電話
                            </Button>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">
                            メールアドレス <span className="text-red-500">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input type="email" {...field} disabled={!isEditing} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">
                            パスワード <span className="text-red-500">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input type="password" {...field} disabled={!isEditing} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="birthDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">
                            生年月日 <span className="text-red-500">*</span>
                          </FormLabel>
                          <FormControl>
                            {isEditing ? (
                              <DatePicker selected={field.value} onSelect={field.onChange} />
                            ) : (
                              <Input
                                value={field.value ? field.value.toLocaleDateString('ja-JP') : ''}
                                disabled
                              />
                            )}
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div>
                      <Label className="text-sm font-medium text-gray-700">年齢</Label>
                      <div className="mt-2 rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-900">
                        {age !== null ? `${age}歳` : '生年月日から自動計算'}
                      </div>
                    </div>

                    <FormField
                      control={form.control}
                      name="memberType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-medium">会員タイプ</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            disabled={!isEditing}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="regular">通常会員</SelectItem>
                              <SelectItem value="vip">VIPメンバー</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-6 pt-4 md:grid-cols-2">
                    <div>
                      <Label className="text-sm font-medium text-gray-700">登録日</Label>
                      <div className="mt-2 rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-900">
                        {customer.registrationDate.toLocaleString('ja-JP')}
                      </div>
                    </div>

                    <div>
                      <Label className="text-sm font-medium text-gray-700">最終ログイン</Label>
                      <div className="mt-2 rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-900">
                        {customer.lastLoginDate
                          ? customer.lastLoginDate.toLocaleString('ja-JP')
                          : 'N/A'}
                      </div>
                    </div>

                    <div>
                      <Label className="text-sm font-medium text-gray-700">最終利用日</Label>
                      <div className="mt-2 rounded-md bg-gray-50 px-3 py-2 text-sm text-gray-900">
                        {customer.lastVisitDate
                          ? customer.lastVisitDate.toLocaleDateString('ja-JP')
                          : 'N/A'}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* ポイント情報 */}
              <Card>
                <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                  <div>
                    <CardTitle className="text-lg font-semibold">ポイント情報</CardTitle>
                    <CardDescription>現在のポイント残高とポイント追加</CardDescription>
                  </div>
                  {customer && (
                    <PointAdjustmentDialog
                      customerId={customer.id}
                      customerName={customer.name}
                      onAdjusted={handlePointAdjustment}
                      trigger={
                        <Button variant="outline" size="sm" className="gap-2">
                          <Plus className="h-4 w-4" />
                          ポイント調整
                        </Button>
                      }
                    />
                  )}
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="points"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium">ポイント残高</FormLabel>
                        <FormControl>
                          <div className="flex items-center gap-2">
                            <Input
                              {...field}
                              type="number"
                              disabled
                              className="bg-gray-50"
                              onChange={(e) => field.onChange(Number(e.target.value))}
                            />
                            <span className="text-sm text-gray-600">pt</span>
                          </div>
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  {isEditing && (
                    <>
                      <div className="flex items-center space-x-2">
                        <Switch
                          checked={pointsInputEnabled}
                          onCheckedChange={setPointsInputEnabled}
                        />
                        <Label>ポイントを追加する</Label>
                      </div>

                      {pointsInputEnabled && (
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          <FormField
                            control={form.control}
                            name="pointsAmount"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-sm font-medium">金額（円）</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    placeholder="1000"
                                    {...field}
                                    onChange={(e) => field.onChange(Number(e.target.value))}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="pointsToAdd"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-sm font-medium">ポイント</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    placeholder="100"
                                    {...field}
                                    onChange={(e) => field.onChange(Number(e.target.value))}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>

              {/* 連絡設定 */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">連絡設定</CardTitle>
                  <CardDescription>SMS送信の設定</CardDescription>
                </CardHeader>
                <CardContent>
                  <FormField
                    control={form.control}
                    name="smsEnabled"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">SMS受信設定</FormLabel>
                          <div className="text-sm text-muted-foreground">
                            ONにするとSMS送信が可能になります
                          </div>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            disabled={!isEditing}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>

              {/* 特徴や好み */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">特徴や好み</CardTitle>
                  <CardDescription>顧客の特徴、好み、注意事項など（1000文字以内）</CardDescription>
                </CardHeader>
                <CardContent>
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Textarea
                            placeholder="顧客の特徴、好み、注意事項など"
                            className="min-h-[120px] resize-none"
                            disabled={!isEditing}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </form>
          </Form>
        </TabsContent>

        <TabsContent value="ng-cast">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg font-semibold">
                <UserX className="h-5 w-5" />
                NGキャスト管理
              </CardTitle>
              <CardDescription>この顧客がNGとしているキャストの管理</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* ヘッダーアクション */}
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-gray-700">
                  現在のNGキャスト ({customer?.ngCasts?.length || 0}件)
                </h3>
                <Button size="sm" onClick={handleAddNgCast} className="bg-red-600 hover:bg-red-700">
                  <Plus className="mr-1 h-4 w-4" />
                  NGキャスト追加
                </Button>
              </div>

              {/* 現在のNGキャスト一覧 */}
              {customer?.ngCasts && customer.ngCasts.length > 0 ? (
                <div className="space-y-3">
                  {customer.ngCasts.map((ngCast) => {
                    const cast = availableCasts.find((c) => c.id === ngCast.castId)
                    if (!cast) return null
                    return (
                      <div
                        key={ngCast.castId}
                        className="rounded-lg border border-red-200 bg-red-50 p-4"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex flex-1 items-start gap-3">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={cast.image?.trim() ? cast.image : FALLBACK_IMAGE}
                              alt={cast.name}
                              className="aspect-[7/10] w-10 shrink-0 rounded object-cover"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="mb-1 flex flex-wrap items-center gap-2">
                                <h4 className="font-medium">{cast.name}</h4>
                                <span className="text-sm text-gray-600">({cast.type})</span>
                                <Badge
                                  variant={ngCast.assignedBy === 'cast' ? 'destructive' : 'outline'}
                                  className="text-xs"
                                >
                                  {NG_ASSIGNMENT_LABELS[ngCast.assignedBy ?? 'customer']}
                                </Badge>
                              </div>
                              {ngCast.notes && (
                                <div className="mb-2 flex items-start gap-1">
                                  <FileText className="mt-0.5 h-4 w-4 shrink-0 text-gray-500" />
                                  <p className="break-words text-sm text-gray-700">
                                    {ngCast.notes}
                                  </p>
                                </div>
                              )}
                              <div className="flex items-center gap-1 text-xs text-gray-500">
                                <CalendarIcon className="h-3 w-3" />
                                追加日: {ngCast.addedDate.toLocaleDateString('ja-JP')}
                              </div>
                            </div>
                          </div>
                          {isEditing && (
                            <div className="ml-3 flex shrink-0 gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEditNgCast(ngCast)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleRemoveNgCast(ngCast.castId)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="py-8 text-center text-gray-500">
                  <UserX className="mx-auto mb-3 h-12 w-12 text-gray-300" />
                  <p className="mb-2 text-lg font-medium">NGキャストはありません</p>
                  <p className="text-sm">必要に応じてNGキャストを追加してください</p>
                  <Button className="mt-4 bg-red-600 hover:bg-red-700" onClick={handleAddNgCast}>
                    <Plus className="mr-1 h-4 w-4" />
                    NGキャスト追加
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">利用履歴</CardTitle>
              <CardDescription>過去の利用記録</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {usageHistory.map((record) => (
                  <div
                    key={record.id}
                    className="flex items-start gap-4 rounded-lg border p-4 transition-colors hover:bg-gray-50"
                  >
                    <div className="shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={FALLBACK_IMAGE}
                        alt="Staff"
                        className="h-16 w-16 rounded-full object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{record.staffName}</h3>
                        <Badge variant={record.status === 'completed' ? 'default' : 'secondary'}>
                          {record.status === 'completed' ? '完了' : 'キャンセル'}
                        </Badge>
                      </div>
                      <div className="mt-1 space-y-1 text-sm text-gray-500">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4" />
                          {record.date.toLocaleDateString('ja-JP')}
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          {record.serviceName}
                        </div>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-lg font-medium">¥{record.amount.toLocaleString()}</div>
                      <Button
                        variant="link"
                        className="p-0 text-sm text-emerald-600"
                        onClick={() => {
                          // 利用履歴から対応する予約を探す（簡易実装）
                          const relatedReservation = reservations.find(
                            (r) => r.startTime.toDateString() === record.date.toDateString()
                          )
                          if (relatedReservation) {
                            setSelectedReservation(relatedReservation)
                          }
                        }}
                      >
                        詳細を見る
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="points">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">ポイント履歴</CardTitle>
              <CardDescription>ポイントの獲得・利用・期限切れの記録</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {pointHistory.map((record) => {
                  const getIcon = () => {
                    switch (record.type) {
                      case 'earned':
                        return <TrendingUp className="h-4 w-4 text-emerald-600" />
                      case 'used':
                        return <TrendingDown className="h-4 w-4 text-red-600" />
                      case 'expired':
                        return <Minus className="h-4 w-4 text-gray-500" />
                      case 'adjusted':
                        return <RefreshCw className="h-4 w-4 text-blue-600" />
                      default:
                        return <Minus className="h-4 w-4 text-gray-500" />
                    }
                  }

                  const getTypeLabel = () => {
                    switch (record.type) {
                      case 'earned':
                        return '獲得'
                      case 'used':
                        return '利用'
                      case 'expired':
                        return '期限切れ'
                      case 'adjusted':
                        return '調整'
                      default:
                        return record.type
                    }
                  }

                  const getAmountColor = () => {
                    switch (record.type) {
                      case 'earned':
                      case 'adjusted':
                        return record.amount > 0 ? 'text-emerald-600' : 'text-red-600'
                      case 'used':
                      case 'expired':
                        return 'text-red-600'
                      default:
                        return 'text-gray-600'
                    }
                  }

                  return (
                    <div
                      key={record.id}
                      className="flex items-center gap-4 rounded-lg border p-4 transition-colors hover:bg-gray-50"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-100">
                        {getIcon()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={
                              record.type === 'earned'
                                ? 'default'
                                : record.type === 'used'
                                  ? 'destructive'
                                  : 'secondary'
                            }
                          >
                            {getTypeLabel()}
                          </Badge>
                          <h3 className="text-sm font-medium">{record.description}</h3>
                        </div>
                        <div className="mt-1 space-y-1 text-sm text-gray-500">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            {record.date.toLocaleDateString('ja-JP')}{' '}
                            {record.date.toLocaleTimeString('ja-JP', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                          {record.relatedService && (
                            <div className="text-xs text-gray-400">
                              関連サービス: {record.relatedService}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className={`text-lg font-medium ${getAmountColor()}`}>
                          {record.amount > 0 ? '+' : ''}
                          {record.amount.toLocaleString()}pt
                        </div>
                        <div className="text-sm text-gray-500">
                          残高: {record.balance.toLocaleString()}pt
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* NGキャストダイアログ */}
      <NgCastDialog
        open={ngCastDialogOpen}
        onOpenChange={setNgCastDialogOpen}
        availableCasts={availableCasts}
        existingNgCasts={customer?.ngCasts || []}
        editingNgCast={editingNgCast}
        onSave={handleSaveNgCast}
      />

      {/* 予約詳細ダイアログ */}
      <ReservationDialog
        open={!!selectedReservation}
        onOpenChange={(open) => !open && setSelectedReservation(null)}
        reservation={selectedReservation ? convertToReservationData(selectedReservation) : null}
      />
    </div>
  )
}
