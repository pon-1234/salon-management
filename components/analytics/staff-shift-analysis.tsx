'use client'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'

export interface StaffShiftStat {
  id: string
  name: string
  totalDays: number
  weekdayDays: number
  weekendDays: number
  totalHours: number
  averageHours: number
  attendanceRate: number
}

interface StaffShiftAnalysisProps {
  data: StaffShiftStat[]
  daysInMonth: number
  weekendDaysInMonth: number
}

export function StaffShiftAnalysis({ data, daysInMonth, weekendDaysInMonth }: StaffShiftAnalysisProps) {
  if (data.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
        出勤データがありません。
      </div>
    )
  }

  const averageAttendanceRate =
    data.reduce((sum, staff) => sum + staff.attendanceRate, 0) / data.length
  const averageHours =
    data.reduce((sum, staff) => sum + staff.averageHours, 0) / Math.max(data.length, 1)
  const totalWeekendPotential = Math.max(weekendDaysInMonth * data.length, 1)
  const weekendCoverage =
    (data.reduce((sum, staff) => sum + staff.weekendDays, 0) / totalWeekendPotential) * 100

  const getPerformanceBadge = (rate: number) => {
    if (rate >= 90) return <Badge className="bg-green-500">高稼働</Badge>
    if (rate >= 70) return <Badge className="bg-yellow-500">安定</Badge>
    if (rate >= 50) return <Badge variant="secondary">要調整</Badge>
    return <Badge variant="destructive">要支援</Badge>
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>スタッフ名</TableHead>
              <TableHead className="text-center">出勤日数</TableHead>
              <TableHead className="text-center">平日/週末</TableHead>
              <TableHead className="text-center">総稼働時間</TableHead>
              <TableHead className="text-center">平均勤務時間</TableHead>
              <TableHead className="text-center">出勤率</TableHead>
              <TableHead className="text-center">評価</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((staff) => (
              <TableRow key={staff.id}>
                <TableCell className="font-medium">{staff.name}</TableCell>
                <TableCell className="text-center">{staff.totalDays}日</TableCell>
                <TableCell className="text-center">
                  <div className="text-sm">
                    {staff.weekdayDays}/{staff.weekendDays}
                  </div>
                  <div className="text-xs text-muted-foreground">平日/週末</div>
                </TableCell>
                <TableCell className="text-center">{staff.totalHours.toFixed(1)}時間</TableCell>
                <TableCell className="text-center">{staff.averageHours.toFixed(1)}時間</TableCell>
                <TableCell className="text-center">
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-sm font-medium">{staff.attendanceRate.toFixed(1)}%</span>
                    <Progress value={Math.min(staff.attendanceRate, 100)} className="h-2 w-20" />
                  </div>
                </TableCell>
                <TableCell className="text-center">{getPerformanceBadge(staff.attendanceRate)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-lg border p-4 text-center">
          <h4 className="mb-2 text-sm font-medium text-muted-foreground">平均出勤率</h4>
          <div className="text-2xl font-bold text-green-600">{averageAttendanceRate.toFixed(1)}%</div>
        </div>
        <div className="rounded-lg border p-4 text-center">
          <h4 className="mb-2 text-sm font-medium text-muted-foreground">平均勤務時間</h4>
          <div className="text-2xl font-bold">{averageHours.toFixed(1)}時間/日</div>
        </div>
        <div className="rounded-lg border p-4 text-center">
          <h4 className="mb-2 text-sm font-medium text-muted-foreground">週末稼働率</h4>
          <div className="text-2xl font-bold text-blue-600">{weekendCoverage.toFixed(1)}%</div>
        </div>
      </div>
    </div>
  )
}
