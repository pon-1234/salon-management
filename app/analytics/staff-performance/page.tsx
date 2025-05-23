"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Printer } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { StaffPerformanceTable } from "@/components/analytics/staff-performance-table"
import { AnalyticsUseCases } from "@/lib/analytics/usecases"
import { AnalyticsRepositoryImpl } from "@/lib/analytics/repository"

const analyticsRepository = new AnalyticsRepositoryImpl()
const analyticsUseCases = new AnalyticsUseCases(analyticsRepository)

export default function StaffPerformancePage() {
  const [selectedYear, setSelectedYear] = useState(2024)
  const [selectedMonth, setSelectedMonth] = useState(12)
  const [displayType, setDisplayType] = useState("全て表示")
  const [selectedStaff, setSelectedStaff] = useState("")

  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i)
  const months = Array.from({ length: 12 }, (_, i) => i + 1)
  const displayTypes = ["全て表示", "出勤のみ", "休みのみ"]
  const staffList = ["----------", "きょうか", "れいな", "はるひ"]

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold">スタッフ実績</h1>
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
            <Select
              value={displayType}
              onValueChange={setDisplayType}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {displayTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={selectedStaff}
              onValueChange={setSelectedStaff}
            >
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="担当者：" />
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
        <Button onClick={handlePrint} className="print:hidden bg-emerald-600 hover:bg-emerald-700 text-white">
          <Printer className="mr-2 h-4 w-4" />
          印刷する
        </Button>
      </div>

      <div className="text-sm text-red-500">
        時給保証は未払いも含めて全て表示しています
      </div>

      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        <StaffPerformanceTable analyticsUseCases={analyticsUseCases} />
      </div>
    </div>
  )
}
