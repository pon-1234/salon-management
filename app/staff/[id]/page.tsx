import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Cast, CastSchedule } from "@/lib/staff"
import { castMembers, generateCastSchedule } from "@/lib/staff/data"
import { generateSchedule } from "@/lib/staff/utils"
import { options } from "@/lib/course-option/data"
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
        {/* 基本情報 */}
        <div className="space-y-6">
          <h2 className="text-2xl font-bold">基本情報</h2>
          <div className="relative">
            <img
              src={cast.image}
              alt={`${cast.name}の写真`}
              className="w-full h-[400px] object-cover rounded-lg"
            />
            <Badge className="absolute top-4 left-4 bg-emerald-600">掲載中</Badge>
          </div>
          <div className="space-y-4">
            <h3 className="text-3xl font-bold">{cast.name}</h3>
            <dl className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-gray-600">年齢：</dt>
                <dd>{cast.age}歳</dd>
              </div>
              <div>
                <dt className="text-gray-600">スリーサイズ：</dt>
                <dd>{cast.bust}/{cast.waist}/{cast.hip} ({cast.bust}カップ)</dd>
              </div>
              <div>
                <dt className="text-gray-600">身長：</dt>
                <dd>{cast.height}cm</dd>
              </div>
              <div>
                <dt className="text-gray-600">タイプ：</dt>
                <dd>{cast.type}</dd>
              </div>
            </dl>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center border-b pb-2">
              <div>ネット予約</div>
              <div className="text-emerald-600">{cast.netReservation ? "可" : "不可"}</div>
            </div>
            <div className="flex justify-between items-center border-b pb-2">
              <div>特別指名料</div>
              <div>{cast.specialDesignationFee ? `${cast.specialDesignationFee.toLocaleString()}円` : "-"}</div>
            </div>
            <div className="flex justify-between items-center border-b pb-2">
              <div>本指名</div>
              <div>{cast.regularDesignationFee ? `${cast.regularDesignationFee.toLocaleString()}円` : "-"}</div>
            </div>
          </div>

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
