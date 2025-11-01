'use client'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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

  return (
    <div className="max-w-[90vw] overflow-x-auto rounded-lg border bg-white">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="bg-gray-100">スタッフ</TableHead>
            {days.map((day, index) => {
              const date = new Date(year, month - 1, day)
              const weekday = date.getDay()
              return (
                <TableHead
                  key={day}
                  className={cn(
                    'min-w-[60px] bg-gray-100 text-center',
                    weekday === 0 && 'bg-yellow-100',
                    weekday === 6 && 'bg-blue-100'
                  )}
                >
                  {day}
                  <br />
                  {dayOfWeekLabels[weekday]}
                </TableHead>
              )
            })}
            <TableHead className="bg-gray-100 text-center">TOTAL</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((staff) => {
            const attendance = Array.from({ length: daysInMonth }, (_, index) =>
              staff.attendance[index] ?? 0
            )
            return (
              <TableRow key={staff.id}>
                <TableCell className="font-medium">{staff.name}</TableCell>
                {attendance.map((value, index) => {
                  const date = new Date(year, month - 1, index + 1)
                  const weekday = date.getDay()
                  return (
                    <TableCell
                      key={index}
                      className={cn(
                        'text-center text-sm',
                        weekday === 0 && 'bg-yellow-50',
                        weekday === 6 && 'bg-blue-50'
                      )}
                    >
                      {value === 1 ? '1' : ''}
                    </TableCell>
                  )
                })}
                <TableCell className="text-center font-medium">{staff.total}</TableCell>
              </TableRow>
            )
          })}
          <TableRow className="bg-gray-50 font-medium">
            <TableCell>日別合計</TableCell>
            {columnTotals.map((total, index) => (
              <TableCell key={index} className="text-center text-blue-600">
                {total}
              </TableCell>
            ))}
            <TableCell className="text-center text-blue-600">{grandTotal}</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  )
}
