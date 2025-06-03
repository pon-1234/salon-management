import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Cast, CastSchedule } from "@/lib/cast"
import { castMembers, generateCastSchedule } from "@/lib/cast/data"
import { generateSchedule } from "@/lib/cast/utils"
import { options } from "@/lib/course-option/data"
import { StaffProfile } from "@/components/cast/cast-profile"
import { notFound } from "next/navigation"
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'

function getCast(id: string): Cast | undefined {
  return castMembers.find(cast => cast.id === id);
}

function getCastSchedule(id: string, startDate: Date, endDate: Date): CastSchedule[] {
  const cast = getCast(id);
  if (!cast) return [];
  return generateCastSchedule(id, startDate, endDate);
}

export default async function CastDetailPage({ params }: { params: { id: string } }) {
  const cast = getCast(params.id);

  if (!cast) {
    notFound()
  }

  const today = new Date()
  const endDate = new Date(today)
  endDate.setDate(today.getDate() + 7)
  const schedule = getCastSchedule(params.id, today, endDate)

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="grid md:grid-cols-2 gap-8">
        {/* 基本情報・プロフィール */}
        <div className="space-y-6">
          <StaffProfile staff={cast} />
          
          <div className="space-y-4">
            <h4 className="font-bold flex items-center gap-2">
              利用可能なオプション
              <Badge variant="secondary" className="bg-emerald-100">{options.length}点</Badge>
            </h4>
            <div className="grid grid-cols-2 gap-2">
              {options.map((option, index) => (
                <div
                  key={index}
                  className="border rounded-lg p-3 text-sm relative"
                >
                  <div className="font-medium">{option.name}</div>
                  <div className="text-emerald-600">
                    ¥{option.price.toLocaleString()}
                  </div>
                  {option.note && (
                    <div className="absolute top-2 right-2 text-gray-500">
                      {option.note}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 出勤情報 */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold">出勤情報</h2>
          <div className="space-y-2">
            {schedule.map((day, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 border rounded-lg"
              >
                <div className="space-y-1">
                  <div className="font-medium">
                    {format(day.date, 'yyyy/MM/dd (E)', { locale: ja })}
                  </div>
                  <div className="text-gray-600">
                    {format(day.startTime, 'HH:mm', { locale: ja })} - 
                    {format(day.endTime, 'HH:mm', { locale: ja })}
                    {day.bookings && (
                      <Badge className="ml-2 bg-emerald-100 text-emerald-700">
                        予約 {day.bookings}件
                      </Badge>
                    )}
                  </div>
                </div>
                <Button
                  variant="default"
                  className="bg-emerald-600"
                >
                  この日時を選択
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
