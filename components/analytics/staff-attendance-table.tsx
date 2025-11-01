'use client'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { StaffAttendanceSummary } from '@/lib/types/staff-attendance'
import { getDaysInMonth } from 'date-fns'

interface StaffAttendanceTableProps {
  year: number
  month: number
  data: StaffAttendanceSummary[]
}

export function StaffAttendanceTable({ year, month, data }: StaffAttendanceTableProps) {
  const daysInMonth = getDaysInMonth(new Date(year, month - 1, 1))
  const days = Array.from({ length: daysInMonth }, (_, index) => index + 1)
  const dayOfWeekLabels = ['日', '月', '火', '水', '木', '金', '土']

  const calculateLongestAbsence = (attendance: number[]) => {
    let longest = 0
    let current = 0
    attendance.forEach((value) => {
      if (value === 0) {
        current += 1
        if (current > longest) longest = current
      } else {
        current = 0
      }
    })
    return longest
  }

  if (data.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
        出勤データがありません。
      </div>
    )
  }

  const columnTotals = Array.from({ length: daysInMonth }, (_, dayIndex) =>
    data.reduce((sum, staff) => sum + (staff.attendance[dayIndex] ?? 0), 0)
  )
  const grandTotal = columnTotals.reduce((sum, value) => sum + value, 0)

  const totalStaff = data.length
  const totalPossibleShifts = totalStaff * daysInMonth
  const overallAttendanceRate =
    totalPossibleShifts > 0
      ? Math.round((grandTotal / totalPossibleShifts) * 1000) / 10
      : 0
  const averagePerDay = Math.round((grandTotal / daysInMonth) * 10) / 10
  const averagePerStaff = totalStaff > 0 ? Math.round((grandTotal / totalStaff) * 10) / 10 : 0
  const totalAbsences = totalPossibleShifts - grandTotal

  const busiestDays = columnTotals
    .map((total, index) => {
      const date = new Date(year, month - 1, index + 1)
      const weekday = date.getDay()
      return {
        day: index + 1,
        total,
        weekday,
      }
    })
    .sort((a, b) => b.total - a.total)
    .slice(0, 3)

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase text-muted-foreground">出勤率</p>
            <div className="text-2xl font-semibold">
              {overallAttendanceRate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              {totalStaff}人 × {daysInMonth}日 = {totalPossibleShifts.toLocaleString()}枠
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase text-muted-foreground">平均出勤人数</p>
            <div className="text-2xl font-semibold">{averagePerDay.toLocaleString()}人/日</div>
            <p className="text-xs text-muted-foreground">1人あたり {averagePerStaff.toFixed(1)}日</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase text-muted-foreground">延べ出勤</p>
            <div className="text-2xl font-semibold">{grandTotal.toLocaleString()}日</div>
            <p className="text-xs text-muted-foreground">
              欠勤 {totalAbsences.toLocaleString()}日
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs uppercase text-muted-foreground">ピーク日</p>
            {busiestDays.map((item) => (
              <div key={item.day} className="flex items-center justify-between text-xs">
                <span>
                  {month}/{String(item.day).padStart(2, '0')}({dayOfWeekLabels[item.weekday]})
                </span>
                <span className="font-medium text-foreground">{item.total}人</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {data.map((staff) => {
          const attendanceArray = Array.from({ length: daysInMonth }, (_, index) =>
            staff.attendance[index] ?? 0
          )

          const attendanceRate =
            daysInMonth > 0 ? Math.round((staff.total / daysInMonth) * 1000) / 10 : 0

          const absenceDays = Math.max(daysInMonth - staff.total, 0)
          const longestAbsence = calculateLongestAbsence(attendanceArray)

          const weeks = Array.from({ length: Math.ceil(daysInMonth / 7) }, (_, weekIndex) => {
            const start = weekIndex * 7 + 1
            return Array.from({ length: 7 }, (_, dayIndex) => {
              const dayNumber = start + dayIndex
              if (dayNumber > daysInMonth) {
                return null
              }
              const date = new Date(year, month - 1, dayNumber)
              const weekday = date.getDay()
              const attended = attendanceArray[dayNumber - 1] === 1
              return {
                day: dayNumber,
                weekday,
                attended,
                title: `${month}/${String(dayNumber).padStart(2, '0')}(${dayOfWeekLabels[weekday]})`
                  + `${attended ? '：出勤' : '：休み'}`,
              }
            })
          })

          const rateBadgeVariant: 'default' | 'secondary' | 'destructive' |
            'success' = attendanceRate >= 80 ? 'success' : attendanceRate >= 60 ? 'secondary' : 'destructive'

          return (
            <Card key={staff.id} className="shadow-sm">
              <CardHeader className="space-y-3">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 text-lg font-semibold">
                      <span>{staff.name}</span>
                      <Badge variant="outline" className="text-xs text-muted-foreground">
                        ID: {staff.id}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      出勤 {staff.total}日 / 欠勤 {absenceDays}日 ・ 週末出勤 {staff.weekendAttendance}日
                    </p>
                  </div>
                  <Badge variant={rateBadgeVariant} className="text-xs uppercase tracking-wide">
                    出勤率 {attendanceRate.toFixed(1)}%
                  </Badge>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground">
                  <div className="rounded-md border border-border/60 bg-muted/20 p-2">
                    <p className="text-[11px] uppercase text-muted-foreground">総出勤</p>
                    <p className="text-sm font-semibold text-foreground">{staff.total}日</p>
                  </div>
                  <div className="rounded-md border border-border/60 bg-muted/20 p-2">
                    <p className="text-[11px] uppercase text-muted-foreground">週末</p>
                    <p className="text-sm font-semibold text-foreground">
                      {staff.weekendAttendance}日
                    </p>
                  </div>
                  <div className="rounded-md border border-border/60 bg-muted/20 p-2">
                    <p className="text-[11px] uppercase text-muted-foreground">連続欠勤</p>
                    <p className="text-sm font-semibold text-foreground">
                      {longestAbsence}日
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-7 gap-1 text-[10px] uppercase text-muted-foreground">
                  {dayOfWeekLabels.map((label) => (
                    <span key={label} className="text-center">
                      {label}
                    </span>
                  ))}
                </div>
                <div className="space-y-1.5">
                  {weeks.map((week, weekIndex) => (
                    <div key={weekIndex} className="grid grid-cols-7 gap-1">
                      {week.map((dayInfo, dayIndex) => {
                        if (!dayInfo) {
                          return <div key={dayIndex} className="h-8 rounded-md bg-transparent" />
                        }
                        const isWeekend = dayInfo.weekday === 0 || dayInfo.weekday === 6
                        return (
                          <div
                            key={dayInfo.day}
                            title={dayInfo.title}
                            className={cn(
                              'flex h-8 items-center justify-center rounded-md border text-[11px] font-medium transition',
                              dayInfo.attended
                                ? 'border-emerald-500 bg-emerald-500 text-white'
                                : 'border-border bg-muted/40 text-muted-foreground',
                              !dayInfo.attended && isWeekend && 'bg-amber-100 text-amber-700',
                              dayInfo.attended && isWeekend && 'bg-emerald-600'
                            )}
                          >
                            {dayInfo.day}
                          </div>
                        )
                      })}
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <span className="h-3 w-3 rounded bg-emerald-500" /> 出勤
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="h-3 w-3 rounded border border-border bg-muted/40" /> 休み
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <span className="h-3 w-3 rounded bg-amber-100" /> 週末休み
                  </span>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card className="border-dashed">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">日別トータル</CardTitle>
          <p className="text-xs text-muted-foreground">
            日ごとの出勤人数を俯瞰できます。ピーク日はシフト充足を確認してください。
          </p>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {columnTotals.map((total, index) => {
            const date = new Date(year, month - 1, index + 1)
            const weekday = dayOfWeekLabels[date.getDay()]
            return (
              <div key={index} className="rounded-md border border-border/60 bg-muted/20 p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-foreground">
                    {month}/{String(index + 1).padStart(2, '0')} ({weekday})
                  </span>
                  <span className="text-blue-600">{total}</span>
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>
    </div>
  )
}
