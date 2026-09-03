'use client'

/**
 * @design_doc   SCH-01/SCH-02 キャスト出勤時間テンプレートと休み登録
 * @related_to   ScheduleGrid, applyShiftTemplate, Cast.scheduleTemplates
 * @known_issues None
 */
import { useEffect, useMemo, useState } from 'react'
import { subDays } from 'date-fns'
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
import { Textarea } from '@/components/ui/textarea'
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
  const [newTemplateName, setNewTemplateName] = useState('')
  const [templateStartTime, setTemplateStartTime] = useState('')
  const [templateEndTime, setTemplateEndTime] = useState('')
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
        isAvailable: status.isAvailable !== false,
      }
    })
    return converted
  })

  // Generate 7 days starting from the given start date
  const weekStart = useMemo(() => startOfTokyoWeek(startDate), [startDate])
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
    if (!open) return
    const converted: WeeklyScheduleEdit = {}
    Object.entries(initialSchedule).forEach(([date, status]) => {
      converted[date] = {
        date,
        status: status.type,
        startTime: status.startTime,
        endTime: status.endTime,
        note: status.note,
        isAvailable: status.isAvailable !== false,
      }
    })
    setSchedule(converted)
    setEditSpan('week')
    setNewTemplateName('')
    setTemplateStartTime('')
    setTemplateEndTime('')
  }, [castId, open, initialSchedule])

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
        }
      } catch (error) {
        console.error('Failed to load shift templates:', error)
        if (!ignore) {
          setTemplates(mergeCastShiftTemplates(null))
        }
      }
    }
    void loadTemplates()
    return () => {
      ignore = true
    }
  }, [open, castId, currentStore.id])

  useEffect(() => {
    if (!open || editSpan !== 'fourWeeks') return
    let ignore = false

    const loadFourWeekSchedule = async () => {
      const range = getDateRange(weekStart, 28)
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
            if (record) {
              next[dateKey] = {
                date: dateKey,
                status: (record.status as ScheduleWorkStatus | undefined) ?? '出勤予定',
                startTime: formatInTimeZone(new Date(record.startTime), timeZone, 'HH:mm'),
                endTime: formatInTimeZone(new Date(record.endTime), timeZone, 'HH:mm'),
                note: record.notes ?? undefined,
                isAvailable: record.isAvailable !== false,
              }
            } else if (!next[dateKey]) {
              next[dateKey] = { date: dateKey, status: '休日' }
            }
          }
          return next
        })
      } catch (error) {
        console.error('Failed to load four-week schedule:', error)
        toast({
          title: '4週間分の出勤表を取得できませんでした',
          description: '通信状態を確認して、もう一度お試しください。',
          variant: 'destructive',
        })
      }
    }

    void loadFourWeekSchedule()
    return () => {
      ignore = true
    }
  }, [castId, currentStore.id, editSpan, open, weekStart])

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

  const handleSave = () => {
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

    const validatedSchedule: WeeklyScheduleEdit = { ...schedule }
    onSave(castId, validatedSchedule)
    onOpenChange(false)
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
    setTemplates(next)
    try {
      const response = await fetch('/api/cast', {
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
    } catch (error) {
      console.error('Failed to persist shift templates:', error)
      toast({
        title: 'テンプレートを保存できませんでした',
        description: '出勤時間テンプレートの保存に失敗しました。',
        variant: 'destructive',
      })
    }
  }

  const saveCurrentDayAsTemplate = () => {
    if (!templateStartTime || !templateEndTime || !newTemplateName.trim()) {
      toast({
        title: 'テンプレート名と出勤時間を確認してください',
        description: 'テンプレート名と開始・終了時間を入力してください。',
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
        name: newTemplateName.trim(),
        startTime: templateStartTime,
        endTime: templateEndTime,
        isHoliday: false,
      },
      createHolidayTemplate(),
    ]
    setNewTemplateName('')
    setTemplateStartTime('')
    setTemplateEndTime('')
    void persistTemplates(next)
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[90vh] max-w-4xl overflow-y-auto"
        aria-describedby={undefined}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {castName} - スケジュール編集
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {formatInTimeZone(weekStart, timeZone, 'yyyy年M月d日', { locale: ja })} 〜{' '}
            {formatInTimeZone(visibleDays[visibleDays.length - 1], timeZone, 'M月d日', {
              locale: ja,
            })}
          </p>
        </DialogHeader>

        <div className="space-y-2">
          <div className="sticky top-0 z-30 flex justify-end border-b bg-background py-2">
            <Button onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-700">
              <Save className="mr-2 h-4 w-4" />
              保存
            </Button>
          </div>
          <Button
            type="button"
            variant={editSpan === 'fourWeeks' ? 'default' : 'outline'}
            size="sm"
            aria-pressed={editSpan === 'fourWeeks'}
            onClick={() => setEditSpan((span) => (span === 'week' ? 'fourWeeks' : 'week'))}
          >
            4週間をカレンダー入力
          </Button>
          <div className="flex flex-wrap items-end gap-2">
            <div className="min-w-[12rem] flex-1">
              <Label htmlFor="new-shift-template-name">このキャストの出勤テンプレート名</Label>
              <Input
                id="new-shift-template-name"
                value={newTemplateName}
                onChange={(event) => setNewTemplateName(event.target.value)}
                placeholder="例: 昼勤 12:00-22:00"
              />
            </div>
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
            <Button type="button" variant="secondary" size="sm" onClick={saveCurrentDayAsTemplate}>
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
                    {template.name} {template.startTime}-{template.endTime}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-label={`${template.name}を削除`}
                    onClick={() => removeTemplate(template.id)}
                  >
                    ×
                  </Button>
                </div>
              ))}
          </div>
        </div>

        <div
          className={
            editSpan === 'fourWeeks'
              ? 'grid grid-cols-1 gap-3 md:grid-cols-4 xl:grid-cols-7'
              : 'space-y-4'
          }
          role={editSpan === 'fourWeeks' ? 'grid' : undefined}
          aria-label={editSpan === 'fourWeeks' ? '4週間出勤カレンダー' : undefined}
        >
          {visibleDays.map((date) => {
            const dateKey = formatInTimeZone(date, 'UTC', 'yyyy-MM-dd')
            const daySchedule = getDaySchedule(dateKey)
            const isWorkDay = !['未入力', '休日'].includes(daySchedule.status)

            return (
              <Card
                key={dateKey}
                id={`schedule-edit-day-${dateKey}`}
                className="border-l-4 border-l-emerald-500"
              >
                <CardHeader className="pb-3">
                  <CardTitle className="flex flex-col gap-3 text-lg sm:flex-row sm:items-start sm:justify-between">
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
                            : `${template.name} ${template.startTime}-${template.endTime} を適用`}
                        </Button>
                      ))}
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* ステータス選択 */}
                  <div>
                    <Label
                      htmlFor={`schedule-status-${dateKey}`}
                      className="mb-2 block text-sm font-medium"
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
                        className="w-48"
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
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="mb-2 block flex items-center gap-1 text-sm font-medium">
                          <Clock className="h-4 w-4" />
                          開始時間
                        </Label>
                        <Select
                          value={daySchedule.startTime || ''}
                          onValueChange={(value) =>
                            handleScheduleChange(dateKey, 'startTime', value)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="開始時間を選択" />
                          </SelectTrigger>
                          <SelectContent>
                            {(daySchedule.startTime && !timeOptions.includes(daySchedule.startTime)
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
                        <Label className="mb-2 block flex items-center gap-1 text-sm font-medium">
                          <Clock className="h-4 w-4" />
                          終了時間
                        </Label>
                        <Select
                          value={daySchedule.endTime || ''}
                          onValueChange={(value) => handleScheduleChange(dateKey, 'endTime', value)}
                        >
                          <SelectTrigger>
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
                      <div className="col-span-2">
                        <Label className="mb-2 block text-sm font-medium">予約受付</Label>
                        <Select
                          value={daySchedule.isAvailable === false ? 'unavailable' : 'available'}
                          onValueChange={(value) =>
                            handleScheduleChange(dateKey, 'isAvailable', value === 'available')
                          }
                        >
                          <SelectTrigger aria-label="予約受付">
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

                  {/* 備考 */}
                  <div>
                    <Label className="mb-2 block text-sm font-medium">媒体用テキスト・備考</Label>
                    <Textarea
                      value={daySchedule.note || ''}
                      onChange={(e) => handleScheduleChange(dateKey, 'note', e.target.value)}
                      placeholder="特記事項があれば入力してください..."
                      className="min-h-[60px]"
                    />
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        <div className="sticky bottom-0 z-30 flex justify-end gap-4 border-t bg-background py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="mr-2 h-4 w-4" />
            キャンセル
          </Button>
          <Button onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-700">
            <Save className="mr-2 h-4 w-4" />
            保存
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
