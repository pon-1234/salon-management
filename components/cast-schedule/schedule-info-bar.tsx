/**
 * @design_doc   Notion task #283 compact schedule overview
 * @related_to   WeeklySchedulePage and CastScheduleUseCases weekly statistics
 * @known_issues None
 */
import { Calendar, Clock, TrendingUp, Users } from 'lucide-react'

interface ScheduleInfoBarProps {
  totalCast: number
  workingCast: number
  averageWorkingHours: number
  averageWorkingCast: number
}

export function ScheduleInfoBar({
  totalCast,
  workingCast,
  averageWorkingHours,
  averageWorkingCast,
}: ScheduleInfoBarProps) {
  const summaries = [
    { label: '在籍', value: `${totalCast}名`, icon: Users },
    { label: '今週出勤', value: `${workingCast}名`, icon: Calendar },
    { label: '出勤率', value: `${averageWorkingHours}%`, icon: TrendingUp },
    { label: '平均出勤', value: `${averageWorkingCast}名/日`, icon: Clock },
  ]

  return (
    <div className="border-b bg-gradient-to-r from-emerald-50 to-blue-50">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
        <h1 className="mr-auto flex items-center gap-2 text-base font-semibold text-gray-900">
          <Calendar className="h-4 w-4 text-emerald-600" />
          キャスト出勤管理
        </h1>
        {summaries.map(({ label, value, icon: Icon }) => (
          <div key={label} className="flex items-center gap-2 whitespace-nowrap text-sm">
            <Icon className="h-4 w-4 text-emerald-600" />
            <span className="text-muted-foreground">{label}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </div>
    </div>
  )
}
