'use client'

import { useCallback, useMemo, useState } from 'react'
import { format, parseISO, isSameDay } from 'date-fns'
import { ja } from 'date-fns/locale'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Calendar, Clock, User, MapPin } from 'lucide-react'
import { Store } from '@/lib/store/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { PublicScheduleDay, PublicCastSchedule } from '@/lib/store/public-schedule'

const SLOT_MINUTES = 30
const BOOKED_STATUSES = new Set(['pending', 'confirmed', 'completed', 'modifiable'])

type TimelineSlot = {
  id: string
  start: Date
  startIso: string
  label: string
  status: 'open' | 'booked'
  isPast: boolean
}

function buildTimelineSlots(entry: PublicCastSchedule): TimelineSlot[] {
  if (!entry.startTime || !entry.endTime) {
    return []
  }
  const start = new Date(entry.startTime)
  const end = new Date(entry.endTime)

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start >= end) {
    return []
  }

  const reservations = Array.isArray(entry.reservations) ? entry.reservations : []
  const now = new Date()
  const slots: TimelineSlot[] = []

  for (let ts = start.getTime(); ts < end.getTime(); ts += SLOT_MINUTES * 60 * 1000) {
    const slotStart = new Date(ts)
    const slotEnd = new Date(Math.min(ts + SLOT_MINUTES * 60 * 1000, end.getTime()))
    const hasReservation = reservations.some((reservation) => {
      if (!BOOKED_STATUSES.has(reservation.status)) {
        return false
      }
      const resStart = new Date(reservation.startTime)
      const resEnd = new Date(reservation.endTime)
      if (Number.isNaN(resStart.getTime()) || Number.isNaN(resEnd.getTime())) {
        return false
      }
      return resStart < slotEnd && resEnd > slotStart
    })

    slots.push({
      id: `${entry.id}-${slotStart.toISOString()}`,
      start: slotStart,
      startIso: slotStart.toISOString(),
      label: format(slotStart, 'HH:mm'),
      status: hasReservation ? 'booked' : 'open',
      isPast: slotStart.getTime() <= now.getTime(),
    })
  }

  return slots
}

interface StoreScheduleContentProps {
  store: Store
  scheduleDays: PublicScheduleDay[]
}

function formatTimeRange(start: string, end: string) {
  try {
    const startDate = parseISO(start)
    const endDate = parseISO(end)
    return `${format(startDate, 'HH:mm')} - ${format(endDate, 'HH:mm')}`
  } catch {
    return ''
  }
}

export function StoreScheduleContent({ store, scheduleDays }: StoreScheduleContentProps) {
  const { data: session, status: sessionStatus } = useSession()
  const router = useRouter()
  const sortedDays = useMemo(
    () =>
      [...scheduleDays].sort(
        (a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime()
      ),
    [scheduleDays]
  )

  const [selectedDate, setSelectedDate] = useState(() =>
    sortedDays.length > 0 ? sortedDays[0].date : new Date().toISOString()
  )

  const activeDay = useMemo(() => {
    const target = parseISO(selectedDate)
    return (
      sortedDays.find((day) => isSameDay(parseISO(day.date), target)) ?? {
        date: selectedDate,
        entries: [],
      }
    )
  }, [selectedDate, sortedDays])

  const handleSlotClick = useCallback(
    (castId: string, slotIso: string) => {
      const encodedSlot = encodeURIComponent(slotIso)
      const bookingPath = `/${store.slug}/booking?cast=${castId}&slot=${encodedSlot}`
      if (!session?.user) {
        const loginPath = `/${store.slug}/login?redirect=${encodeURIComponent(bookingPath)}`
        router.push(loginPath)
        return
      }
      router.push(bookingPath)
    },
    [router, session?.user, store.slug]
  )

  const isAuthLoading = sessionStatus === 'loading'

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 py-12 text-white">
        <div className="mx-auto max-w-7xl px-4">
          <h1 className="mb-4 text-center text-4xl font-bold">出勤一覧</h1>
          <p className="text-center text-xl">{store.name}の出勤スケジュール</p>
        </div>
      </div>

      <section className="sticky top-16 z-40 border-b bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 py-4">
          <div className="flex flex-wrap gap-2">
            {sortedDays.map((day) => {
              const dateObj = parseISO(day.date)
              const isActive = isSameDay(parseISO(selectedDate), dateObj)
              return (
                <Button
                  key={day.date}
                  variant={isActive ? 'default' : 'outline'}
                  onClick={() => setSelectedDate(day.date)}
                  className="flex h-auto flex-col px-4 py-2 text-left"
                >
                  <span className="text-xs text-muted-foreground">
                    {format(dateObj, 'E', { locale: ja })}
                  </span>
                  <span className="text-sm font-semibold">{format(dateObj, 'M月d日')}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {day.entries.length}件
                  </span>
                </Button>
              )
            })}
          </div>
        </div>
        <div className="border-t bg-white">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-6 px-4 py-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-emerald-400 bg-emerald-50 text-emerald-600 text-base font-semibold">
                ○
              </span>
              予約可能
            </div>
            <div className="flex items-center gap-2">
              <span className="text-base font-semibold text-red-500">×</span>
              予約済み
            </div>
            <div className="flex items-center gap-2">
              <span className="text-base text-muted-foreground">-</span>
              終了済み
            </div>
          </div>
        </div>
      </section>

      <section className="py-8">
        <div className="mx-auto max-w-7xl px-4">
          {activeDay.entries.length === 0 ? (
            <Card>
              <CardContent className="space-y-4 p-8 text-center text-muted-foreground">
                <Calendar className="mx-auto h-10 w-10 text-purple-400" />
                <div>
                  <p className="text-lg font-semibold">出勤予定がありません</p>
                  <p className="text-sm">
                    他の日付を選択するか、お問い合わせフォームから最新の出勤状況をご確認ください。
                  </p>
                </div>
                <Button asChild variant="outline">
                  <Link href={`/${store.slug}/booking`}>お問い合わせ</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {activeDay.entries.map((entry) => (
                <Card key={entry.id} className="transition-shadow hover:shadow-lg">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center justify-between text-lg">
                      <span>{entry.cast.name}</span>
                      {entry.cast.panelDesignationRank > 0 && (
                        <Badge variant="secondary">Rank {entry.cast.panelDesignationRank}</Badge>
                      )}
                    </CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {formatTimeRange(entry.startTime, entry.endTime)}
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="h-20 w-20 overflow-hidden rounded-lg bg-gradient-to-br from-purple-300 to-pink-400">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={entry.cast.image ?? '/images/non-photo.svg'}
                          alt={entry.cast.name}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <div className="space-y-1 text-sm">
                        <p className="flex items-center gap-1">
                          <User className="h-4 w-4 text-purple-500" />
                          {entry.cast.age ? `${entry.cast.age}歳` : '年齢非公開'}
                        </p>
                        {entry.cast.type && (
                          <p className="text-muted-foreground">タイプ: {entry.cast.type}</p>
                        )}
                        <p className="flex items-center gap-1 text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          {entry.cast.workStatus ?? '出勤予定'}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 text-xs">
                      {entry.cast.bust && (
                        <Badge variant="outline">B{entry.cast.bust}</Badge>
                      )}
                      {entry.cast.waist && (
                        <Badge variant="outline">W{entry.cast.waist}</Badge>
                      )}
                      {entry.cast.hip && (
                        <Badge variant="outline">H{entry.cast.hip}</Badge>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/${store.slug}/cast/${entry.castId}`}>
                          詳細を見る
                        </Link>
                      </Button>
                      <Button asChild size="sm">
                        <Link href={`/${store.slug}/booking?cast=${entry.castId}`}>
                          予約する
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                  <CardContent className="space-y-4 border-t pt-4">
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground">本日の空き状況</p>
                      {(() => {
                        const slots = buildTimelineSlots(entry)
                        if (slots.length === 0) {
                          return (
                            <p className="mt-2 text-xs text-muted-foreground">
                              時間枠の情報がありません。詳細はお問い合わせください。
                            </p>
                          )
                        }
                        return (
                          <div className="mt-3 overflow-x-auto">
                            <table className="w-full min-w-[520px] text-center text-xs">
                              <thead>
                                <tr>
                                  {slots.map((slot) => (
                                    <th key={`${slot.id}-label`} className="px-2 pb-2 text-[11px] font-medium text-muted-foreground">
                                      {slot.label}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                <tr>
                                  {slots.map((slot) => (
                                    <td key={slot.id} className="border px-2 py-3">
                                      {slot.status === 'booked' ? (
                                        <span className="text-sm font-semibold text-red-500">×</span>
                                      ) : slot.isPast ? (
                                        <span className="text-sm text-muted-foreground">-</span>
                                      ) : (
                                        <button
                                          type="button"
                                          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-emerald-400 text-base font-semibold text-emerald-600 transition-colors hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60"
                                          onClick={() => handleSlotClick(entry.castId, slot.startIso)}
                                          disabled={isAuthLoading}
                                          aria-label={`${entry.cast.name} ${slot.label}の予約を進める`}
                                        >
                                          ○
                                        </button>
                                      )}
                                    </td>
                                  ))}
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        )
                      })()}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="bg-white py-8">
        <div className="mx-auto max-w-4xl space-y-4 px-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2 font-semibold text-purple-600">
            <MapPin className="h-4 w-4" />
            ご利用前のお願い
          </div>
          <ul className="list-disc space-y-1 pl-5">
            <li>スケジュールは直前に変更となる場合があります。</li>
            <li>確実な出勤状況はお電話またはお問い合わせフォームでご確認ください。</li>
            <li>ご指名予約は事前決済または会員ログイン後に承ります。</li>
          </ul>
        </div>
      </section>
    </main>
  )
}
