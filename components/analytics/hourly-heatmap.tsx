'use client'

import { HourlySalesReport } from '@/lib/types/hourly-sales'
import { cn } from '@/lib/utils'

interface HourlyHeatmapProps {
  data: HourlySalesReport
}

export function HourlyHeatmap({ data }: HourlyHeatmapProps) {
  const hours = Array.from({ length: 21 }, (_, i) => i + 7)

  if (!data.data.length) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
        データがありません。
      </div>
    )
  }

  // 最大値を取得（色の濃さを計算するため）
  const flattened = data.data.flatMap((d) => d.hours).filter((value) => value > 0)
  const maxValue = flattened.length > 0 ? Math.max(...flattened) : 0

  // 値に基づいて背景色の濃さを計算
  const getCellColor = (value: number) => {
    if (value === 0 || maxValue === 0) return ''
    const intensity = (value / maxValue) * 100
    if (intensity >= 80) return 'bg-red-600 text-white'
    if (intensity >= 60) return 'bg-orange-500 text-white'
    if (intensity >= 40) return 'bg-yellow-500'
    if (intensity >= 20) return 'bg-yellow-300'
    return 'bg-yellow-100'
  }

  // 曜日ごとの平均を計算
  const dayOfWeekAverages = {
    月: [] as number[],
    火: [] as number[],
    水: [] as number[],
    木: [] as number[],
    金: [] as number[],
    土: [] as number[],
    日: [] as number[],
  }

  data.data.forEach((day) => {
    if (dayOfWeekAverages[day.dayOfWeek as keyof typeof dayOfWeekAverages]) {
      day.hours.forEach((hour, index) => {
        if (!dayOfWeekAverages[day.dayOfWeek as keyof typeof dayOfWeekAverages][index]) {
          dayOfWeekAverages[day.dayOfWeek as keyof typeof dayOfWeekAverages][index] = 0
        }
        dayOfWeekAverages[day.dayOfWeek as keyof typeof dayOfWeekAverages][index] += hour
      })
    }
  })

  // 平均を計算
  Object.keys(dayOfWeekAverages).forEach((day) => {
    const days = data.data.filter((d) => d.dayOfWeek === day).length
    if (days > 0) {
      dayOfWeekAverages[day as keyof typeof dayOfWeekAverages] = dayOfWeekAverages[
        day as keyof typeof dayOfWeekAverages
      ].map((total) => Math.round(total / days))
    }
  })

  return (
    <div>
      <p className="mb-4 text-sm text-gray-600">
        来客数の多さを色の濃さで表現しています。赤色が濃いほど混雑していることを示します。
      </p>

      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="p-2 text-left font-medium">曜日</th>
              {hours.map((hour) => (
                <th
                  key={hour}
                  className="min-w-[50px] whitespace-nowrap p-2 text-center font-medium"
                >
                  {hour}時
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Object.entries(dayOfWeekAverages).map(([day, averages]) => (
              <tr key={day} className="border-b">
                <td className="p-2 font-medium">{day}曜日</td>
                {averages.map((avg, index) => (
                  <td key={index} className={cn('p-2 text-center text-xs', getCellColor(avg))}>
                    {avg || '-'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center gap-4 text-sm">
        <span className="text-gray-600">凡例:</span>
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 bg-yellow-100"></div>
          <span>少ない</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 bg-yellow-300"></div>
          <span>やや少ない</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 bg-yellow-500"></div>
          <span>普通</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 bg-orange-500"></div>
          <span>やや多い</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 bg-red-600"></div>
          <span>多い</span>
        </div>
      </div>
    </div>
  )
}
