import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'

interface ScheduleHeaderProps {
  date: Date
  onDateChange: (date: Date) => void
  totalStaff: number
  workingStaff: number
  averageWorkingHours: number
  averageWorkingStaff: number
}

export function ScheduleHeader({
  date,
  onDateChange,
  totalStaff,
  workingStaff,
  averageWorkingHours,
  averageWorkingStaff,
}: ScheduleHeaderProps) {
  return (
    <div className="mb-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">【金の玉クラブ池袋店】女性出勤管理</span>
          <Select defaultValue="today">
            <SelectTrigger className="w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">今日</SelectItem>
              <SelectItem value="tomorrow">明日</SelectItem>
              <SelectItem value="week">週間</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">担当者：</span>
          <Select defaultValue="all">
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全て表示</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex items-center gap-4 text-sm">
        <div>
          現在（在籍数：<span className="font-medium">{totalStaff}名</span>）
        </div>
        <div className="font-medium text-red-500">（休職中14名）</div>
        <div>
          出勤者平均 <span className="font-medium">{averageWorkingHours}%</span>
        </div>
        <div>
          出勤者平均 <span className="font-medium">{averageWorkingStaff}名</span>
        </div>
      </div>
    </div>
  )
}
