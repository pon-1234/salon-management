'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { addDays, format, startOfDay } from 'date-fns'
import { ja } from 'date-fns/locale'
import { formatInTimeZone } from 'date-fns-tz'
import { useSession } from 'next-auth/react'
import {
  Sparkles,
  ShieldCheck,
  CalendarDays,
  Clock,
  Loader2,
  CheckCircle,
  AlertTriangle,
  Phone,
  Star,
  Heart,
  Zap,
  CreditCard,
  ArrowRight,
  PhoneCall,
  HandHelping,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useStore } from '@/components/store-provider'
import { PAYMENT_METHODS } from '@/lib/constants'
import { toast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import type { PublicCastProfile } from '@/lib/store/public-casts'

const JST_TIMEZONE = 'Asia/Tokyo'
const STEP_MINUTES = 30
const MAX_BOOKING_DAYS = 14

const BOOKING_STEPS = [
  {
    title: 'キャストを選ぶ',
    description: 'お顔写真を押してお好みのキャストを1人お選びください。',
  },
  {
    title: '日付と時間を決める',
    description: 'カレンダーで日付を選ぶと、空いている時間が大きなボタンで表示されます。',
  },
  {
    title: '予約内容を確認する',
    description: '料金と支払い方法を確認し「この内容で予約する」を押します。',
  },
]

type CourseSummary = {
  id: string
  name: string
  duration: number
  price: number
  description: string | null
}

type OptionSummary = {
  id: string
  name: string
  price: number
  description: string | null
  note: string | null
  category: string
  isPopular: boolean
}

type TimeSlotRange = {
  startTime: string
  endTime: string
}

type TimeSlotChoice = {
  start: string
  end: string
  label: string
  dayLabel: string
}

const categoryLabels: Record<string, string> = {
  relaxation: 'リラクゼーション',
  'body-care': 'ボディケア',
  extension: '延長オプション',
  special: 'スペシャルオプション',
}

const formatDuration = (minutes: number) => {
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (hours === 0) return `${minutes}分`
  if (rest === 0) return `${hours}時間`
  return `${hours}時間${rest}分`
}

const formatCurrency = (value: number) => `¥${value.toLocaleString()}`

const buildTimeSlotChoices = (ranges: TimeSlotRange[], durationMinutes: number): TimeSlotChoice[] => {
  if (!durationMinutes) {
    return []
  }
  const now = new Date()
  const slots: TimeSlotChoice[] = []

  ranges
    .map((range) => ({
      start: new Date(range.startTime),
      end: new Date(range.endTime),
    }))
    .sort((a, b) => a.start.getTime() - b.start.getTime())
    .forEach((range) => {
      for (
        let start = range.start.getTime();
        start + durationMinutes * 60000 <= range.end.getTime();
        start += STEP_MINUTES * 60000
      ) {
        const startDate = new Date(start)
        if (startDate.getTime() <= now.getTime()) {
          continue
        }
        const endDate = new Date(start + durationMinutes * 60000)
        slots.push({
          start: startDate.toISOString(),
          end: endDate.toISOString(),
          label: `${formatInTimeZone(startDate, JST_TIMEZONE, 'HH:mm')} - ${formatInTimeZone(endDate, JST_TIMEZONE, 'HH:mm')}`,
          dayLabel: formatInTimeZone(startDate, JST_TIMEZONE, 'M月d日(E)', { locale: ja }),
        })
      }
    })

  return slots
}

export interface StoreBookingContentProps {
  casts: PublicCastProfile[]
  courses: CourseSummary[]
  options: OptionSummary[]
  initialCastId?: string | null
}

export function StoreBookingContent({
  casts,
  courses,
  options,
  initialCastId,
}: StoreBookingContentProps) {
  const store = useStore()
  const router = useRouter()
  const { data: session, status } = useSession()

  const [selectedCastId, setSelectedCastId] = useState<string>(() => {
    if (initialCastId && casts.some((cast) => cast.id === initialCastId)) {
      return initialCastId
    }
    return casts[0]?.id ?? ''
  })
  const [selectedCourseId, setSelectedCourseId] = useState<string>(courses[0]?.id ?? '')
  const [selectedDate, setSelectedDate] = useState<Date>(startOfDay(new Date()))
  const [selectedSlotStart, setSelectedSlotStart] = useState<string>('')
  const [timeSlots, setTimeSlots] = useState<TimeSlotChoice[]>([])
  const [timeSlotsLoading, setTimeSlotsLoading] = useState(false)
  const [availabilityError, setAvailabilityError] = useState<string | null>(null)
  const [availabilityRefreshKey, setAvailabilityRefreshKey] = useState(0)
  const [selectedOptionIds, setSelectedOptionIds] = useState<Set<string>>(new Set())
  const [paymentMethod, setPaymentMethod] = useState<string>(PAYMENT_METHODS.CASH)
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [lastReservation, setLastReservation] = useState<{ id: string; start: string } | null>(null)

  const optionMap = useMemo(() => new Map(options.map((option) => [option.id, option])), [options])
  const selectedCast = useMemo(() => casts.find((cast) => cast.id === selectedCastId) ?? null, [casts, selectedCastId])
  const selectedCourse = useMemo(
    () => courses.find((course) => course.id === selectedCourseId) ?? null,
    [courses, selectedCourseId]
  )
  const selectedSlot = useMemo(
    () => timeSlots.find((slot) => slot.start === selectedSlotStart) ?? null,
    [timeSlots, selectedSlotStart]
  )

  const optionTotal = useMemo(() => {
    let total = 0
    selectedOptionIds.forEach((optionId) => {
      const option = optionMap.get(optionId)
      if (option) {
        total += option.price
      }
    })
    return total
  }, [optionMap, selectedOptionIds])

  const reservationTotal = (selectedCourse?.price ?? 0) + optionTotal
  const isAuthenticated = status === 'authenticated'

  useEffect(() => {
    if (!selectedCastId && casts[0]) {
      setSelectedCastId(casts[0].id)
    }
  }, [casts, selectedCastId])

  useEffect(() => {
    if (courses.length > 0 && !selectedCourseId) {
      setSelectedCourseId(courses[0].id)
    }
  }, [courses, selectedCourseId])

  useEffect(() => {
    if (initialCastId && casts.some((cast) => cast.id === initialCastId)) {
      setSelectedCastId(initialCastId)
    }
  }, [initialCastId, casts])

  useEffect(() => {
    if (!selectedCastId || !selectedCourse || !selectedDate) {
      setTimeSlots([])
      setAvailabilityError(null)
      setSelectedSlotStart('')
      return
    }

    let cancelled = false
    const controller = new AbortController()
    const fetchAvailability = async () => {
      setTimeSlotsLoading(true)
      setAvailabilityError(null)
      setSelectedSlotStart('')

      try {
        const params = new URLSearchParams({
          castId: selectedCastId,
          date: format(selectedDate, 'yyyy-MM-dd'),
          duration: selectedCourse.duration.toString(),
        })
        params.set('storeId', store.id)
        const response = await fetch(`/api/reservation/availability?${params.toString()}`, {
          cache: 'no-store',
          signal: controller.signal,
        })
        const payload = await response.json()
        if (!response.ok) {
          throw new Error(payload?.error ?? '空き状況の取得に失敗しました')
        }
        if (cancelled) {
          return
        }
        const slots = buildTimeSlotChoices(Array.isArray(payload.availableSlots) ? payload.availableSlots : [], selectedCourse.duration)
        setTimeSlots(slots)
        setAvailabilityError(slots.length === 0 ? '選択した条件では空きがありません。別の時間帯をご検討ください。' : null)
      } catch (error) {
        if (cancelled || controller.signal.aborted) {
          return
        }
        setTimeSlots([])
        setAvailabilityError(
          error instanceof Error ? error.message : '空き状況の取得に失敗しました。時間をおいて再度お試しください。'
        )
      } finally {
        if (!cancelled) {
          setTimeSlotsLoading(false)
        }
      }
    }

    fetchAvailability()

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [casts, selectedCastId, selectedCourse, selectedDate, store.id, availabilityRefreshKey])

  const optionGroups = useMemo(() => {
    const map = new Map<string, OptionSummary[]>()
    options.forEach((option) => {
      const key = option.category || 'special'
      const current = map.get(key) ?? []
      current.push(option)
      map.set(key, current)
    })

    return Array.from(map.entries()).map(([key, items]) => ({
      key,
      label: categoryLabels[key] ?? 'オプション',
      items,
    }))
  }, [options])

  const toggleOption = useCallback((optionId: string, checked: boolean) => {
    setSelectedOptionIds((prev) => {
      const next = new Set(prev)
      if (checked) {
        next.add(optionId)
      } else {
        next.delete(optionId)
      }
      return next
    })
  }, [])

  const handleSubmit = async () => {
    if (!selectedCast || !selectedCourse || !selectedSlot || !isAuthenticated) {
      if (!isAuthenticated) {
        toast({
          variant: 'destructive',
          title: 'ログインが必要です',
          description: '会員ログイン後にオンライン予約をご利用いただけます。',
        })
      }
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch(`/api/reservation?storeId=${store.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          castId: selectedCast.id,
          courseId: selectedCourse.id,
          startTime: selectedSlot.start,
          endTime: selectedSlot.end,
          options: Array.from(selectedOptionIds),
          paymentMethod,
          marketingChannel: 'WEB',
          notes: notes.trim() || undefined,
          designationType: 'regular',
        }),
      })

      const payload = await response.json().catch(() => null)

      if (!response.ok) {
        throw new Error(payload?.error ?? '予約の送信に失敗しました。')
      }

      setLastReservation({ id: payload?.id ?? '', start: selectedSlot.start })
      toast({
        title: 'ご予約を受け付けました',
        description: 'マイページで予約内容をご確認いただけます。',
      })
      setAvailabilityRefreshKey((prev) => prev + 1)
      router.refresh()
    } catch (error) {
      toast({
        variant: 'destructive',
        title: '予約に失敗しました',
        description:
          error instanceof Error ? error.message : '時間をおいて再度お試しください。',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const disableBooking =
    !isAuthenticated || !selectedCast || !selectedCourse || !selectedSlot || submitting

  return (
    <main className="min-h-screen bg-gray-50">
      <section className="bg-gradient-to-r from-purple-700 via-pink-600 to-rose-500 py-14 text-white">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <div className="flex flex-wrap justify-center gap-3">
            <Badge className="bg-white/20 text-white">
              <Sparkles className="mr-1 h-4 w-4" />
              ネット予約
            </Badge>
            <Badge className="bg-white/20 text-white">
              <ShieldCheck className="mr-1 h-4 w-4" />
              会員限定
            </Badge>
            <Badge className="bg-white/20 text-white">
              <Zap className="mr-1 h-4 w-4" />
              API連携でリアルタイム反映
            </Badge>
          </div>
          <h1 className="mt-6 text-4xl font-bold sm:text-5xl">{store.displayName} オンライン予約</h1>
          <p className="mt-4 text-lg leading-relaxed text-purple-100">
            画面の案内にそって「キャスト」「日時」「確認」の順に進むだけでご予約いただけます。
            ご不明点があればいつでもお電話ください。
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4 text-sm text-purple-100">
            <span className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4" />
              受付時間 {store.openingHours.weekday.open} - {store.openingHours.weekday.close}
            </span>
            <span className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              <a href={`tel:${store.phone}`} className="font-semibold text-white underline-offset-2 hover:underline">
                {store.phone}
              </a>
            </span>
          </div>
        </div>
      </section>

      <section className="-mt-10 pb-16 pt-6">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="grid gap-4 rounded-2xl border border-purple-100 bg-white/80 p-5 shadow-sm md:grid-cols-3">
            {BOOKING_STEPS.map((step, index) => (
              <div key={step.title} className="flex gap-3 rounded-xl border border-purple-50 bg-purple-50/60 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-600 text-lg font-bold text-white">
                  {index + 1}
                </div>
                <div>
                  <p className="text-base font-semibold text-purple-800">{step.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{step.description}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-4 rounded-2xl border border-dashed border-purple-200 bg-white/90 p-5 shadow-sm md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-100 text-purple-700">
                <HandHelping className="h-6 w-6" />
              </div>
              <div>
                <p className="text-base font-semibold text-foreground">お電話でもご予約・ご相談いただけます</p>
                <p className="text-sm text-muted-foreground">
                  スマホ操作に不安がある方は「電話予約」ボタンからスタッフが直接ご案内いたします。
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button asChild size="lg" className="bg-emerald-600 hover:bg-emerald-700">
                <a href={`tel:${store.phone}`} className="flex items-center gap-2">
                  <PhoneCall className="h-5 w-5" />
                  電話で予約する {store.phone}
                </a>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <Link href={`/${store.slug}/booking?guide=1`}>操作ガイドを見る</Link>
              </Button>
            </div>
          </div>

          <Alert className="border-purple-200 bg-white shadow-sm">
            <ShieldCheck className="h-5 w-5 text-purple-600" />
            <AlertTitle>オンライン予約は会員限定サービスです</AlertTitle>
            <AlertDescription className="flex flex-col gap-2 text-sm text-muted-foreground">
              <span>
                ログインした会員情報で予約が作成され、管理画面と連動して即座に反映されます。まだ会員登録をされていない場合は、このページから
                <Link href={`/${store.slug}/register`} className="text-purple-600 underline underline-offset-2">
                  無料会員登録
                </Link>
                をお願いいたします。
              </span>
              <span>
                すでにアカウントをお持ちの方は{' '}
                <Link href={`/${store.slug}/login?callbackUrl=/${store.slug}/booking`} className="font-medium text-purple-600 underline underline-offset-2">
                  ログインはこちら
                </Link>
                からお願いします。
              </span>
            </AlertDescription>
          </Alert>

          <div className="mt-10 grid gap-8 lg:grid-cols-[2fr,1fr]">
            <div className="space-y-8">
              <Card>
                <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle className="text-2xl">STEP 1. キャストをえらぶ</CardTitle>
                    <CardDescription>写真を押すだけで選択できます。迷ったら「電話で予約する」からご相談ください。</CardDescription>
                  </div>
                  <Badge variant="secondary" className="bg-purple-100 text-purple-700">
                    ネット予約対応 {casts.filter((cast) => cast.netReservation).length}名
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-4">
                  {casts.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-purple-200 bg-purple-50/50 p-6 text-center text-sm text-muted-foreground">
                      現在オンライン予約可能なキャスト情報を準備中です。詳しくはお電話でお問い合わせください。
                    </div>
                  ) : (
                    <div className="grid gap-4 md:grid-cols-2">
                      {casts.map((cast) => {
                        const isSelected = cast.id === selectedCastId
                        return (
                          <button
                            key={cast.id}
                            type="button"
                            onClick={() => setSelectedCastId(cast.id)}
                            className={cn(
                              'flex w-full items-center gap-4 rounded-xl border p-4 text-left transition hover:border-purple-400 hover:shadow-sm',
                              isSelected ? 'border-purple-600 bg-purple-50/60 shadow' : 'border-border bg-white'
                            )}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={cast.image ?? '/placeholder-user.jpg'}
                              alt={cast.name}
                              className="h-16 w-16 rounded-lg object-cover"
                            />
                            <div className="flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <div className="text-lg font-semibold">{cast.name}</div>
                                {isSelected && (
                                  <Badge className="bg-purple-600 text-xs text-white">選択中</Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">{cast.sizeLabel || 'サイズ非公開'}</p>
                              <div className="mt-2 flex flex-wrap gap-1">
                                {cast.type && (
                                  <Badge variant="outline" className="text-xs">
                                    {cast.type}
                                  </Badge>
                                )}
                                {cast.panelDesignationRank > 0 && (
                                  <Badge variant="outline" className="text-xs">
                                    Rank {cast.panelDesignationRank}
                                  </Badge>
                                )}
                                {cast.netReservation && (
                                  <Badge variant="secondary" className="text-xs">
                                    ネット予約可
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  )}
                  {selectedCast && (
                    <div className="rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground">
                      <p className="font-medium text-foreground">{selectedCast.name}からのメッセージ</p>
                      <p className="mt-2">{selectedCast.introMessage ?? 'よろしくお願いします。'}</p>
                      {selectedCast.availableServices.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {selectedCast.availableServices.slice(0, 4).map((service) => (
                            <Badge key={service} variant="outline" className="text-xs">
                              {service}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <CardTitle className="text-2xl">STEP 2. 日付と時間を決める</CardTitle>
                    <CardDescription>カレンダーで日付を押すと、その日で選べる時間が大きなボタンで表示されます。</CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setAvailabilityRefreshKey((prev) => prev + 1)}
                    disabled={timeSlotsLoading}
                  >
                    {timeSlotsLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    最新の空き状況を再取得
                  </Button>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="rounded-lg border border-dashed border-purple-200 bg-purple-50/50 p-3 text-sm text-muted-foreground">
                    <p className="font-semibold text-purple-800">時間の選び方</p>
                    <p>【1】カレンダーで日付を選ぶ → 【2】右側に出てきた時間の中からご希望を押してください。</p>
                  </div>

                  <div className="grid gap-6 lg:grid-cols-2">
                    <div className="rounded-lg border bg-white p-2">
                      <Calendar
                        selectedDay={selectedDate}
                        onSelectedDayChange={(date) => date && setSelectedDate(startOfDay(date))}
                        disabled={(date) => {
                          const today = startOfDay(new Date())
                          const limit = addDays(today, MAX_BOOKING_DAYS)
                          return date < today || date > limit
                        }}
                      />
                    </div>
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        {selectedCourse
                          ? `${selectedCourse.name} / ${formatDuration(selectedCourse.duration)}`
                          : 'コースを選択してください'}
                      </div>
                      {availabilityError && (
                        <Alert variant="destructive">
                          <AlertTriangle className="h-4 w-4" />
                          <AlertTitle>空き状況の取得に失敗しました</AlertTitle>
                          <AlertDescription>{availabilityError}</AlertDescription>
                        </Alert>
                      )}
                      <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                        {timeSlotsLoading ? (
                          <div className="col-span-2 flex items-center gap-2 rounded-lg border border-dashed border-purple-200 bg-purple-50/60 p-4 text-sm text-purple-700 md:col-span-3">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            空き状況を読み込み中...
                          </div>
                        ) : timeSlots.length === 0 ? (
                          <div className="col-span-2 rounded-lg border border-dashed border-muted-foreground/20 bg-muted/30 p-4 text-sm text-muted-foreground md:col-span-3">
                            日付とコースを選択すると空き時間が表示されます。空き時間が表示されない場合は別の日時をご検討ください。
                          </div>
                        ) : (
                          timeSlots.map((slot) => {
                            const isSelected = selectedSlotStart === slot.start
                            return (
                              <button
                                key={slot.start}
                                type="button"
                                onClick={() => setSelectedSlotStart(slot.start)}
                                className={cn(
                                  'rounded-lg border p-2 text-left text-sm transition hover:border-purple-400 hover:text-purple-700',
                                  isSelected
                                    ? 'border-purple-600 bg-purple-50 text-purple-700'
                                    : 'border-border bg-white text-foreground'
                                )}
                              >
                                <p className="text-xs text-muted-foreground">{slot.dayLabel}</p>
                                <p className="text-base font-semibold">{slot.label}</p>
                              </button>
                            )
                          })
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-2xl">STEP 3. コースを選ぶ</CardTitle>
                  <CardDescription>よく分からない場合は「スタンダードコース」を選んでいただければスタッフが丁寧にご案内します。</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {courses.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-purple-200 bg-purple-50/50 p-4 text-center text-sm text-muted-foreground">
                      料金プランを準備しています。詳細はお電話にてお問い合わせください。
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {courses.map((course) => {
                        const isSelected = course.id === selectedCourseId
                        return (
                          <button
                            key={course.id}
                            type="button"
                            onClick={() => setSelectedCourseId(course.id)}
                            className={cn(
                              'w-full rounded-xl border p-4 text-left transition hover:border-purple-400',
                              isSelected
                                ? 'border-purple-600 bg-purple-50 shadow'
                                : 'border-border bg-white'
                            )}
                          >
                            <div className="flex items-center justify-between gap-4">
                              <div>
                                <p className="text-lg font-semibold">{course.name}</p>
                                <p className="text-sm text-muted-foreground">
                                  {formatDuration(course.duration)}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="text-xl font-bold text-purple-700">
                                  {formatCurrency(course.price)}
                                </p>
                                {isSelected && (
                                  <span className="text-xs font-medium text-purple-600">
                                    選択中
                                  </span>
                                )}
                              </div>
                            </div>
                            {course.description && (
                              <p className="mt-2 text-sm text-muted-foreground">{course.description}</p>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-2xl">お好みで追加オプション</CardTitle>
                  <CardDescription>チェックしなくてもそのまま進めます。ご希望がある場合だけチェックしてください。</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {optionGroups.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      現在ご利用いただけるオプションはありません。
                    </p>
                  ) : (
                    optionGroups.map((group) => (
                      <div key={group.key} className="space-y-3 rounded-lg border p-4">
                        <p className="text-sm font-semibold text-muted-foreground">{group.label}</p>
                        <div className="space-y-2">
                          {group.items.map((option) => {
                            const checked = selectedOptionIds.has(option.id)
                            return (
                              <label
                                key={option.id}
                                className={cn(
                                  'flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition hover:border-purple-400',
                                  checked ? 'border-purple-500 bg-purple-50/60' : 'border-border bg-white'
                                )}
                              >
                                <Checkbox
                                  checked={checked}
                                  onCheckedChange={(value) => toggleOption(option.id, value === true)}
                                />
                                <div className="flex-1">
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="font-medium">{option.name}</div>
                                    <div className="text-sm font-semibold text-purple-700">
                                      {formatCurrency(option.price)}
                                    </div>
                                  </div>
                                  {(option.description || option.note) && (
                                    <p className="text-xs text-muted-foreground">
                                      {option.description ?? option.note}
                                    </p>
                                  )}
                                  {option.isPopular && (
                                    <Badge variant="secondary" className="mt-2 text-xs text-purple-700">
                                      人気
                                    </Badge>
                                  )}
                                </div>
                              </label>
                            )
                          })}
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-2xl">STEP 4. お支払い方法と備考</CardTitle>
                  <CardDescription>お支払いは当日店舗で承ります。スタッフに伝えたいことがあれば備考欄へご記入ください。</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>お支払い方法</Label>
                    <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="支払い方法を選択" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.values(PAYMENT_METHODS).map((method) => (
                          <SelectItem key={method} value={method}>
                            {method}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>備考・ご要望</Label>
                    <Textarea
                      rows={4}
                      placeholder="到着予定時刻や指名に関するご要望などがあればご記入ください。"
                      value={notes}
                      onChange={(event) => setNotes(event.target.value)}
                      className="resize-none"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            <aside className="space-y-6">
              <Card className="border-2 border-purple-100 bg-white">
                <CardHeader>
                  <CardTitle className="text-2xl">最後に内容を確認してください</CardTitle>
                  <CardDescription>すべてご確認いただけましたら下の大きなボタンを押して予約完了です。</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">キャスト</span>
                    <span className="font-medium">{selectedCast?.name ?? '未選択'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">日時</span>
                    <span className="font-medium">
                      {selectedSlot
                        ? `${formatInTimeZone(new Date(selectedSlot.start), JST_TIMEZONE, 'M月d日(E) HH:mm', { locale: ja })}`
                        : format(selectedDate, 'M月d日(E)', { locale: ja })}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">コース</span>
                    <span className="font-medium">
                      {selectedCourse
                        ? `${selectedCourse.name} / ${formatDuration(selectedCourse.duration)}`
                        : '未選択'}
                    </span>
                  </div>
                  <div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">オプション</span>
                      <span className="font-medium">
                        {selectedOptionIds.size > 0
                          ? `${selectedOptionIds.size}件 / ${formatCurrency(optionTotal)}`
                          : 'なし'}
                      </span>
                    </div>
                    {selectedOptionIds.size > 0 && (
                      <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-muted-foreground">
                        {Array.from(selectedOptionIds).map((optionId) => {
                          const option = optionMap.get(optionId)
                          if (!option) return null
                          return (
                            <li key={optionId}>
                              {option.name}（{formatCurrency(option.price)}）
                            </li>
                          )
                        })}
                      </ul>
                    )}
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">支払い方法</span>
                    <span className="font-medium">{paymentMethod}</span>
                  </div>
                  <div className="border-t pt-3">
                    <div className="flex items-center justify-between text-lg font-semibold">
                      <span>お支払い見込み</span>
                      <span className="text-2xl text-purple-700">{formatCurrency(reservationTotal)}</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      料金は当日の延長やご希望内容により変動する場合があります。
                    </p>
                  </div>
                  {lastReservation && (
                    <Alert className="border-emerald-200 bg-emerald-50">
                      <CheckCircle className="h-4 w-4 text-emerald-600" />
                      <AlertTitle>予約を受け付けました</AlertTitle>
                      <AlertDescription className="text-xs">
                        予約ID: {lastReservation.id} /{' '}
                        {formatInTimeZone(new Date(lastReservation.start), JST_TIMEZONE, 'M月d日(E) HH:mm', {
                          locale: ja,
                        })}
                        。マイページで詳細をご確認ください。
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
                <CardFooter className="flex flex-col gap-3">
                  <Button disabled={disableBooking} className="w-full" onClick={handleSubmit} size="lg">
                    {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    この内容で予約する
                  </Button>
                  {!isAuthenticated && (
                    <p className="text-xs text-muted-foreground">
                      会員登録済みのお客様のみオンライン予約をご利用いただけます。{' '}
                      <Link
                        href={`/${store.slug}/login?callbackUrl=/${store.slug}/booking`}
                        className="text-purple-600 underline underline-offset-2"
                      >
                        ログインする
                      </Link>
                    </p>
                  )}
                  <Button variant="outline" className="w-full" asChild>
                    <Link href={`/${store.slug}/mypage`}>
                      マイページで予約履歴を確認
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </CardFooter>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-xl">安心サポート</CardTitle>
                  <CardDescription>お電話でもご予約・ご相談を承ります</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <div className="rounded-lg border bg-purple-50/50 p-4 text-purple-700">
                    <p className="text-xs">今すぐ相談する</p>
                    <a href={`tel:${store.phone}`} className="mt-1 flex items-center text-lg font-semibold text-purple-900">
                      <Phone className="mr-2 h-4 w-4" />
                      {store.phone}
                    </a>
                    <p className="text-xs text-purple-600">
                      受付時間 {store.openingHours.weekday.open} - {store.openingHours.weekday.close}
                    </p>
                  </div>
                  <ul className="space-y-2 text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <Star className="mt-0.5 h-4 w-4 text-purple-500" />
                      事前決済は不要。ご来店時のお支払いとなります。
                    </li>
                    <li className="flex items-start gap-2">
                      <Heart className="mt-0.5 h-4 w-4 text-pink-500" />
                      指名料・交通費などの追加料金は当日にご案内します。
                    </li>
                    <li className="flex items-start gap-2">
                      <CreditCard className="mt-0.5 h-4 w-4 text-emerald-500" />
                      現金・クレジットカードに対応しています。
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </aside>
          </div>
        </div>
      </section>
    </main>
  )
}
