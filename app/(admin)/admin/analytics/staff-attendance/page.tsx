'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Printer, Users, Calendar, TrendingUp, AlertCircle } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { StaffAttendanceTable } from '@/components/analytics/staff-attendance-table'
import { StaffAttendanceChart } from '@/components/analytics/staff-attendance-chart'
import { StaffShiftAnalysis } from '@/components/analytics/staff-shift-analysis'
import { StaffAbsenceTable } from '@/components/analytics/staff-absence-table'

export default function StaffAttendancePage() {
  const [selectedYear, setSelectedYear] = useState(2024)
  const [selectedMonth, setSelectedMonth] = useState(12)
  const [selectedStatus, setSelectedStatus] = useState('全て表示')
  const [selectedStaff, setSelectedStaff] = useState('')

  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i)
  const months = Array.from({ length: 12 }, (_, i) => i + 1)
  const statuses = ['全て表示', '出勤のみ', '休みのみ', '当日欠勤']
  const staffList = ['全スタッフ', 'きょうか', 'れいな', 'はるひ', 'みお', 'しほ']

  const handlePrint = () => {
    window.print()
  }

  // ダミーデータ（実際にはAPIから取得）
  const kpiData = {
    totalStaff: 15,
    activeStaff: 12,
    averageAttendance: 8.5,
    previousAverageAttendance: 7.8,
    attendanceRate: 92.5,
    previousAttendanceRate: 89.2,
    totalAbsences: 23,
    unexpectedAbsences: 5,
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold">就業データ管理</h1>
          <div className="flex gap-2">
            <Select
              value={selectedYear.toString()}
              onValueChange={(value) => setSelectedYear(parseInt(value))}
            >
              <SelectTrigger className="w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}年
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={selectedMonth.toString()}
              onValueChange={(value) => setSelectedMonth(parseInt(value))}
            >
              <SelectTrigger className="w-[80px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {months.map((month) => (
                  <SelectItem key={month} value={month.toString()}>
                    {month}月
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statuses.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedStaff} onValueChange={setSelectedStaff}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="担当者" />
              </SelectTrigger>
              <SelectContent>
                {staffList.map((staff) => (
                  <SelectItem key={staff} value={staff}>
                    {staff}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button
          onClick={handlePrint}
          className="bg-emerald-600 text-white hover:bg-emerald-700 print:hidden"
        >
          <Printer className="mr-2 h-4 w-4" />
          印刷する
        </Button>
      </div>

      {/* KPIカード */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">稼働スタッフ数</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {kpiData.activeStaff} / {kpiData.totalStaff}人
            </div>
            <p className="text-xs text-muted-foreground">
              稼働率: {((kpiData.activeStaff / kpiData.totalStaff) * 100).toFixed(0)}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">平均出勤人数</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpiData.averageAttendance}人/日</div>
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3 text-green-600" />
              <span className="text-green-600">
                +{(kpiData.averageAttendance - kpiData.previousAverageAttendance).toFixed(1)}人
              </span>
              前月比
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">出勤率</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpiData.attendanceRate}%</div>
            <p className="text-xs text-muted-foreground">
              前月比 +{(kpiData.attendanceRate - kpiData.previousAttendanceRate).toFixed(1)}pt
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">欠勤状況</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpiData.totalAbsences}件</div>
            <p className="text-xs text-muted-foreground">
              当日欠勤: <span className="text-red-600">{kpiData.unexpectedAbsences}件</span>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 出勤推移グラフ */}
      <Card>
        <CardHeader>
          <CardTitle>月間出勤推移</CardTitle>
        </CardHeader>
        <CardContent>
          <StaffAttendanceChart year={selectedYear} month={selectedMonth} />
        </CardContent>
      </Card>

      {/* 詳細データテーブル */}
      <Card>
        <CardHeader>
          <CardTitle>詳細データ</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="attendance" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="attendance">出勤表</TabsTrigger>
              <TabsTrigger value="shift">シフト分析</TabsTrigger>
              <TabsTrigger value="absence">欠勤管理</TabsTrigger>
            </TabsList>
            <TabsContent value="attendance" className="mt-4">
              <StaffAttendanceTable year={selectedYear} month={selectedMonth} />
            </TabsContent>
            <TabsContent value="shift" className="mt-4">
              <StaffShiftAnalysis year={selectedYear} month={selectedMonth} />
            </TabsContent>
            <TabsContent value="absence" className="mt-4">
              <StaffAbsenceTable year={selectedYear} month={selectedMonth} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
