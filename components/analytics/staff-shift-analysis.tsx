"use client"

import { useEffect, useState } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"

interface StaffShiftAnalysisProps {
  year: number
  month: number
}

interface StaffShiftData {
  id: string
  name: string
  totalDays: number
  weekdayDays: number
  weekendDays: number
  morningShifts: number
  eveningShifts: number
  averageHours: number
  performanceScore: number
}

export function StaffShiftAnalysis({ year, month }: StaffShiftAnalysisProps) {
  const [data, setData] = useState<StaffShiftData[]>([])

  useEffect(() => {
    // ダミーデータ（実際にはAPIから取得）
    const dummyData: StaffShiftData[] = [
      {
        id: "1",
        name: "みお",
        totalDays: 22,
        weekdayDays: 16,
        weekendDays: 6,
        morningShifts: 8,
        eveningShifts: 14,
        averageHours: 7.5,
        performanceScore: 92
      },
      {
        id: "2",
        name: "みるく",
        totalDays: 18,
        weekdayDays: 14,
        weekendDays: 4,
        morningShifts: 10,
        eveningShifts: 8,
        averageHours: 6.8,
        performanceScore: 88
      },
      {
        id: "3",
        name: "しほ",
        totalDays: 15,
        weekdayDays: 12,
        weekendDays: 3,
        morningShifts: 6,
        eveningShifts: 9,
        averageHours: 7.2,
        performanceScore: 85
      },
      {
        id: "4",
        name: "みなみ",
        totalDays: 20,
        weekdayDays: 15,
        weekendDays: 5,
        morningShifts: 12,
        eveningShifts: 8,
        averageHours: 8.0,
        performanceScore: 94
      },
      {
        id: "5",
        name: "ななみ",
        totalDays: 12,
        weekdayDays: 10,
        weekendDays: 2,
        morningShifts: 5,
        eveningShifts: 7,
        averageHours: 6.5,
        performanceScore: 78
      }
    ]
    setData(dummyData)
  }, [year, month])

  const getPerformanceBadge = (score: number) => {
    if (score >= 90) return <Badge className="bg-green-500">優秀</Badge>
    if (score >= 80) return <Badge className="bg-yellow-500">良好</Badge>
    if (score >= 70) return <Badge variant="secondary">普通</Badge>
    return <Badge variant="destructive">要改善</Badge>
  }

  const getShiftBalance = (morning: number, evening: number) => {
    const total = morning + evening
    const morningRatio = (morning / total) * 100
    const eveningRatio = (evening / total) * 100
    
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs">朝</span>
        <div className="w-24 bg-gray-200 rounded-full h-2 relative">
          <div 
            className="bg-yellow-500 h-2 rounded-l-full" 
            style={{ width: `${morningRatio}%` }}
          />
          <div 
            className="bg-purple-500 h-2 rounded-r-full absolute right-0 top-0" 
            style={{ width: `${eveningRatio}%` }}
          />
        </div>
        <span className="text-xs">夜</span>
      </div>
    )
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
              <TableHead className="text-center">シフトバランス</TableHead>
              <TableHead className="text-center">平均勤務時間</TableHead>
              <TableHead className="text-center">パフォーマンス</TableHead>
              <TableHead className="text-center">評価</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((staff) => (
              <TableRow key={staff.id}>
                <TableCell className="font-medium">{staff.name}</TableCell>
                <TableCell className="text-center">{staff.totalDays}日</TableCell>
                <TableCell className="text-center">
                  <div className="flex flex-col items-center">
                    <span className="text-sm">{staff.weekdayDays}/{staff.weekendDays}</span>
                    <span className="text-xs text-gray-500">平日/週末</span>
                  </div>
                </TableCell>
                <TableCell>
                  {getShiftBalance(staff.morningShifts, staff.eveningShifts)}
                </TableCell>
                <TableCell className="text-center">{staff.averageHours}時間</TableCell>
                <TableCell className="text-center">
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-sm font-medium">{staff.performanceScore}%</span>
                    <Progress value={staff.performanceScore} className="w-16 h-2" />
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  {getPerformanceBadge(staff.performanceScore)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-lg border p-4">
          <h4 className="font-medium mb-2">シフト充足率</h4>
          <div className="text-2xl font-bold text-green-600">94.5%</div>
          <p className="text-xs text-gray-600 mt-1">必要人数に対する実際の出勤率</p>
        </div>
        <div className="rounded-lg border p-4">
          <h4 className="font-medium mb-2">平均労働時間</h4>
          <div className="text-2xl font-bold">7.2時間/日</div>
          <p className="text-xs text-gray-600 mt-1">全スタッフの平均勤務時間</p>
        </div>
        <div className="rounded-lg border p-4">
          <h4 className="font-medium mb-2">週末カバー率</h4>
          <div className="text-2xl font-bold text-blue-600">82.3%</div>
          <p className="text-xs text-gray-600 mt-1">週末の必要人数充足率</p>
        </div>
      </div>
    </div>
  )
}