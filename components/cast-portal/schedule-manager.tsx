'use client'

import { useCallback, useEffect, useMemo, useState, useTransition } from 'react'
import { differenceInCalendarDays, format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/use-toast'
import { Badge } from '@/components/ui/badge'
import type {
  CastScheduleEntry,
  CastScheduleLockReason,
  CastScheduleWindow,
} from '@/lib/cast-portal/types'
import { cn } from '@/lib/utils'

const STATUS_OPTIONS = [
  { value: 'working', label: '出勤予定' },
  { value: 'off', label: '休日' },
]

const REQUEST_ENDPOINT = '/api/cast-portal/schedule'
const SCHEDULE_WINDOW_DAYS = 14

const LOCK_REASON_MESSAGES: Record<CastScheduleLockReason, string> = {
  near_term: '直近1週間（7日以内）の予定変更は店舗へ連絡してください。',
  has_reservations: '予約が入っているため、この日の予定は変更できません。',
}

function hasScheduleChanged(entry: CastScheduleEntry, baseline?: CastScheduleEntry) {
  if (!baseline) {
    return true
  }
  return (
    entry.isAvailable !== baseline.isAvailable ||
    entry.startTime !== baseline.startTime ||
    entry.endTime !== baseline.endTime
  )
}

export function CastScheduleManager() {
  const { toast } = useToast()
  const [entries, setEntries] = useState<CastScheduleEntry[]>([])
  const [initialEntries, setInitialEntries] = useState<CastScheduleEntry[]>([])
  const [meta, setMeta] = useState<CastScheduleWindow['meta'] | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isPending, startTransition] = useTransition()

  const handleBulkUpdate = useCallback(
    (mode: 'working' | 'off') => {
      setEntries((prev) =>
        prev.map((entry) =>
          !entry.canEdit
            ? entry
            : mode === 'working'
              ? {
                  ...entry,
                  isAvailable: true,
                  startTime: entry.startTime || '10:00',
                  endTime: entry.endTime || '18:00',
                }
              : {
                  ...entry,
                  isAvailable: false,
                }
        )
      )
    },
    []
  )

  const hasChanges = useMemo(() => {
    if (entries.length !== initialEntries.length) {
      return true
    }
    return entries.some((entry, index) => entry.canEdit && hasScheduleChanged(entry, initialEntries[index]))
  }, [entries, initialEntries])

  const loadSchedule = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`${REQUEST_ENDPOINT}?days=${SCHEDULE_WINDOW_DAYS}`, {
        cache: 'no-store',
      })

      if (!response.ok) {
        throw new Error('出勤予定の取得に失敗しました。')
      }

      const payload = (await response.json()) as CastScheduleWindow
      setEntries(payload.items)
      setInitialEntries(payload.items)
      setMeta(payload.meta)
    } catch (error) {
      toast({
        title: '読み込みに失敗しました',
        description: error instanceof Error ? error.message : undefined,
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }, [toast])

  useEffect(() => {
    void loadSchedule()
  }, [loadSchedule])

  const updateEntry = useCallback((date: string, updates: Partial<CastScheduleEntry>) => {
    setEntries((prev) =>
      prev.map((entry) => {
        if (entry.date !== date || !entry.canEdit) {
          return entry
        }
        return { ...entry, ...updates }
      })
    )
  }, [])

  const handleStatusChange = useCallback(
    (date: string, status: 'working' | 'off') => {
      updateEntry(date, {
        isAvailable: status === 'working',
      })
    },
    [updateEntry]
  )

  const handleTimeChange = useCallback(
    (date: string, field: 'startTime' | 'endTime', value: string) => {
      updateEntry(date, { [field]: value } as Partial<CastScheduleEntry>)
    },
    [updateEntry]
  )

  const handleRefresh = useCallback(() => {
    void loadSchedule()
  }, [loadSchedule])

  const handleSave = useCallback(() => {
    startTransition(async () => {
      const validationError = entries.find((entry) => {
        if (!entry.canEdit || !entry.isAvailable) {
          return false
        }
        return !entry.startTime || !entry.endTime || entry.startTime >= entry.endTime
      })

      if (validationError) {
        toast({
          title: '入力内容を確認してください',
          description: '出勤予定日には開始と終了時刻を正しく設定してください。',
          variant: 'destructive',
        })
        return
      }

      try {
        const updates = entries.reduce<
          Array<{
            date: string
            status: 'working' | 'off'
            startTime?: string
            endTime?: string
          }>
        >((acc, entry, index) => {
          if (!entry.canEdit) {
            return acc
          }
          const baseline = initialEntries[index]
          if (!hasScheduleChanged(entry, baseline)) {
            return acc
          }
          acc.push({
            date: entry.date,
            status: entry.isAvailable ? 'working' : 'off',
            startTime: entry.isAvailable ? entry.startTime : undefined,
            endTime: entry.isAvailable ? entry.endTime : undefined,
          })
          return acc
        }, [])

        if (!updates.length) {
          toast({
            title: '変更が見つかりません',
            description: '更新が必要な日を選択してください。',
          })
          return
        }

        const payload = {
          startDate: meta?.startDate,
          days:
            meta && meta.startDate && meta.endDate
              ? differenceInCalendarDays(
                  new Date(`${meta.endDate}T00:00:00`),
                  new Date(`${meta.startDate}T00:00:00`)
                ) + 1
              : undefined,
          updates,
        }

        const response = await fetch(REQUEST_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        })

        if (!response.ok) {
          const errorBody = await response.json().catch(() => ({}))
          throw new Error(errorBody.error ?? '出勤予定の更新に失敗しました。')
        }

        const windowData = (await response.json()) as CastScheduleWindow
        setEntries(windowData.items)
        setInitialEntries(windowData.items)
        setMeta(windowData.meta)

        toast({ title: '出勤予定を更新しました。' })
      } catch (error) {
        toast({
          title: '更新に失敗しました',
          description: error instanceof Error ? error.message : undefined,
          variant: 'destructive',
        })
      }
    })
  }, [entries, initialEntries, meta, toast])

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 space-y-0 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle className="text-lg">出勤予定の管理</CardTitle>
          <p className="text-sm text-muted-foreground">
            向こう2週間のシフトを調整し、管理側と最新の情報を共有しましょう。
          </p>
          <p className="text-xs text-muted-foreground">
            直近1週間と予約が入っている日の変更はできません。急変時は店舗スタッフへ連絡してください。
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => handleBulkUpdate('off')} disabled={isLoading || isPending}>
            全て休日
          </Button>
          <Button variant="ghost" size="sm" onClick={() => handleBulkUpdate('working')} disabled={isLoading || isPending}>
            全て出勤
          </Button>
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading || isPending}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            再読み込み
          </Button>
          <Button onClick={handleSave} size="sm" disabled={isLoading || isPending || !hasChanges}>
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            変更を保存
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          1週間以内（7日以内）や予約が入っている日の変更はキャストページからは行えません。変更が必要な場合は
          店舗スタッフまでご相談ください。
        </div>
        {isLoading ? (
          <div className="flex items-center justify-center rounded-lg border border-dashed border-border py-12 text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 読み込み中です...
          </div>
        ) : (
          <div className="space-y-3">
            {entries.map((entry) => (
              <ScheduleRow
                key={entry.date}
                entry={entry}
                onStatusChange={handleStatusChange}
                onTimeChange={handleTimeChange}
              />
            ))}
          </div>
        )}
        <div className="flex justify-end">
          <Button onClick={handleSave} size="sm" disabled={isLoading || isPending || !hasChanges}>
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            変更を保存
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function ScheduleRow({
  entry,
  onStatusChange,
  onTimeChange,
}: {
  entry: CastScheduleEntry
  onStatusChange: (date: string, status: 'working' | 'off') => void
  onTimeChange: (date: string, field: 'startTime' | 'endTime', value: string) => void
}) {
  const dayLabel = useMemo(
    () => format(new Date(`${entry.date}T00:00:00`), 'M月d日(E)', { locale: ja }),
    [entry.date]
  )
  const lockMessages = useMemo(
    () => entry.lockReasons.map((reason) => LOCK_REASON_MESSAGES[reason]).filter(Boolean),
    [entry.lockReasons]
  )
  const isReadOnly = !entry.canEdit

  return (
    <div
      className={cn(
        'space-y-3 rounded-lg border border-border bg-muted/20 p-3',
        isReadOnly && 'border-dashed bg-muted/30'
      )}
    >
      <div className="flex items-center justify-between gap-2 text-sm font-medium text-muted-foreground">
        <div className="flex items-center gap-2">
          <span>{dayLabel}</span>
          {entry.hasReservations ? (
            <Badge variant="outline" className="border-amber-300 text-[11px] text-amber-700">
              予約あり
            </Badge>
          ) : null}
        </div>
        <Select
          value={entry.isAvailable ? 'working' : 'off'}
          onValueChange={(value) => onStatusChange(entry.date, value as 'working' | 'off')}
          disabled={isReadOnly}
        >
          <SelectTrigger className="h-8 w-28 text-xs" disabled={isReadOnly}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {lockMessages.length > 0 ? (
        <div className="flex flex-col gap-1 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          {lockMessages.map((message) => (
            <p key={`${entry.date}-${message}`} className="flex items-center gap-1">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              {message}
            </p>
          ))}
        </div>
      ) : null}
      <div className="grid gap-2 sm:grid-cols-2">
        <Input
          type="time"
          step={900}
          value={entry.startTime}
          onChange={(event) => onTimeChange(entry.date, 'startTime', event.target.value)}
          disabled={!entry.isAvailable || isReadOnly}
          className={cn('h-11 text-base', (!entry.isAvailable || isReadOnly) && 'opacity-60')}
        />
        <Input
          type="time"
          step={900}
          value={entry.endTime}
          onChange={(event) => onTimeChange(entry.date, 'endTime', event.target.value)}
          disabled={!entry.isAvailable || isReadOnly}
          className={cn('h-11 text-base', (!entry.isAvailable || isReadOnly) && 'opacity-60')}
        />
      </div>
    </div>
  )
}
