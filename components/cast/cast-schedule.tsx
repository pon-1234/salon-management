import { Button } from '@/components/ui/button'
import { CastSchedule as Schedule } from '@/lib/cast/types'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'

interface StaffScheduleProps {
  schedule: Schedule[]
}

export function StaffSchedule({ schedule }: StaffScheduleProps) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">出勤情報</h2>
      <div className="space-y-2">
        {schedule.map((day, index) => (
          <div key={index} className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-1">
              <div className="font-medium">
                {format(day.date, 'yyyy/MM/dd (E)', { locale: ja })}
              </div>
              <div className="text-gray-600">
                {format(day.startTime, 'HH:mm', { locale: ja })} -
                {format(day.endTime, 'HH:mm', { locale: ja })}
              </div>
            </div>
            <Button variant="default" className="bg-emerald-600">
              この日時を選択
            </Button>
          </div>
        ))}
      </div>
    </div>
  )
}
