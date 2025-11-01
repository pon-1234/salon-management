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

export interface StaffAbsenceSummary {
  id: string
  name: string
  absenceDays: number
  weekendAbsenceDays: number
  longestAbsenceStreak: number
  attendanceRate: number
}

interface StaffAbsenceTableProps {
  data: StaffAbsenceSummary[]
}

export function StaffAbsenceTable({ data }: StaffAbsenceTableProps) {
  if (data.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
        欠勤情報はありません。
      </div>
    )
  }

  const totalAbsence = data.reduce((sum, staff) => sum + staff.absenceDays, 0)
  const totalWeekendAbsence = data.reduce((sum, staff) => sum + staff.weekendAbsenceDays, 0)
  const topAbsentee =
    data
      .slice()
      .sort((a, b) => b.absenceDays - a.absenceDays)
      .find((staff) => staff.absenceDays > 0) ?? null

  const getStatusBadge = (absenceDays: number, rate: number) => {
    if (absenceDays === 0) return <Badge className="bg-green-500">安定</Badge>
    if (rate <= 30) return <Badge className="bg-yellow-500">注意</Badge>
    return <Badge variant="destructive">要調整</Badge>
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-lg border p-4 text-center">
          <h4 className="mb-1 text-sm font-medium text-muted-foreground">累計欠勤日数</h4>
          <div className="text-2xl font-bold text-red-600">{totalAbsence}日</div>
        </div>
        <div className="rounded-lg border p-4 text-center">
          <h4 className="mb-1 text-sm font-medium text-muted-foreground">週末欠勤日数</h4>
          <div className="text-2xl font-bold text-blue-600">{totalWeekendAbsence}日</div>
        </div>
        <div className="rounded-lg border p-4 text-center">
          <h4 className="mb-1 text-sm font-medium text-muted-foreground">要対応スタッフ</h4>
          <div className="text-2xl font-bold">
            {topAbsentee ? `${topAbsentee.name}（${topAbsentee.absenceDays}日）` : 'なし'}
          </div>
        </div>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>スタッフ名</TableHead>
              <TableHead className="text-center">欠勤日数</TableHead>
              <TableHead className="text-center">週末欠勤</TableHead>
              <TableHead className="text-center">最長連続欠勤</TableHead>
              <TableHead className="text-center">出勤率</TableHead>
              <TableHead className="text-center">ステータス</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((staff) => (
              <TableRow key={staff.id}>
                <TableCell className="font-medium">{staff.name}</TableCell>
                <TableCell className="text-center">{staff.absenceDays}日</TableCell>
                <TableCell className="text-center">{staff.weekendAbsenceDays}日</TableCell>
                <TableCell className="text-center">{staff.longestAbsenceStreak}日</TableCell>
                <TableCell className="text-center">{(100 - staff.attendanceRate).toFixed(1)}%</TableCell>
                <TableCell className="text-center">
                  {getStatusBadge(staff.absenceDays, 100 - staff.attendanceRate)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
