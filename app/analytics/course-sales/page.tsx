"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Printer } from 'lucide-react'
import { MonthSelector } from "@/components/analytics/month-selector"
import { CourseReportTable } from "@/components/analytics/course-report-table"
import { AnalyticsUseCases } from "@/lib/analytics/usecases"
import { AnalyticsRepositoryImpl } from "@/lib/analytics/repository"

const analyticsRepository = new AnalyticsRepositoryImpl()
const analyticsUseCases = new AnalyticsUseCases(analyticsRepository)

export default function CourseSalesPage() {
  const [selectedYear, setSelectedYear] = useState(2024)
  const [selectedMonth, setSelectedMonth] = useState(12)

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="space-y-4 w-full">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold">売上げ月集計（コース別）</h1>
          <MonthSelector
            year={selectedYear}
            month={selectedMonth}
            onYearChange={setSelectedYear}
            onMonthChange={setSelectedMonth}
          />
        </div>
        <Button onClick={handlePrint} className="print:hidden bg-emerald-600 hover:bg-emerald-700 text-white">
          <Printer className="mr-2 h-4 w-4" />
          印刷する
        </Button>
      </div>
      <div className="overflow-x-auto">
        <CourseReportTable 
          year={selectedYear} 
          month={selectedMonth} 
          analyticsUseCases={analyticsUseCases}
        />
      </div>
    </div>
  )
}
