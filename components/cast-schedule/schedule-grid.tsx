import React from "react"
import { Button } from "@/components/ui/button"
import { CastScheduleEntry, CastScheduleStatus } from "@/lib/cast-schedule/types"
import { getWeekDates, formatScheduleDate, formatDisplayDate, formatDayOfWeek } from "@/lib/cast-schedule/utils"
import { Phone, MessageSquare } from 'lucide-react'

interface ScheduleGridProps {
  startDate: Date
  entries: CastScheduleEntry[]
}

export function ScheduleGrid({ startDate, entries }: ScheduleGridProps) {
  const dates = getWeekDates(startDate)

const renderScheduleCell = (status: StaffScheduleStatus | undefined) => {
  if (!status) {
    return <div className="text-gray-400">未設定</div>;
  }

  if (status.type === "休日") {
    return <div className="text-red-500 font-medium">休日</div>;
  }
  if (status.type === "出勤予定") {
    return (
      <div className="space-y-1">
        <div className="text-blue-600 font-medium">出勤予定</div>
        {status.startTime && status.endTime && (
          <div className="text-sm">{status.startTime} ~ {status.endTime}</div>
        )}
        {status.note && (
          <div className="text-sm text-emerald-600">{status.note}</div>
        )}
      </div>
    );
  }
  return <div className="text-gray-400">未入力</div>;
};

  return (
    <div className="border rounded-lg overflow-hidden bg-white shadow-sm">
      <div className="grid grid-cols-[200px_repeat(7,1fr)]">
        {/* Header */}
        <div className="bg-gray-50 p-3 font-medium border-b border-r">スタッフ名</div>
        {dates.map((date) => (
          <div
            key={date.toISOString()}
            className="bg-gray-50 p-3 text-center border-b last:border-r-0 border-r"
          >
            <div className="font-medium">{formatDisplayDate(date)}</div>
            <div className="text-sm text-gray-500">{formatDayOfWeek(date)}</div>
          </div>
        ))}

        {/* Staff Rows */}
        {entries.map((entry) => (
          <React.Fragment key={entry.staffId}>
            <div className="p-3 border-b last:border-b-0 border-r">
              <div className="flex gap-2 items-start">
                <img
                  src={entry.image}
                  alt={entry.name}
                  className="w-16 h-16 object-cover rounded"
                />
                <div>
                  <div className="font-medium">
                    {entry.name}(<span className="text-gray-500">{entry.age}</span>)
                  </div>
                  <div className="flex gap-1 mt-1">
                    <Button size="sm" variant="destructive" className="h-6 px-2">
                      <Phone className="w-3 h-3 mr-1" />
                      電話
                    </Button>
                    <Button size="sm" variant="secondary" className="h-6 px-2">
                      <MessageSquare className="w-3 h-3 mr-1" />
                      業務連絡
                    </Button>
                  </div>
                </div>
              </div>
            </div>
            {dates.map((date) => {
              const scheduleDate = formatScheduleDate(date);
              const status = entry.schedule[scheduleDate];
              return (
                <div
                  key={`${entry.staffId}-${scheduleDate}`}
                  className="p-3 border-b last:border-b-0 border-r last:border-r-0"
                >
                  {renderScheduleCell(status)}
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  )
}
