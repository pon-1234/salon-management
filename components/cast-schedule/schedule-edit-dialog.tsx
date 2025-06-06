"use client"

import { useState } from "react"
import { format, addDays, startOfWeek } from "date-fns"
import { ja } from "date-fns/locale"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Calendar, Save, X, Clock, User } from "lucide-react"
import { CastScheduleStatus } from "@/lib/cast-schedule/types"

export interface DaySchedule {
  date: string // yyyy-mm-dd format
  status: "休日" | "出勤予定" | "未入力"
  startTime?: string // HH:mm format
  endTime?: string // HH:mm format
  note?: string
}

export interface WeeklyScheduleEdit {
  [date: string]: DaySchedule
}

interface ScheduleEditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  castName: string
  castId: string
  initialSchedule: { [date: string]: CastScheduleStatus }
  startDate: Date
  onSave: (castId: string, schedule: WeeklyScheduleEdit) => void
}

export function ScheduleEditDialog({ 
  open,
  onOpenChange,
  castName,
  castId,
  initialSchedule,
  startDate,
  onSave 
}: ScheduleEditDialogProps) {
  const [schedule, setSchedule] = useState<WeeklyScheduleEdit>(() => {
    const converted: WeeklyScheduleEdit = {}
    Object.entries(initialSchedule).forEach(([date, status]) => {
      converted[date] = {
        date,
        status: status.type,
        startTime: status.startTime,
        endTime: status.endTime,
        note: status.note
      }
    })
    return converted
  })
  
  // Generate 7 days starting from the given start date
  const weekStart = startOfWeek(startDate, { weekStartsOn: 1 }) // Monday start
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  const statusOptions: { value: "休日" | "出勤予定" | "未入力"; label: string; color: string }[] = [
    { value: "未入力", label: "未入力", color: "bg-gray-100 text-gray-600" },
    { value: "出勤予定", label: "出勤予定", color: "bg-green-100 text-green-700" },
    { value: "休日", label: "休日", color: "bg-red-100 text-red-700" },
  ]

  const timeOptions = Array.from({ length: 48 }, (_, i) => {
    const hour = Math.floor(i / 2)
    const minute = i % 2 === 0 ? "00" : "30"
    return `${hour.toString().padStart(2, '0')}:${minute}`
  })

  const handleScheduleChange = (dateKey: string, field: keyof DaySchedule, value: any) => {
    setSchedule(prev => ({
      ...prev,
      [dateKey]: {
        ...prev[dateKey],
        date: dateKey,
        [field]: value,
        // Reset times when status changes to 休日
        ...(field === 'status' && value === '休日' && {
          startTime: undefined,
          endTime: undefined,
        })
      }
    }))
  }

  const handleSave = () => {
    // Validate schedule before saving
    const validatedSchedule: WeeklyScheduleEdit = {}
    
    for (const [dateKey, daySchedule] of Object.entries(schedule)) {
      if (daySchedule.status === "出勤予定") {
        if (!daySchedule.startTime || !daySchedule.endTime) {
          alert(`${format(new Date(dateKey), 'M月d日(E)', { locale: ja })} の時間を入力してください`)
          return
        }
        
        if (daySchedule.startTime >= daySchedule.endTime) {
          alert(`${format(new Date(dateKey), 'M月d日(E)', { locale: ja })} の終了時間は開始時間より後にしてください`)
          return
        }
      }
      
      validatedSchedule[dateKey] = daySchedule
    }
    
    onSave(castId, validatedSchedule)
    onOpenChange(false)
  }

  const getDaySchedule = (dateKey: string): DaySchedule => {
    return schedule[dateKey] || {
      date: dateKey,
      status: "未入力",
    }
  }

  const getStatusColor = (status: "休日" | "出勤予定" | "未入力") => {
    return statusOptions.find(opt => opt.value === status)?.color || "bg-gray-100 text-gray-600"
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            {castName} - 週間スケジュール編集
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {format(weekStart, 'yyyy年M月d日', { locale: ja })} 〜 {format(addDays(weekStart, 6), 'M月d日', { locale: ja })}
          </p>
        </DialogHeader>
        
        <div className="space-y-4">
          {weekDays.map((date) => {
            const dateKey = format(date, 'yyyy-MM-dd')
            const daySchedule = getDaySchedule(dateKey)
            const isWorkDay = daySchedule.status === "出勤予定"
            
            return (
              <Card key={dateKey} className="border-l-4 border-l-emerald-500">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Calendar className="w-5 h-5" />
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
                    <Label className="text-sm font-medium mb-2 block">勤務状況</Label>
                    <Select 
                      value={daySchedule.status} 
                      onValueChange={(value: "休日" | "出勤予定" | "未入力") => handleScheduleChange(dateKey, "status", value)}
                    >
                      <SelectTrigger className="w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {statusOptions.map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            <div className="flex items-center gap-2">
                              <div className={`w-3 h-3 rounded-full ${option.color.split(' ')[0]}`} />
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
                        <Label className="text-sm font-medium mb-2 block flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          開始時間
                        </Label>
                        <Select 
                          value={daySchedule.startTime || ""} 
                          onValueChange={(value) => handleScheduleChange(dateKey, "startTime", value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="開始時間を選択" />
                          </SelectTrigger>
                          <SelectContent>
                            {timeOptions.map(time => (
                              <SelectItem key={time} value={time}>{time}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-sm font-medium mb-2 block flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          終了時間
                        </Label>
                        <Select 
                          value={daySchedule.endTime || ""} 
                          onValueChange={(value) => handleScheduleChange(dateKey, "endTime", value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="終了時間を選択" />
                          </SelectTrigger>
                          <SelectContent>
                            {timeOptions.map(time => (
                              <SelectItem key={time} value={time}>{time}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}

                  {/* 備考 */}
                  <div>
                    <Label className="text-sm font-medium mb-2 block">備考</Label>
                    <Textarea
                      value={daySchedule.note || ""}
                      onChange={(e) => handleScheduleChange(dateKey, "note", e.target.value)}
                      placeholder="特記事項があれば入力してください..."
                      className="min-h-[60px]"
                    />
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        <div className="flex justify-end gap-4 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="w-4 h-4 mr-2" />
            キャンセル
          </Button>
          <Button onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-700">
            <Save className="w-4 h-4 mr-2" />
            保存
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}