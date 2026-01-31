'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { addDays, format, isSameDay, parseISO } from 'date-fns'
import { ja } from 'date-fns/locale'
import { Calendar, Clock, Loader2, RefreshCcw, User } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import type { PublicCastSchedule, PublicScheduleDay } from '@/lib/store/public-schedule'
import { cn } from '@/lib/utils'

const SLOT_MINUTES = 30
const BOOKED_STATUSES = new Set(['pending', 'confirmed', 'completed', 'modifiable'])

type TimelineSlot = {
  id: string
  label: string
  start: Date
  startIso: string
  status: 'open' | 'booked'
  isPast: boolean
}

interface CastTimelineModalProps {
  open: boolean
  initialDate: Date
  selectedCastId?: string | null
  selectedSlotIso?: string | null
  onClose: () => void
  onSelectSlot: (castId: string, slotIso: string) => void
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

  const now = new Date()
  const reservations = Array.isArray(entry.reservations) ? entry.reservations : []
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
      id: `${entry.castId}-${slotStart.toISOString()}`,
      label: format(slotStart, 'HH:mm'),
      start: slotStart,
      startIso: slotStart.toISOString(),
      status: hasReservation ? 'booked' : 'open',
      isPast: slotStart.getTime() <= now.getTime(),
    })
  }

  return slots
}

export function CastTimelineModal({
  open,
  initialDate,
  selectedCastId,
  selectedSlotIso,
  onClose,
  onSelectSlot,
}: CastTimelineModalProps) {
  const [activeDate, setActiveDate] = useState<Date>(initialDate)
  const [days, setScheduleDays] = useState<PublicScheduleDay[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    if (!open) {
      return
    }
    setActiveDate(initialDate)
  }, [initialDate, open])

  const activeDateKey = useMemo(
    () => format(activeDate, 'yyyy-MM-dd'),
    [activeDate]
  )

  const fetchSchedule = useCallback(async () => {
    if (!open) return
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(
        `/api/store-schedule?date=${encodeURIComponent(activeDateKey)}&days=1&_=${refreshKey}`,
        {
          cache: 'no-store',
          credentials: 'include',
        }
      )
      if (!response.ok) {
        throw new Error(`Failed to fetch schedule: ${response.status}`)
      }
      const payload = await response.json()
      const data = Array.isArray(payload?.data) ? payload.data : []
      setScheduleDays(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'スケジュールの取得に失敗しました。')
      setScheduleDays([])
    } finally {
      setLoading(false)
    }
  }, [activeDateKey, open, refreshKey])

  useEffect(() => {
    fetchSchedule()
  }, [fetchSchedule])

  const activeDay = useMemo(() => {
    const parsedKey = parseISO(`${activeDateKey}T00:00:00`)
    return (
      days.find((day) => isSameDay(parseISO(day.date), parsedKey)) ?? {
        date: activeDate.toISOString(),
        entries: [],
      }
    )
  }, [activeDate, activeDateKey, days])

  const handleMoveDay = (offset: number) => {
    setActiveDate((prev) => addDays(prev, offset))
  }

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1)
  }

  const renderCastEntry = (entry: PublicCastSchedule) => {
    const slots = buildTimelineSlots(entry)
    const hasSlots = slots.length > 0

    return (
      <div
        key={`${entry.castId}-${entry.id}`}
        className="rounded-lg border bg-card p-4 shadow-sm"
      >
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-base font-semibold">
              <User className="h-4 w-4 text-muted-foreground" />
              <span>{entry.cast?.name ?? 'キャスト未登録'}</span>
              {entry.cast?.workStatus && (
                <Badge variant="secondary" className="text-xs">
                  {entry.cast.workStatus}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {entry.startTime && entry.endTime
                ? `${format(new Date(entry.startTime), 'HH:mm')} - ${format(new Date(entry.endTime), 'HH:mm')}`
                : '勤務時間未設定'}
            </div>
          </div>
          <div className="text-sm text-muted-foreground">
            予約：
            <span className="font-semibold">{entry.reservations?.length ?? 0}</span>件
          </div>
        </div>

        {hasSlots ? (
          <div className="mt-3 grid grid-cols-3 gap-2 md:grid-cols-6">
            {slots.map((slot) => {
              const isSelected =
                entry.castId === selectedCastId && slot.startIso === selectedSlotIso
              const isDisabled = slot.status !== 'open' || slot.isPast
              return (
                <button
                  key={slot.id}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => onSelectSlot(entry.castId, slot.startIso)}
                  className={cn(
                    'flex h-10 items-center justify-center rounded-md border text-sm font-semibold transition-colors',
                    isSelected && 'border-purple-500 bg-purple-50 text-purple-600',
                    !isSelected && slot.status === 'open' && !slot.isPast
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                      : '',
                    isDisabled && !isSelected && 'cursor-not-allowed border-dashed text-muted-foreground',
                    slot.status === 'booked' && 'bg-red-50 text-red-500',
                    slot.isPast && slot.status === 'open' && 'bg-gray-50 text-gray-400'
                  )}
                >
                  {slot.status === 'booked' ? '×' : slot.label}
                </button>
              )
            })}
          </div>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">
            勤務時間または予約情報が設定されていません。
          </p>
        )}
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent
        className="max-h-[90vh] w-full max-w-5xl overflow-hidden"
        aria-describedby="cast-timeline-description"
      >
        <DialogHeader>
          <DialogTitle>タイムラインで空き状況を確認</DialogTitle>
          <DialogDescription id="cast-timeline-description" className="sr-only">
            選択した日のキャスト別空き時間を確認し、予約枠を選択できます。
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => handleMoveDay(-1)}>
                前日
              </Button>
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Calendar className="h-4 w-4 text-purple-500" />
                {format(activeDate, 'yyyy年M月d日(E)', { locale: ja })}
              </div>
              <Button variant="ghost" size="sm" onClick={() => handleMoveDay(1)}>
                翌日
              </Button>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              className="inline-flex items-center gap-1"
            >
              <RefreshCcw className="h-4 w-4" />
              再読み込み
            </Button>
          </div>

          {error && (
            <div className="rounded-md border border-destructive bg-destructive/10 px-4 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex h-48 items-center justify-center text-muted-foreground">
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              読み込み中...
            </div>
          ) : (
            <ScrollArea className="h-[60vh] pr-4">
              {activeDay.entries.length === 0 ? (
                <div className="flex h-48 flex-col items-center justify-center gap-2 rounded-lg border border-dashed text-center text-muted-foreground">
                  <Calendar className="h-10 w-10 text-purple-300" />
                  <p>この日は出勤予定がありません。</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {activeDay.entries.map((entry) => renderCastEntry(entry))}
                </div>
              )}
            </ScrollArea>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
