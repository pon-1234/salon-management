import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Users, Clock, TrendingUp, Calendar } from 'lucide-react'

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
  const onLeave = 14 // 休職中の人数

  return (
    <div className="border-b bg-gradient-to-r from-emerald-50 to-blue-50">
      <div className="mx-auto max-w-7xl p-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Calendar className="h-6 w-6 text-emerald-600" />
            <h1 className="text-xl font-semibold text-gray-900">キャスト出勤管理</h1>
            <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">
              金の玉クラブ池袋店
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <Card className="border-emerald-200 bg-white/70 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-emerald-100 p-2">
                  <Users className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">在籍キャスト</p>
                  <p className="text-lg font-semibold text-gray-900">{totalCast}名</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-blue-200 bg-white/70 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-blue-100 p-2">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">出勤率</p>
                  <p className="text-lg font-semibold text-gray-900">{averageWorkingHours}%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-green-200 bg-white/70 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-green-100 p-2">
                  <Clock className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">平均出勤者</p>
                  <p className="text-lg font-semibold text-gray-900">{averageWorkingCast}名/日</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-red-200 bg-white/70 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-red-100 p-2">
                  <Users className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">休職中</p>
                  <p className="text-lg font-semibold text-gray-900">{onLeave}名</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
