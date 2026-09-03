/**
 * @design_doc   Weekly cast schedule presentation modes
 * @related_to   ScheduleActionButtons controls the table/list mode and ScheduleEditDialog edits rows
 * @known_issues None
 */
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { CastScheduleEntry, CastScheduleStatus } from '@/lib/cast-schedule/old-types'
import { cn } from '@/lib/utils'
import {
  getWeekDates,
  formatScheduleDate,
  formatDisplayDate,
  formatDayOfWeek,
} from '@/lib/cast-schedule/utils'
import { formatInTimeZone } from 'date-fns-tz'
import { Phone, MessageSquare, Clock, Edit3 } from 'lucide-react'
import { ScheduleEditDialog, WeeklyScheduleEdit } from './schedule-edit-dialog'
import type { ScheduleViewMode } from './schedule-action-buttons'

interface ScheduleGridProps {
  startDate: Date
  entries: CastScheduleEntry[]
  onSaveSchedule?: (castId: string, schedule: WeeklyScheduleEdit) => void
  viewMode?: ScheduleViewMode
  className?: string
}

export function ScheduleGrid({
  startDate,
  entries,
  onSaveSchedule,
  viewMode = 'grid',
  className,
}: ScheduleGridProps) {
  const dates = getWeekDates(startDate)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [selectedCast, setSelectedCast] = useState<CastScheduleEntry | null>(null)
  const [focusDate, setFocusDate] = useState<string | null>(null)
  const timeZone = 'Asia/Tokyo'

  const handleCellClick = (entry: CastScheduleEntry, date?: Date) => {
    setSelectedCast(entry)
    setFocusDate(date ? formatScheduleDate(date) : null)
    setEditDialogOpen(true)
  }

  const scrollDateColumnIntoView = (date: Date) => {
    const dateKey = formatScheduleDate(date)
    document
      .querySelector(`[role="cell"][data-schedule-column="${dateKey}"]`)
      ?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' })
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
    if (!status) {
      return (
        <div
          className={`group relative h-20 cursor-pointer rounded-lg border p-3 transition-all duration-200 hover:shadow-md ${
            isToday ? 'border-blue-200 bg-blue-50' : 'border-gray-200 bg-gray-50 hover:bg-gray-100'
          }`}
          onClick={() => handleCellClick(entry, date)}
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
          onClick={() => handleCellClick(entry, date)}
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

    if (status.type !== '未入力') {
      const isAttentionStatus = status.type === '遅刻' || status.type === '早退'
      return (
        <div
          className={`group relative h-20 cursor-pointer rounded-lg border p-3 transition-all duration-200 hover:shadow-md ${
            isToday
              ? 'border-emerald-300 bg-emerald-50'
              : isAttentionStatus
                ? 'border-amber-200 bg-amber-50 hover:border-amber-300'
                : 'border-emerald-200 bg-emerald-50 hover:border-emerald-300'
          }`}
          onClick={() => handleCellClick(entry, date)}
        >
          <div className="space-y-1">
            <Badge
              className={
                isAttentionStatus
                  ? 'bg-amber-500 text-xs text-white hover:bg-amber-600'
                  : 'bg-emerald-500 text-xs text-white hover:bg-emerald-600'
              }
            >
              {status.type}
            </Badge>
            <Badge variant={status.isAvailable === false ? 'destructive' : 'outline'}>
              {status.isAvailable === false ? '予約受付停止' : '予約受付可能'}
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
        onClick={() => handleCellClick(entry, date)}
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

  const renderListStatus = (status: CastScheduleStatus | undefined) => {
    const statusType = status?.type ?? '未入力'
    const statusStyle = !['未入力', '休日'].includes(statusType)
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
      : statusType === '休日'
        ? 'border-red-200 bg-red-50 text-red-700'
        : 'border-gray-200 bg-gray-50 text-gray-500'

    return (
      <div className={`rounded-md border px-2 py-2 text-center ${statusStyle}`}>
        <div className="text-xs font-medium">{statusType}</div>
        {!['未入力', '休日'].includes(statusType) && status?.startTime && status.endTime && (
          <div className="mt-1 text-xs">
            {status.startTime}～{status.endTime}
          </div>
        )}
      </div>
    )
  }

  const editDialog = selectedCast ? (
    <ScheduleEditDialog
      open={editDialogOpen}
      onOpenChange={setEditDialogOpen}
      castName={selectedCast.name}
      castId={selectedCast.castId}
      initialSchedule={selectedCast.schedule}
      startDate={startDate}
      focusDate={focusDate}
      onSave={handleSaveSchedule}
    />
  ) : null

  if (entries.length === 0) {
    return (
      <div className={cn('flex min-h-0 flex-col bg-gray-50 p-4', className)}>
        <Card className="mx-auto w-full max-w-7xl bg-white shadow-sm">
          <CardContent className="py-12 text-center text-sm text-gray-500">
            条件に一致するキャストはいません
          </CardContent>
        </Card>
      </div>
    )
  }

  if (viewMode === 'list') {
    return (
      <div className={cn('flex min-h-0 flex-col bg-gray-50', className)}>
        <div
          data-testid="schedule-scrollport"
          className="mx-auto h-full min-h-0 w-full max-w-7xl flex-1 overflow-auto p-4"
        >
          <div role="list" aria-label="週間出勤一覧" className="space-y-3">
            {entries.map((entry) => (
              <Card key={entry.castId} role="listitem" className="bg-white shadow-sm">
                <CardContent className="p-0">
                  <button
                    type="button"
                    aria-label={`${entry.name}の週間予定を編集`}
                    onClick={() => handleCellClick(entry)}
                    className="w-full rounded-lg p-4 text-left transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
                  >
                    <div className="mb-3 flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={entry.image} alt="" />
                        <AvatarFallback className="bg-gradient-to-br from-emerald-400 to-emerald-600 font-medium text-white">
                          {entry.name[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium text-gray-900">
                          {entry.name}
                          <span className="ml-1 text-sm text-gray-500">({entry.age})</span>
                        </div>
                        <div className="text-xs text-gray-500">{entry.nameKana}</div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
                      {dates.map((date) => {
                        const scheduleDate = formatScheduleDate(date)
                        return (
                          <div key={`${entry.castId}-list-${scheduleDate}`}>
                            <div className="mb-1 text-center text-xs text-gray-500">
                              {formatDisplayDate(date)} {formatDayOfWeek(date)}
                            </div>
                            {renderListStatus(entry.schedule[scheduleDate])}
                          </div>
                        )
                      })}
                    </div>
                  </button>
                </CardContent>
              </Card>
            ))}
          </div>
          {editDialog}
        </div>
      </div>
    )
  }

  return (
    <div className={cn('flex min-h-0 flex-col bg-gray-50', className)}>
      <div
        data-testid="schedule-scrollport"
        className="h-full min-h-0 max-w-full flex-1 overflow-auto"
        role="table"
        aria-label="週間出勤表"
      >
        <div
          data-testid="schedule-date-header"
          className="sticky top-0 z-20 bg-gray-50 px-4 pb-2 pt-4"
          role="rowgroup"
        >
          <Card className="bg-white shadow-sm">
            <CardContent className="p-4">
              <div
                className="grid min-w-[1240px] grid-cols-[320px_repeat(7,minmax(110px,1fr))] gap-4"
                role="row"
              >
                <div
                  className="sticky left-0 z-10 flex min-w-[320px] items-center justify-center bg-white"
                  role="columnheader"
                >
                  <span className="text-sm font-medium text-gray-600">キャスト</span>
                </div>
                {dates.map((date) => {
                  const dateKey = formatScheduleDate(date)
                  const isToday = formatScheduleDate(new Date()) === dateKey
                  const weekday = Number(formatInTimeZone(date, timeZone, 'i'))
                  const isWeekend = weekday === 6 || weekday === 7
                  const dateLabel = `${formatDisplayDate(date)}${formatDayOfWeek(date)}`
                  const workingCount = entries.filter((entry) => {
                    const type = entry.schedule[dateKey]?.type
                    return type && !['未入力', '休日'].includes(type)
                  }).length

                  return (
                    <div
                      key={date.toISOString()}
                      role="columnheader"
                      className={`rounded-lg p-1 text-center ${
                        isToday
                          ? 'bg-emerald-100 text-emerald-800'
                          : isWeekend
                            ? 'bg-red-50 text-red-700'
                            : 'bg-gray-50 text-gray-700'
                      }`}
                    >
                      <button
                        type="button"
                        className="w-full rounded-md p-2 hover:bg-white/70"
                        aria-label={`${dateLabel}の列へ移動`}
                        onClick={() => scrollDateColumnIntoView(date)}
                      >
                        <div className="text-lg font-semibold">{formatDisplayDate(date)}</div>
                        <div className="text-sm">{formatDayOfWeek(date)}</div>
                        <div className="text-xs">出勤 {workingCount}名</div>
                      </button>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4 px-4 pb-4" role="rowgroup">
          {entries.map((entry) => (
            <Card
              key={entry.castId}
              role="row"
              className="bg-white shadow-sm transition-shadow duration-200 hover:shadow-md"
            >
              <CardContent className="p-4">
                <div className="grid min-w-[1240px] grid-cols-[320px_repeat(7,minmax(110px,1fr))] items-center gap-4">
                  {/* Cast Info */}
                  <div
                    className="sticky left-0 z-10 flex min-w-[320px] items-center gap-3 bg-white"
                    role="rowheader"
                  >
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
                      <div
                        key={`${entry.castId}-${scheduleDate}`}
                        role="cell"
                        data-schedule-column={scheduleDate}
                      >
                        {renderScheduleCell(status, date, entry)}
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        {editDialog}
      </div>
    </div>
  )
}
