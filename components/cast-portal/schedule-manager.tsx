'use client'

import { useCallback, useEffect, useMemo, useState, useTransition } from 'react'
import { differenceInCalendarDays, format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/use-toast'
import type { CastScheduleEntry, CastScheduleWindow } from '@/lib/cast-portal/types'
import { cn } from '@/lib/utils'

const STATUS_OPTIONS = [
  { value: 'working', label: '出勤予定' },
  { value: 'off', label: '休日' },
]

const REQUEST_ENDPOINT = '/api/cast-portal/schedule'

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
          mode === 'working'
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
    return entries.some((entry, index) => {
      const baseline = initialEntries[index]
      return (
        entry.date !== baseline?.date ||
        entry.isAvailable !== baseline?.isAvailable ||
        entry.startTime !== baseline?.startTime ||
        entry.endTime !== baseline?.endTime
      )
    })
  }, [entries, initialEntries])

  const loadSchedule = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await fetch(`${REQUEST_ENDPOINT}?days=7`, {
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
      prev.map((entry) => (entry.date === date ? { ...entry, ...updates } : entry))
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
        if (!entry.isAvailable) {
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
        const payload = {
          startDate: meta?.startDate,
          days: meta && meta.startDate && meta.endDate
            ? differenceInCalendarDays(new Date(`${meta.endDate}T00:00:00`), new Date(`${meta.startDate}T00:00:00`)) + 1
            : undefined,
          updates: entries.map((entry) => ({
            date: entry.date,
            status: entry.isAvailable ? 'working' : 'off',
            startTime: entry.isAvailable ? entry.startTime : undefined,
            endTime: entry.isAvailable ? entry.endTime : undefined,
          })),
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
  }, [entries, meta, toast])

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 space-y-0 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle className="text-lg">出勤予定の管理</CardTitle>
          <p className="text-sm text-muted-foreground">
            今週のシフトを編集して、管理側と最新の情報を共有しましょう。
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

  return (
    <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-3">
      <div className="flex items-center justify-between gap-2 text-sm font-medium text-muted-foreground">
        <span>{dayLabel}</span>
        <Select
          value={entry.isAvailable ? 'working' : 'off'}
          onValueChange={(value) => onStatusChange(entry.date, value as 'working' | 'off')}
        >
          <SelectTrigger className="h-8 w-28 text-xs">
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
      <div className="grid gap-2 sm:grid-cols-2">
        <Input
          type="time"
          step={900}
          value={entry.startTime}
          onChange={(event) => onTimeChange(entry.date, 'startTime', event.target.value)}
          disabled={!entry.isAvailable}
          className={cn('h-11 text-base', !entry.isAvailable && 'opacity-60')}
        />
        <Input
          type="time"
          step={900}
          value={entry.endTime}
          onChange={(event) => onTimeChange(entry.date, 'endTime', event.target.value)}
          disabled={!entry.isAvailable}
          className={cn('h-11 text-base', !entry.isAvailable && 'opacity-60')}
        />
      </div>
    </div>
  )
}
