import React from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { CastScheduleEntry, CastScheduleStatus } from "@/lib/cast-schedule/types"
import { getWeekDates, formatScheduleDate, formatDisplayDate, formatDayOfWeek } from "@/lib/cast-schedule/utils"
import { Phone, MessageSquare, Clock, Calendar, Edit3 } from 'lucide-react'

interface ScheduleGridProps {
  startDate: Date
  entries: CastScheduleEntry[]
}

export function ScheduleGrid({ startDate, entries }: ScheduleGridProps) {
  const dates = getWeekDates(startDate)

  const renderScheduleCell = (status: CastScheduleStatus | undefined, date: Date) => {
    const isToday = new Date().toDateString() === date.toDateString()
    const isWeekend = date.getDay() === 0 || date.getDay() === 6

    if (!status) {
      return (
        <div className={`group relative p-3 h-20 border rounded-lg cursor-pointer transition-all duration-200 hover:shadow-md ${
          isToday ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
        }`}>
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="text-gray-400 text-sm">未設定</div>
              <Edit3 className="h-3 w-3 text-gray-300 mx-auto mt-1 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
        </div>
      )
    }

    if (status.type === "休日") {
      return (
        <div className={`group relative p-3 h-20 border rounded-lg cursor-pointer transition-all duration-200 hover:shadow-md ${
          isToday ? 'bg-red-50 border-red-300' : 'bg-red-50 border-red-200 hover:border-red-300'
        }`}>
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Badge className="bg-red-500 hover:bg-red-600 text-white text-xs">
                休日
              </Badge>
              <Edit3 className="h-3 w-3 text-red-300 mx-auto mt-1 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </div>
        </div>
      )
    }

    if (status.type === "出勤予定") {
      return (
        <div className={`group relative p-3 h-20 border rounded-lg cursor-pointer transition-all duration-200 hover:shadow-md ${
          isToday ? 'bg-emerald-50 border-emerald-300' : 'bg-emerald-50 border-emerald-200 hover:border-emerald-300'
        }`}>
          <div className="space-y-1">
            <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs">
              出勤予定
            </Badge>
            {status.startTime && status.endTime && (
              <div className="flex items-center gap-1 text-xs text-emerald-700">
                <Clock className="h-3 w-3" />
                {status.startTime}～{status.endTime}
              </div>
            )}
            {status.note && (
              <div className="text-xs text-emerald-600 truncate" title={status.note}>
                {status.note}
              </div>
            )}
            <Edit3 className="absolute top-2 right-2 h-3 w-3 text-emerald-300 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>
      )
    }

    return (
      <div className={`group relative p-3 h-20 border rounded-lg cursor-pointer transition-all duration-200 hover:shadow-md ${
        isToday ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
      }`}>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="text-gray-400 text-sm">未入力</div>
            <Edit3 className="h-3 w-3 text-gray-300 mx-auto mt-1 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto p-4">
        {/* Week Header */}
        <Card className="mb-6 bg-white shadow-sm">
          <CardContent className="p-4">
            <div className="grid grid-cols-8 gap-4">
              <div className="flex items-center justify-center">
                <span className="text-sm font-medium text-gray-600">キャスト</span>
              </div>
              {dates.map((date) => {
                const isToday = new Date().toDateString() === date.toDateString()
                const isWeekend = date.getDay() === 0 || date.getDay() === 6
                
                return (
                  <div
                    key={date.toISOString()}
                    className={`text-center p-3 rounded-lg ${
                      isToday 
                        ? 'bg-emerald-100 text-emerald-800' 
                        : isWeekend 
                        ? 'bg-red-50 text-red-700' 
                        : 'bg-gray-50 text-gray-700'
                    }`}
                  >
                    <div className="font-semibold text-lg">{formatDisplayDate(date)}</div>
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
            <Card key={entry.castId} className="bg-white shadow-sm hover:shadow-md transition-shadow duration-200">
              <CardContent className="p-4">
                <div className="grid grid-cols-8 gap-4 items-center">
                  {/* Cast Info */}
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={entry.image} alt={entry.name} />
                      <AvatarFallback className="bg-gradient-to-br from-emerald-400 to-emerald-600 text-white font-medium">
                        {entry.name[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium text-gray-900">
                        {entry.name}
                        <span className="text-gray-500 text-sm ml-1">({entry.age})</span>
                      </div>
                      <div className="flex gap-1 mt-1">
                        {entry.hasPhone && (
                          <Button size="sm" variant="outline" className="h-6 px-2 text-xs">
                            <Phone className="w-3 h-3 mr-1" />
                            電話
                          </Button>
                        )}
                        {entry.hasBusinessContact && (
                          <Button size="sm" variant="outline" className="h-6 px-2 text-xs">
                            <MessageSquare className="w-3 h-3 mr-1" />
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
                        {renderScheduleCell(status, date)}
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
