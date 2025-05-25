import { Alert, AlertDescription } from "@/components/ui/alert"
import { InfoIcon } from 'lucide-react'

interface ScheduleInfoBarProps {
  totalStaff: number;
  workingStaff: number;
  averageWorkingHours: number;
  averageWorkingStaff: number;
}

export function ScheduleInfoBar({ 
  totalStaff, 
  workingStaff, 
  averageWorkingHours, 
  averageWorkingStaff 
}: ScheduleInfoBarProps) {
  return (
    <Alert className="bg-blue-50 border-blue-200 text-blue-800">
      <AlertDescription className="flex items-center justify-between">
        <div className="flex items-center">
          <InfoIcon className="h-4 w-4 mr-2" />
          【金の玉クラブ池袋店】女性出勤管理
        </div>
        <div className="flex items-center gap-4 text-sm">
          <div>
            現在（在籍数：<span className="font-medium">{totalStaff}名</span>）
          </div>
          <div className="text-red-500 font-medium">
            （休職中14名）
          </div>
          <div>
            出勤者平均 <span className="font-medium">{averageWorkingHours}%</span>
          </div>
          <div>
            出勤者平均 <span className="font-medium">{averageWorkingStaff}名</span>
          </div>
        </div>
      </AlertDescription>
    </Alert>
  )
}