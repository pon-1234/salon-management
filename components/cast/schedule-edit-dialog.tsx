'use client'

import { useState } from 'react'
import { format, addDays, startOfWeek } from 'date-fns'
import { ja } from 'date-fns/locale'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
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
import { Calendar, Edit, Save, X, Clock, User } from 'lucide-react'

export type WorkStatus = '休日' | '出勤予定' | '未入力' | '出勤中' | '早退' | '遅刻'

export interface DaySchedule {
  date: string // yyyy-mm-dd format
  status: WorkStatus
  startTime?: string // HH:mm format
  endTime?: string // HH:mm format
  note?: string
  isAvailableForBooking?: boolean
}

export interface WeeklySchedule {
  [date: string]: DaySchedule
}

interface ScheduleEditDialogProps {
  castName: string
  initialSchedule?: WeeklySchedule
  startDate?: Date
  onSave: (schedule: WeeklySchedule) => void
}

export function ScheduleEditDialog({
  castName,
  initialSchedule = {},
  startDate = new Date(),
  onSave,
}: ScheduleEditDialogProps) {
  const [open, setOpen] = useState(false)
  const [schedule, setSchedule] = useState<WeeklySchedule>(initialSchedule)

  // Generate 7 days starting from the given start date
  const weekStart = startOfWeek(startDate, { weekStartsOn: 1 }) // Monday start
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  const statusOptions: { value: WorkStatus; label: string; color: string }[] = [
    { value: '未入力', label: '未入力', color: 'bg-gray-100 text-gray-600' },
    { value: '出勤予定', label: '出勤予定', color: 'bg-green-100 text-green-700' },
    { value: '出勤中', label: '出勤中', color: 'bg-blue-100 text-blue-700' },
    { value: '休日', label: '休日', color: 'bg-red-100 text-red-700' },
    { value: '早退', label: '早退', color: 'bg-yellow-100 text-yellow-700' },
    { value: '遅刻', label: '遅刻', color: 'bg-orange-100 text-orange-700' },
  ]

  const timeOptions = Array.from({ length: 48 }, (_, i) => {
    const hour = Math.floor(i / 2)
    const minute = i % 2 === 0 ? '00' : '30'
    return `${hour.toString().padStart(2, '0')}:${minute}`
  })

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
            isAvailableForBooking: false,
          }),
      },
    }))
  }

  const handleSave = () => {
    // Validate schedule before saving
    const validatedSchedule: WeeklySchedule = {}

    for (const [dateKey, daySchedule] of Object.entries(schedule)) {
      if (daySchedule.status === '出勤予定' || daySchedule.status === '出勤中') {
        if (!daySchedule.startTime || !daySchedule.endTime) {
          alert(
            `${format(new Date(dateKey), 'M月d日(E)', { locale: ja })} の時間を入力してください`
          )
          return
        }

        if (daySchedule.startTime >= daySchedule.endTime) {
          alert(
            `${format(new Date(dateKey), 'M月d日(E)', { locale: ja })} の終了時間は開始時間より後にしてください`
          )
          return
        }
      }

      validatedSchedule[dateKey] = daySchedule
    }

    onSave(validatedSchedule)
    setOpen(false)
  }

  const getDaySchedule = (dateKey: string): DaySchedule => {
    return (
      schedule[dateKey] || {
        date: dateKey,
        status: '未入力',
        isAvailableForBooking: false,
      }
    )
  }

  const getStatusColor = (status: WorkStatus) => {
    return statusOptions.find((opt) => opt.value === status)?.color || 'bg-gray-100 text-gray-600'
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Edit className="mr-2 h-4 w-4" />
          スケジュール編集
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            {castName} - 週間スケジュール編集
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {format(weekStart, 'yyyy年M月d日', { locale: ja })} 〜{' '}
            {format(addDays(weekStart, 6), 'M月d日', { locale: ja })}
          </p>
        </DialogHeader>

        <div className="space-y-4">
          {weekDays.map((date) => {
            const dateKey = format(date, 'yyyy-MM-dd')
            const daySchedule = getDaySchedule(dateKey)
            const isWorkDay = daySchedule.status === '出勤予定' || daySchedule.status === '出勤中'

            return (
              <Card key={dateKey} className="border-l-4 border-l-blue-500">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center justify-between text-lg">
                    <div className="flex items-center gap-3">
                      <Calendar className="h-5 w-5" />
                      {format(date, 'M月d日(E)', { locale: ja })}
                      <Badge className={getStatusColor(daySchedule.status)}>
                        {daySchedule.status}
                      </Badge>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* ステータス選択 */}
                  <div>
                    <Label className="mb-2 block text-sm font-medium">勤務状況</Label>
                    <Select
                      value={daySchedule.status}
                      onValueChange={(value: WorkStatus) =>
                        handleScheduleChange(dateKey, 'status', value)
                      }
                    >
                      <SelectTrigger className="w-48">
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
                            {timeOptions.map((time) => (
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
                            {timeOptions.map((time) => (
                              <SelectItem key={time} value={time}>
                                {time}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}

                  {/* 予約受付可否（出勤日のみ） */}
                  {isWorkDay && (
                    <div>
                      <Label className="mb-2 block text-sm font-medium">予約受付</Label>
                      <Select
                        value={daySchedule.isAvailableForBooking ? 'available' : 'unavailable'}
                        onValueChange={(value) =>
                          handleScheduleChange(
                            dateKey,
                            'isAvailableForBooking',
                            value === 'available'
                          )
                        }
                      >
                        <SelectTrigger className="w-48">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="available">受付可能</SelectItem>
                          <SelectItem value="unavailable">受付停止</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* 備考 */}
                  <div>
                    <Label className="mb-2 block text-sm font-medium">備考</Label>
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

        <div className="flex justify-end gap-4 border-t pt-4">
          <Button variant="outline" onClick={() => setOpen(false)}>
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
