'use client'

import { useState, useEffect } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'

interface StaffAttendanceData {
  id: string
  name: string
  attendance: (1 | 0)[]
  total: number
}

interface StaffAttendanceTableProps {
  year: number
  month: number
}

export function StaffAttendanceTable({ year, month }: StaffAttendanceTableProps) {
  // Mock data - in a real app, this would come from an API
  const mockData: StaffAttendanceData[] = [
    {
      id: '1',
      name: 'みお',
      attendance: [
        0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 0, 1, 1, 0, 0, 1, 1, 1, 0, 0, 1, 1, 0, 1,
      ],
      total: 15,
    },
    {
      id: '2',
      name: 'みるく',
      attendance: [
        0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 1, 0,
      ],
      total: 6,
    },
    {
      id: '3',
      name: 'しほ',
      attendance: [
        0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      ],
      total: 4,
    },
    {
      id: '4',
      name: 'みなみ',
      attendance: [
        0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      ],
      total: 3,
    },
    {
      id: '5',
      name: 'ななみ',
      attendance: [
        0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      ],
      total: 1,
    },
    {
      id: '6',
      name: 'しのん',
      attendance: [
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      ],
      total: 1,
    },
    {
      id: '7',
      name: 'れいな',
      attendance: [
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      ],
      total: 1,
    },
    {
      id: '8',
      name: 'このみ',
      attendance: [
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      ],
      total: 1,
    },
    {
      id: '9',
      name: 'ののか',
      attendance: [
        0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      ],
      total: 1,
    },
    {
      id: '10',
      name: 'きょうか',
      attendance: [
        0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      ],
      total: 1,
    },
    {
      id: '11',
      name: 'かすみ',
      attendance: [
        0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
      ],
      total: 1,
    },
  ]

  const days = Array.from({ length: 30 }, (_, i) => i + 1)
  const daysOfWeek = ['日', '月', '火', '水', '木', '金', '土']

  return (
    <div className="max-w-[90vw] overflow-x-auto rounded-lg border bg-white">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="bg-gray-100"></TableHead>
            {days.map((day, index) => (
              <TableHead
                key={day}
                className={cn(
                  'min-w-[60px] bg-gray-100 text-center',
                  index % 7 === 0 && 'bg-yellow-100', // Sunday
                  index % 7 === 6 && 'bg-blue-100' // Saturday
                )}
              >
                {day}
                <br />
                {daysOfWeek[index % 7]}
              </TableHead>
            ))}
            <TableHead className="bg-gray-100 text-center">TOTAL</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {mockData.map((staff) => (
            <TableRow key={staff.id}>
              <TableCell className="font-medium">{staff.name}</TableCell>
              {staff.attendance.map((value, index) => (
                <TableCell
                  key={index}
                  className={cn(
                    'text-center',
                    index % 7 === 0 && 'bg-yellow-50', // Sunday
                    index % 7 === 6 && 'bg-blue-50' // Saturday
                  )}
                >
                  {value === 1 ? '1' : ''}
                </TableCell>
              ))}
              <TableCell className="text-center font-medium">{staff.total}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
