import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { CastScheduleEntry, CastScheduleStatus } from '@/lib/cast-schedule/old-types'
import {
  getWeekDates,
  formatScheduleDate,
  formatDisplayDate,
  formatDayOfWeek,
} from '@/lib/cast-schedule/utils'
import { formatInTimeZone } from 'date-fns-tz'
import { Phone, MessageSquare, Clock, Calendar, Edit3 } from 'lucide-react'
import { ScheduleEditDialog, WeeklyScheduleEdit } from './schedule-edit-dialog'

interface ScheduleGridProps {
  startDate: Date
  entries: CastScheduleEntry[]
  onSaveSchedule?: (castId: string, schedule: WeeklyScheduleEdit) => void
}

export function ScheduleGrid({ startDate, entries, onSaveSchedule }: ScheduleGridProps) {
  const dates = getWeekDates(startDate)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [selectedCast, setSelectedCast] = useState<CastScheduleEntry | null>(null)
  const timeZone = 'Asia/Tokyo'

  const handleCellClick = (entry: CastScheduleEntry) => {
    setSelectedCast(entry)
    setEditDialogOpen(true)
  }

  const handleSaveSchedule = async (castId: string, schedule: WeeklyScheduleEdit) => {
    if (onSaveSchedule) {
      await onSaveSchedule(castId, schedule)
    }
    setEditDialogOpen(false)
    setSelectedCast(null)
  }

  const renderScheduleCell = (
    status: CastScheduleStatus | undefined,
    date: Date,
    entry: CastScheduleEntry
  ) => {
    const isToday = formatScheduleDate(new Date()) === formatScheduleDate(date)
    const weekday = Number(formatInTimeZone(date, timeZone, 'i'))
    const isWeekend = weekday === 6 || weekday === 7

    if (!status) {
      return (
        <div
          className={`group relative h-20 cursor-pointer rounded-lg border p-3 transition-all duration-200 hover:shadow-md ${
            isToday ? 'border-blue-200 bg-blue-50' : 'border-gray-200 bg-gray-50 hover:bg-gray-100'
          }`}
          onClick={() => handleCellClick(entry)}
        >
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <div className="text-sm text-gray-400">未設定</div>
              <Edit3 className="mx-auto mt-1 h-3 w-3 text-gray-300 opacity-0 transition-opacity group-hover:opacity-100" />
            </div>
          </div>
        </div>
      )
    }

    if (status.type === '休日') {
      return (
        <div
          className={`group relative h-20 cursor-pointer rounded-lg border p-3 transition-all duration-200 hover:shadow-md ${
            isToday ? 'border-red-300 bg-red-50' : 'border-red-200 bg-red-50 hover:border-red-300'
          }`}
          onClick={() => handleCellClick(entry)}
        >
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              <Badge className="bg-red-500 text-xs text-white hover:bg-red-600">休日</Badge>
              <Edit3 className="mx-auto mt-1 h-3 w-3 text-red-300 opacity-0 transition-opacity group-hover:opacity-100" />
            </div>
          </div>
        </div>
      )
    }

    if (status.type === '出勤予定') {
      return (
        <div
          className={`group relative h-20 cursor-pointer rounded-lg border p-3 transition-all duration-200 hover:shadow-md ${
            isToday
              ? 'border-emerald-300 bg-emerald-50'
              : 'border-emerald-200 bg-emerald-50 hover:border-emerald-300'
          }`}
          onClick={() => handleCellClick(entry)}
        >
          <div className="space-y-1">
            <Badge className="bg-emerald-500 text-xs text-white hover:bg-emerald-600">
              出勤予定
            </Badge>
            {status.startTime && status.endTime && (
              <div className="flex items-center gap-1 text-xs text-emerald-700">
                <Clock className="h-3 w-3" />
                {status.startTime}～{status.endTime}
              </div>
            )}
            {status.note && (
              <div className="truncate text-xs text-emerald-600" title={status.note}>
                {status.note}
              </div>
            )}
            <Edit3 className="absolute right-2 top-2 h-3 w-3 text-emerald-300 opacity-0 transition-opacity group-hover:opacity-100" />
          </div>
        </div>
      )
    }

    return (
      <div
        className={`group relative h-20 cursor-pointer rounded-lg border p-3 transition-all duration-200 hover:shadow-md ${
          isToday ? 'border-blue-200 bg-blue-50' : 'border-gray-200 bg-gray-50 hover:bg-gray-100'
        }`}
        onClick={() => handleCellClick(entry)}
      >
        <div className="flex h-full items-center justify-center">
          <div className="text-center">
            <div className="text-sm text-gray-400">未入力</div>
            <Edit3 className="mx-auto mt-1 h-3 w-3 text-gray-300 opacity-0 transition-opacity group-hover:opacity-100" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-full overflow-x-auto p-4">
        {/* Week Header */}
        <Card className="mb-6 bg-white shadow-sm">
          <CardContent className="p-4">
            <div className="grid min-w-[1000px] grid-cols-8 gap-4">
              <div className="flex min-w-[180px] items-center justify-center">
                <span className="text-sm font-medium text-gray-600">キャスト</span>
              </div>
              {dates.map((date) => {
                const isToday = formatScheduleDate(new Date()) === formatScheduleDate(date)
                const weekday = Number(formatInTimeZone(date, timeZone, 'i'))
                const isWeekend = weekday === 6 || weekday === 7

                return (
                  <div
                    key={date.toISOString()}
                    className={`rounded-lg p-3 text-center ${
                      isToday
                        ? 'bg-emerald-100 text-emerald-800'
                        : isWeekend
                          ? 'bg-red-50 text-red-700'
                          : 'bg-gray-50 text-gray-700'
                    }`}
                  >
                    <div className="text-lg font-semibold">{formatDisplayDate(date)}</div>
                    <div className="text-sm">{formatDayOfWeek(date)}</div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Cast Schedule Cards */}
        <div className="space-y-4">
          {entries.map((entry) => (
            <Card
              key={entry.castId}
              className="bg-white shadow-sm transition-shadow duration-200 hover:shadow-md"
            >
              <CardContent className="p-4">
                <div className="grid min-w-[1000px] grid-cols-8 items-center gap-4">
                  {/* Cast Info */}
                  <div className="flex min-w-[180px] items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={entry.image} alt={entry.name} />
                      <AvatarFallback className="bg-gradient-to-br from-emerald-400 to-emerald-600 font-medium text-white">
                        {entry.name[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium text-gray-900">
                        {entry.name}
                        <span className="ml-1 text-sm text-gray-500">({entry.age})</span>
                      </div>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {entry.hasPhone && (
                          <Button size="sm" variant="outline" className="h-6 shrink-0 px-2 text-xs">
                            <Phone className="mr-1 h-3 w-3" />
                            電話
                          </Button>
                        )}
                        {entry.hasBusinessContact && (
                          <Button size="sm" variant="outline" className="h-6 shrink-0 px-2 text-xs">
                            <MessageSquare className="mr-1 h-3 w-3" />
                            連絡
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Schedule Cells */}
                  {dates.map((date) => {
                    const scheduleDate = formatScheduleDate(date)
                    const status = entry.schedule[scheduleDate]
                    return (
                      <div key={`${entry.castId}-${scheduleDate}`}>
                        {renderScheduleCell(status, date, entry)}
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Schedule Edit Dialog */}
        {selectedCast && (
          <ScheduleEditDialog
            open={editDialogOpen}
            onOpenChange={setEditDialogOpen}
            castName={selectedCast.name}
            castId={selectedCast.castId}
            initialSchedule={selectedCast.schedule}
            startDate={startDate}
            onSave={handleSaveSchedule}
          />
        )}
      </div>
    </div>
  )
}
