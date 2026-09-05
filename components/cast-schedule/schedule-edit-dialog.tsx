'use client'

/**
 * @design_doc   SCH-01/SCH-02 キャスト出勤時間テンプレートと休み登録
 * @related_to   ScheduleGrid, applyShiftTemplate, Cast.scheduleTemplates
 * @known_issues None
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { addWeeks, subDays } from 'date-fns'
import { formatInTimeZone, zonedTimeToUtc } from 'date-fns-tz'
import { ja } from 'date-fns/locale'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useUnsavedChangesWarning } from '@/hooks/use-unsaved-changes-warning'
import { buildStoreScopedEndpoint } from '@/lib/store/endpoints'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Calendar, Save, X, Clock, User } from 'lucide-react'
import {
  SCHEDULE_WORK_STATUSES,
  type CastScheduleStatus,
  type ScheduleWorkStatus,
} from '@/lib/cast-schedule/old-types'
import { getDateRange } from '@/lib/cast-schedule/utils'
import { scheduleEditDayCount, type ScheduleEditSpan } from '@/lib/cast-schedule/edit-span'
import { useStore } from '@/contexts/store-context'
import {
  DEFAULT_BUSINESS_HOURS,
  parseBusinessHoursString,
  type BusinessHoursRange,
  formatMinutesAsLabel,
} from '@/lib/settings/business-hours'
import { toast } from '@/hooks/use-toast'
import { findScheduleValidationError } from '@/lib/cast-schedule/validation'
import {
  applyShiftTemplate,
  createHolidayTemplate,
  mergeCastShiftTemplates,
  type CastShiftTemplate,
} from '@/lib/cast-schedule/shift-template'

export interface DaySchedule {
  date: string // yyyy-mm-dd format
  status: ScheduleWorkStatus
  startTime?: string // HH:mm format
  endTime?: string // HH:mm format
  note?: string
  mediaText?: string
  isAvailable?: boolean
}

export interface WeeklyScheduleEdit {
  [date: string]: DaySchedule
}

const startOfTokyoWeek = (date: Date): Date => {
  const [year, month, day] = formatInTimeZone(date, 'Asia/Tokyo', 'yyyy-MM-dd')
    .split('-')
    .map(Number)
  const calendarDate = new Date(Date.UTC(year, month - 1, day))
  const daysSinceMonday = (calendarDate.getUTCDay() + 6) % 7
  return subDays(calendarDate, daysSinceMonday)
}

interface ScheduleEditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  castName: string
  castId: string
  initialSchedule: { [date: string]: CastScheduleStatus }
  startDate: Date
  onSave: (castId: string, schedule: WeeklyScheduleEdit) => void | Promise<void>
  focusDate?: string | null
}

export function ScheduleEditDialog({
  open,
  onOpenChange,
  castName,
  castId,
  initialSchedule,
  startDate,
  onSave,
  focusDate = null,
}: ScheduleEditDialogProps) {
  const { currentStore } = useStore()
  const timeZone = 'Asia/Tokyo'
  const [businessHours, setBusinessHours] = useState<BusinessHoursRange>(DEFAULT_BUSINESS_HOURS)
  const [templates, setTemplates] = useState<CastShiftTemplate[]>(() =>
    mergeCastShiftTemplates(null)
  )
  const [templateStartTime, setTemplateStartTime] = useState('')
  const [templateEndTime, setTemplateEndTime] = useState('')
  const [selectedDate, setSelectedDate] = useState<string | null>(focusDate)
  const [quickTemplateId, setQuickTemplateId] = useState('edit')
  const [weekOffset, setWeekOffset] = useState(0)
  const [rangeLoading, setRangeLoading] = useState(false)
  const [rangeError, setRangeError] = useState(false)
  const [rangeRetry, setRangeRetry] = useState(0)
  const [saving, setSaving] = useState(false)
  const [savingTemplates, setSavingTemplates] = useState(false)
  const [templatesReady, setTemplatesReady] = useState(false)
  const [templatesError, setTemplatesError] = useState(false)
  const [discardOpen, setDiscardOpen] = useState(false)
  const [dirtyDates, setDirtyDates] = useState<Set<string>>(new Set())
  const dirtyDatesRef = useRef(new Set<string>())
  const editingSession = useRef<string | null>(null)
  const [editSpan, setEditSpan] = useState<ScheduleEditSpan>('week')
  const [schedule, setSchedule] = useState<WeeklyScheduleEdit>(() => {
    const converted: WeeklyScheduleEdit = {}
    Object.entries(initialSchedule).forEach(([date, status]) => {
      converted[date] = {
        date,
        status: status.type,
        startTime: status.startTime,
        endTime: status.endTime,
        note: status.note,
        mediaText: status.mediaText,
        isAvailable: status.isAvailable !== false,
      }
    })
    return converted
  })

  // Generate 7 days starting from the given start date
  const weekStart = useMemo(
    () => addWeeks(startOfTokyoWeek(startDate), weekOffset),
    [startDate, weekOffset]
  )
  useUnsavedChangesWarning(
    open && (dirtyDates.size > 0 || saving || Boolean(templateStartTime || templateEndTime))
  )
  const markDirty = (dateKey: string) => {
    dirtyDatesRef.current.add(dateKey)
    setDirtyDates(new Set(dirtyDatesRef.current))
  }
  const requestClose = (nextOpen: boolean) => {
    if (saving || savingTemplates) return
    if (!nextOpen && (dirtyDates.size > 0 || templateStartTime || templateEndTime)) {
      setDiscardOpen(true)
    } else onOpenChange(nextOpen)
  }
  const visibleDays = getDateRange(weekStart, scheduleEditDayCount(editSpan))

  const statusOptions: { value: ScheduleWorkStatus; label: string; color: string }[] =
    SCHEDULE_WORK_STATUSES.map((value) => ({
      value,
      label: value,
      color:
        value === '休日'
          ? 'bg-red-100 text-red-700'
          : value === '未入力'
            ? 'bg-gray-100 text-gray-600'
            : value === '遅刻' || value === '早退'
              ? 'bg-amber-100 text-amber-700'
              : 'bg-green-100 text-green-700',
    }))

  useEffect(() => {
    if (!open) {
      editingSession.current = null
      return
    }
    const sessionKey = `${currentStore.id}:${castId}`
    if (editingSession.current === sessionKey) return
    editingSession.current = sessionKey
    const converted: WeeklyScheduleEdit = {}
    Object.entries(initialSchedule).forEach(([date, status]) => {
      converted[date] = {
        date,
        status: status.type,
        startTime: status.startTime,
        endTime: status.endTime,
        note: status.note,
        mediaText: status.mediaText,
        isAvailable: status.isAvailable !== false,
      }
    })
    setSchedule(converted)
    setWeekOffset(0)
    setSelectedDate(focusDate)
    setQuickTemplateId('edit')
    dirtyDatesRef.current.clear()
    setDirtyDates(new Set())
    setDiscardOpen(false)
    setEditSpan('week')
    setTemplateStartTime('')
    setTemplateEndTime('')
  }, [castId, currentStore.id, open, initialSchedule, focusDate])

  useEffect(() => {
    let ignore = false
    const loadBusinessHours = async () => {
      try {
        const params = new URLSearchParams()
        if (currentStore.id) {
          params.set('storeId', currentStore.id)
        }
        const response = await fetch(
          `/api/settings/store${params.toString() ? `?${params.toString()}` : ''}`,
          {
            credentials: 'include',
            cache: 'no-store',
          }
        )
        if (!response.ok) {
          throw new Error(`Failed to fetch store settings: ${response.status}`)
        }
        const payload = await response.json()
        const settings = payload?.data ?? payload
        const parsed = parseBusinessHoursString(settings?.businessHours)
        if (!ignore) {
          setBusinessHours(parsed)
        }
      } catch (error) {
        console.error('Failed to load business hours for schedule editor:', error)
        if (!ignore) {
          setBusinessHours(DEFAULT_BUSINESS_HOURS)
        }
      }
    }

    loadBusinessHours()
    return () => {
      ignore = true
    }
  }, [currentStore.id])

  useEffect(() => {
    if (!open) return
    let ignore = false
    const loadTemplates = async () => {
      setTemplatesReady(false)
      setTemplatesError(false)
      setTemplates(mergeCastShiftTemplates(null))
      try {
        const params = new URLSearchParams({ id: castId })
        if (currentStore.id) {
          params.set('storeId', currentStore.id)
        }
        const response = await fetch(`/api/cast?${params.toString()}`, {
          credentials: 'include',
          cache: 'no-store',
        })
        if (!response.ok) {
          throw new Error(`Failed to fetch cast templates: ${response.status}`)
        }
        const payload = await response.json()
        const saved = Array.isArray(payload?.scheduleTemplates) ? payload.scheduleTemplates : []
        if (!ignore) {
          setTemplates(mergeCastShiftTemplates(saved))
          setTemplatesReady(true)
        }
      } catch (error) {
        console.error('Failed to load shift templates:', error)
        if (!ignore) {
          setTemplatesError(true)
        }
      }
    }
    void loadTemplates()
    return () => {
      ignore = true
    }
  }, [open, castId, currentStore.id])

  useEffect(() => {
    if (!open || (editSpan === 'week' && weekOffset === 0)) {
      setRangeLoading(false)
      setRangeError(false)
      return
    }
    setRangeLoading(true)
    setRangeError(false)
    let ignore = false

    const loadFourWeekSchedule = async () => {
      const range = getDateRange(weekStart, scheduleEditDayCount(editSpan))
      const startDateKey = formatInTimeZone(range[0], 'UTC', 'yyyy-MM-dd')
      const endDateKey = formatInTimeZone(range[range.length - 1], 'UTC', 'yyyy-MM-dd')
      const params = new URLSearchParams({
        castId,
        startDate: startDateKey,
        endDate: endDateKey,
        storeId: currentStore.id,
      })

      try {
        const response = await fetch(`/api/cast-schedule?${params.toString()}`, {
          credentials: 'include',
          cache: 'no-store',
        })
        if (!response.ok) throw new Error(`Failed to fetch four-week schedule: ${response.status}`)
        const payload = await response.json()
        const records = Array.isArray(payload?.data)
          ? payload.data
          : Array.isArray(payload)
            ? payload
            : []
        if (ignore) return

        setSchedule((previous) => {
          const next = { ...previous }
          for (const date of range) {
            const dateKey = formatInTimeZone(date, 'UTC', 'yyyy-MM-dd')
            const record = records.find(
              (item: { date?: string }) =>
                item.date &&
                formatInTimeZone(new Date(item.date), timeZone, 'yyyy-MM-dd') === dateKey
            )
            if (next[dateKey] || dirtyDatesRef.current.has(dateKey)) continue
            if (record) {
              next[dateKey] = {
                date: dateKey,
                status: (record.status as ScheduleWorkStatus | undefined) ?? '出勤予定',
                startTime: formatInTimeZone(new Date(record.startTime), timeZone, 'HH:mm'),
                endTime: formatInTimeZone(new Date(record.endTime), timeZone, 'HH:mm'),
                note: record.notes ?? undefined,
                mediaText: record.mediaText ?? undefined,
                isAvailable: record.isAvailable !== false,
              }
            } else if (!next[dateKey]) {
              next[dateKey] = { date: dateKey, status: '未入力' }
            }
          }
          return next
        })
      } catch (error) {
        console.error('Failed to load four-week schedule:', error)
        if (ignore) return
        setRangeError(true)
        toast({
          title: '4週間分の出勤表を取得できませんでした',
          description: '通信状態を確認して、もう一度お試しください。',
          variant: 'destructive',
        })
      }
    }

    void loadFourWeekSchedule().finally(() => {
      if (!ignore) setRangeLoading(false)
    })
    return () => {
      ignore = true
    }
  }, [castId, currentStore.id, editSpan, open, weekStart, weekOffset, rangeRetry])

  const timeOptions = useMemo(() => {
    const options: string[] = []
    const incrementMinutes = 30
    let minutes = businessHours.startMinutes
    while (minutes <= businessHours.endMinutes) {
      options.push(formatMinutesAsLabel(minutes))
      minutes += incrementMinutes
    }
    return options.length > 0 ? options : ['00:00']
  }, [businessHours])

  const handleScheduleChange = (dateKey: string, field: keyof DaySchedule, value: any) => {
    markDirty(dateKey)
    setSchedule((prev) => ({
      ...prev,
      [dateKey]: {
        ...prev[dateKey],
        date: dateKey,
        [field]: value,
        // Reset times when status changes to 休日
        ...(field === 'status' &&
          value === '休日' && {
            startTime: undefined,
            endTime: undefined,
          }),
      },
    }))
  }

  const handleSave = async () => {
    if (saving || rangeLoading || rangeError) return
    const validationError = findScheduleValidationError(
      schedule,
      ['出勤予定', '出勤中', '早退', '遅刻'],
      (dateKey) => {
        const dateInJst = zonedTimeToUtc(`${dateKey}T00:00:00`, timeZone)
        return formatInTimeZone(dateInJst, timeZone, 'M月d日(E)', { locale: ja })
      }
    )
    if (validationError) {
      toast({
        title: '入力内容を確認してください',
        description: validationError,
        variant: 'destructive',
      })
      return
    }

    const validatedSchedule = Object.fromEntries(
      Object.entries(schedule).filter(([key]) => dirtyDates.has(key))
    )
    setSaving(true)
    try {
      await onSave(castId, validatedSchedule)
      dirtyDatesRef.current.clear()
      setDirtyDates(new Set())
    } catch (error) {
      console.error('Failed to save schedule:', error)
      toast({
        title: '保存できませんでした',
        description: '入力内容を残しています。再度保存してください。',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const getDaySchedule = (dateKey: string): DaySchedule => {
    return (
      schedule[dateKey] || {
        date: dateKey,
        status: '未入力',
      }
    )
  }

  const getStatusColor = (status: ScheduleWorkStatus) => {
    return statusOptions.find((opt) => opt.value === status)?.color || 'bg-gray-100 text-gray-600'
  }

  const applyTemplateToDate = (template: CastShiftTemplate, dateKey: string) => {
    const applied = applyShiftTemplate(template, dateKey)
    markDirty(dateKey)
    setSchedule((prev) => ({
      ...prev,
      [dateKey]: {
        ...prev[dateKey],
        date: dateKey,
        status: applied.status,
        startTime: applied.startTime,
        endTime: applied.endTime,
      },
    }))
  }

  const persistTemplates = async (next: CastShiftTemplate[]) => {
    if (savingTemplates || !templatesReady) return false
    setSavingTemplates(true)
    try {
      const response = await fetch(buildStoreScopedEndpoint('/api/cast', currentStore.id), {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: castId,
          storeId: currentStore.id,
          scheduleTemplates: next,
        }),
      })
      if (!response.ok) {
        throw new Error(`Failed to save templates: ${response.status}`)
      }
      setTemplates(next)
      return true
    } catch (error) {
      console.error('Failed to persist shift templates:', error)
      toast({
        title: 'テンプレートを保存できませんでした',
        description: '出勤時間テンプレートの保存に失敗しました。',
        variant: 'destructive',
      })
      return false
    } finally {
      setSavingTemplates(false)
    }
  }

  const saveCurrentDayAsTemplate = async () => {
    if (!templateStartTime || !templateEndTime) {
      toast({
        title: '出勤時間を確認してください',
        description: '開始・終了時間を入力してください。',
        variant: 'destructive',
      })
      return
    }
    const customTemplates = templates.filter((template) => !template.isHoliday)
    if (customTemplates.length >= 4) {
      toast({
        title: 'テンプレートは4つまでです',
        description: '不要なテンプレートを削除してから保存してください。',
        variant: 'destructive',
      })
      return
    }
    const next: CastShiftTemplate[] = [
      ...templates.filter((template) => template.id !== 'holiday'),
      {
        id: `custom-${Date.now()}`,
        name: `${templateStartTime}-${templateEndTime}`,
        startTime: templateStartTime,
        endTime: templateEndTime,
        isHoliday: false,
      },
      createHolidayTemplate(),
    ]
    if (await persistTemplates(next)) {
      setTemplateStartTime('')
      setTemplateEndTime('')
    }
  }

  const removeTemplate = (templateId: string) => {
    void persistTemplates(templates.filter((template) => template.id !== templateId))
  }

  useEffect(() => {
    if (!open || !focusDate) {
      return
    }
    const frame = window.requestAnimationFrame(() => {
      document.getElementById(`schedule-edit-day-${focusDate}`)?.scrollIntoView({
        block: 'start',
        behavior: 'smooth',
      })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [editSpan, focusDate, open])

  return (
    <Dialog open={open} onOpenChange={requestClose}>
      <DialogContent
        className="max-h-[94vh] max-w-5xl overflow-y-auto p-3"
        aria-describedby={undefined}
      >
        <DialogHeader
          data-testid="schedule-sticky-header"
          className="sticky top-0 z-30 border-b bg-background pb-3"
        >
          <div className="flex items-center justify-between gap-3">
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              {castName} - スケジュール編集
            </DialogTitle>
            <Button
              disabled={saving || rangeLoading || rangeError}
              onClick={handleSave}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              <Save className="mr-2 h-4 w-4" />
              {saving ? '保存中…' : '保存'}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            {formatInTimeZone(weekStart, timeZone, 'yyyy年M月d日', { locale: ja })} 〜{' '}
            {formatInTimeZone(visibleDays[visibleDays.length - 1], timeZone, 'M月d日', {
              locale: ja,
            })}
          </p>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={saving}
              onClick={() => setWeekOffset((value) => value - 1)}
            >
              前週
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={saving}
              onClick={() => setWeekOffset((value) => value + 1)}
            >
              翌週
            </Button>
            <span className="text-xs text-muted-foreground">
              {dirtyDates.size > 0 ? '未保存の変更があります' : '保存済み'}
            </span>
          </div>
        </DialogHeader>

        <div className="space-y-2">
          <Button
            type="button"
            variant={editSpan === 'fourWeeks' ? 'default' : 'outline'}
            size="sm"
            aria-pressed={editSpan === 'fourWeeks'}
            onClick={() => setEditSpan((span) => (span === 'week' ? 'fourWeeks' : 'week'))}
          >
            4週間をカレンダー入力
          </Button>
          <p className="text-xs text-muted-foreground">
            開始・終了時間の組み合わせを、このキャスト専用のテンプレートとして保存できます。
          </p>
          {templatesError && (
            <p role="alert" className="text-sm text-destructive">
              テンプレートを読み込めませんでした。閉じて開き直してください。
            </p>
          )}
          <div className="flex flex-wrap items-end gap-2">
            <div>
              <Label htmlFor="shift-template-start-time">テンプレート開始時間</Label>
              <Select value={templateStartTime} onValueChange={setTemplateStartTime}>
                <SelectTrigger
                  id="shift-template-start-time"
                  aria-label="テンプレート開始時間"
                  className="w-40"
                >
                  <SelectValue placeholder="開始時間" />
                </SelectTrigger>
                <SelectContent>
                  {timeOptions.map((time) => (
                    <SelectItem key={`template-start-${time}`} value={time}>
                      {time}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="shift-template-end-time">テンプレート終了時間</Label>
              <Select value={templateEndTime} onValueChange={setTemplateEndTime}>
                <SelectTrigger
                  id="shift-template-end-time"
                  aria-label="テンプレート終了時間"
                  className="w-40"
                >
                  <SelectValue placeholder="終了時間" />
                </SelectTrigger>
                <SelectContent>
                  {timeOptions.map((time) => (
                    <SelectItem key={`template-end-${time}`} value={time}>
                      {time}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={savingTemplates || !templatesReady}
              onClick={saveCurrentDayAsTemplate}
            >
              この時間をテンプレート保存
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {templates
              .filter((template) => !template.isHoliday)
              .map((template) => (
                <div
                  key={`saved-${template.id}`}
                  className="flex items-center gap-1 rounded-md border px-2 py-1 text-sm"
                >
                  <span>
                    {template.name === `${template.startTime}-${template.endTime}`
                      ? template.name
                      : `${template.name} ${template.startTime}-${template.endTime}`}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-label={`${template.name}を削除`}
                    disabled={savingTemplates}
                    onClick={() => removeTemplate(template.id)}
                  >
                    ×
                  </Button>
                </div>
              ))}
          </div>
        </div>

        {rangeLoading && <p role="status">出勤表を読み込み中です...</p>}
        {rangeError && (
          <div role="alert">
            出勤表を取得できませんでした。
            <Button size="sm" variant="outline" onClick={() => setRangeRetry((value) => value + 1)}>
              再読み込み
            </Button>
          </div>
        )}
        <fieldset disabled={saving || rangeLoading || rangeError} className="min-w-0 space-y-2">
          {editSpan === 'fourWeeks' && (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Label htmlFor="calendar-quick-template">日付クリック</Label>
                <Select value={quickTemplateId} onValueChange={setQuickTemplateId}>
                  <SelectTrigger id="calendar-quick-template" className="h-8 w-56">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="edit">選んだ日を編集</SelectItem>
                    {templates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}を一発入力
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div role="grid" aria-label="4週間出勤カレンダー" className="grid grid-cols-7 gap-1">
                {['月', '火', '水', '木', '金', '土', '日'].map((day) => (
                  <div key={day} className="text-center text-xs text-muted-foreground">
                    {day}
                  </div>
                ))}
                {visibleDays.map((date) => {
                  const key = formatInTimeZone(date, 'UTC', 'yyyy-MM-dd')
                  const day = getDaySchedule(key)
                  const label = formatInTimeZone(date, timeZone, 'M月d日(E)', { locale: ja })
                  return (
                    <button
                      type="button"
                      data-calendar-date={key}
                      key={key}
                      aria-label={`${label} ${day.status}`}
                      aria-pressed={
                        key ===
                        (selectedDate ?? formatInTimeZone(visibleDays[0], 'UTC', 'yyyy-MM-dd'))
                      }
                      className={`min-h-16 rounded border p-1 text-left text-xs ${getStatusColor(day.status)} ${key === selectedDate ? 'ring-2 ring-emerald-600' : ''}`}
                      onClick={() => {
                        setSelectedDate(key)
                        const template = templates.find((item) => item.id === quickTemplateId)
                        if (template) applyTemplateToDate(template, key)
                      }}
                    >
                      <strong className="block">
                        {formatInTimeZone(date, timeZone, 'M/d(E)', { locale: ja })}
                      </strong>
                      <span className="block">{day.status}</span>
                      {day.startTime && day.endTime && (
                        <span className="block whitespace-nowrap">
                          {day.startTime}–{day.endTime}
                        </span>
                      )}
                      {dirtyDates.has(key) && <span className="text-amber-800">未保存</span>}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
          <div className="space-y-2">
            {(editSpan === 'fourWeeks'
              ? [
                  visibleDays.find(
                    (date) => formatInTimeZone(date, 'UTC', 'yyyy-MM-dd') === selectedDate
                  ) ?? visibleDays[0],
                ]
              : visibleDays
            ).map((date) => {
              const dateKey = formatInTimeZone(date, 'UTC', 'yyyy-MM-dd')
              const daySchedule = getDaySchedule(dateKey)
              const isWorkDay = !['未入力', '休日'].includes(daySchedule.status)

              return (
                <Card
                  key={dateKey}
                  id={`schedule-edit-day-${dateKey}`}
                  className="border-l-4 border-l-emerald-500"
                >
                  <CardHeader className="px-2 py-1">
                    <CardTitle className="flex flex-col gap-2 text-base sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex items-center gap-3">
                        <Calendar className="h-5 w-5" />
                        {formatInTimeZone(date, timeZone, 'M月d日(E)', { locale: ja })}
                        <Badge className={getStatusColor(daySchedule.status)}>
                          {daySchedule.status}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {templates.map((template) => (
                          <Button
                            key={`${dateKey}-${template.id}`}
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => applyTemplateToDate(template, dateKey)}
                          >
                            {template.isHoliday
                              ? '休みを適用'
                              : `${template.name === `${template.startTime}-${template.endTime}` ? template.name : `${template.name} ${template.startTime}-${template.endTime}`} を適用`}
                          </Button>
                        ))}
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 p-2 pt-0">
                    <div className="grid grid-cols-2 items-end gap-2 sm:grid-cols-4">
                      {/* ステータス選択 */}
                      <div>
                        <Label
                          htmlFor={`schedule-status-${dateKey}`}
                          className="mb-1 block text-xs font-medium"
                        >
                          勤務状況
                        </Label>
                        <Select
                          value={daySchedule.status}
                          onValueChange={(value: ScheduleWorkStatus) =>
                            handleScheduleChange(dateKey, 'status', value)
                          }
                        >
                          <SelectTrigger
                            id={`schedule-status-${dateKey}`}
                            aria-label="勤務状況"
                            className="h-8 w-full"
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {statusOptions.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                <div className="flex items-center gap-2">
                                  <div
                                    className={`h-3 w-3 rounded-full ${option.color.split(' ')[0]}`}
                                  />
                                  {option.label}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* 時間設定（出勤日のみ） */}
                      {isWorkDay && (
                        <div className="contents">
                          <div>
                            <Label className="mb-1 flex items-center gap-1 text-xs font-medium">
                              <Clock className="h-4 w-4" />
                              開始時間
                            </Label>
                            <Select
                              value={daySchedule.startTime || ''}
                              onValueChange={(value) =>
                                handleScheduleChange(dateKey, 'startTime', value)
                              }
                            >
                              <SelectTrigger className="h-8">
                                <SelectValue placeholder="開始時間を選択" />
                              </SelectTrigger>
                              <SelectContent>
                                {(daySchedule.startTime &&
                                !timeOptions.includes(daySchedule.startTime)
                                  ? [...timeOptions, daySchedule.startTime]
                                  : timeOptions
                                ).map((time) => (
                                  <SelectItem key={time} value={time}>
                                    {time}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="mb-1 flex items-center gap-1 text-xs font-medium">
                              <Clock className="h-4 w-4" />
                              終了時間
                            </Label>
                            <Select
                              value={daySchedule.endTime || ''}
                              onValueChange={(value) =>
                                handleScheduleChange(dateKey, 'endTime', value)
                              }
                            >
                              <SelectTrigger className="h-8">
                                <SelectValue placeholder="終了時間を選択" />
                              </SelectTrigger>
                              <SelectContent>
                                {(daySchedule.endTime && !timeOptions.includes(daySchedule.endTime)
                                  ? [...timeOptions, daySchedule.endTime]
                                  : timeOptions
                                ).map((time) => (
                                  <SelectItem key={time} value={time}>
                                    {time}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="min-w-0">
                            <Label className="mb-1 block text-xs font-medium">予約受付</Label>
                            <Select
                              value={
                                daySchedule.isAvailable === false ? 'unavailable' : 'available'
                              }
                              onValueChange={(value) =>
                                handleScheduleChange(dateKey, 'isAvailable', value === 'available')
                              }
                            >
                              <SelectTrigger aria-label="予約受付" className="h-8">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="available">予約受付可能</SelectItem>
                                <SelectItem value="unavailable">予約受付停止</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      )}
                    </div>
                    {/* 備考 */}
                    <div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <div>
                          <Label
                            htmlFor={`schedule-media-${dateKey}`}
                            className="mb-1 block text-sm font-medium"
                          >
                            媒体用テキスト
                          </Label>
                          <Input
                            id={`schedule-media-${dateKey}`}
                            type="text"
                            className="h-8"
                            value={daySchedule.mediaText || ''}
                            onChange={(e) =>
                              handleScheduleChange(dateKey, 'mediaText', e.target.value)
                            }
                            placeholder="媒体へ掲載する一文"
                          />
                        </div>
                        <div>
                          <Label
                            htmlFor={`schedule-note-${dateKey}`}
                            className="mb-1 block text-sm font-medium"
                          >
                            備考
                          </Label>
                          <Input
                            id={`schedule-note-${dateKey}`}
                            type="text"
                            className="h-8"
                            value={daySchedule.note || ''}
                            onChange={(e) => handleScheduleChange(dateKey, 'note', e.target.value)}
                            placeholder="店舗内の備考"
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </fieldset>
        <div className="flex justify-end gap-2 border-t bg-background py-2">
          <Button
            variant="outline"
            disabled={saving}
            onClick={() => setWeekOffset((value) => value - 1)}
          >
            前週
          </Button>
          <Button
            variant="outline"
            disabled={saving}
            onClick={() => setWeekOffset((value) => value + 1)}
          >
            翌週
          </Button>
          <Button disabled={saving || rangeLoading || rangeError} onClick={handleSave}>
            {saving ? '保存中…' : '保存'}
          </Button>
          <Button
            variant="outline"
            disabled={saving || savingTemplates}
            onClick={() => requestClose(false)}
          >
            <X className="mr-2 h-4 w-4" />
            閉じる
          </Button>
        </div>
      </DialogContent>
      <AlertDialog open={discardOpen} onOpenChange={setDiscardOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>保存されていない変更があります</AlertDialogTitle>
            <AlertDialogDescription>変更を破棄して閉じますか？</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>編集を続ける</AlertDialogCancel>
            <AlertDialogAction onClick={() => onOpenChange(false)}>
              変更を破棄して閉じる
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  )
}
