import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, Clock, TrendingUp, Calendar } from 'lucide-react'

interface ScheduleInfoBarProps {
  totalCast: number;
  workingCast: number;
  averageWorkingHours: number;
  averageWorkingCast: number;
}

export function ScheduleInfoBar({ 
  totalCast, 
  workingCast, 
  averageWorkingHours, 
  averageWorkingCast 
}: ScheduleInfoBarProps) {
  const onLeave = 14; // 休職中の人数

  return (
    <div className="bg-gradient-to-r from-emerald-50 to-blue-50 border-b">
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Calendar className="h-6 w-6 text-emerald-600" />
            <h1 className="text-xl font-semibold text-gray-900">キャスト出勤管理</h1>
            <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">
              金の玉クラブ池袋店
            </Badge>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-white/70 backdrop-blur-sm border-emerald-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 rounded-lg">
                  <Users className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">在籍キャスト</p>
                  <p className="text-lg font-semibold text-gray-900">{totalCast}名</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/70 backdrop-blur-sm border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">出勤率</p>
                  <p className="text-lg font-semibold text-gray-900">{averageWorkingHours}%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/70 backdrop-blur-sm border-green-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Clock className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-600">平均出勤者</p>
                  <p className="text-lg font-semibold text-gray-900">{averageWorkingCast}名/日</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/70 backdrop-blur-sm border-red-200">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-100 rounded-lg">
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