'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Printer } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CastPerformanceTable } from '@/components/analytics/cast-performance-table'
import { AnalyticsUseCases } from '@/lib/analytics/usecases'
import { AnalyticsRepositoryImpl } from '@/lib/analytics/repository'

const analyticsRepository = new AnalyticsRepositoryImpl()
const analyticsUseCases = new AnalyticsUseCases(analyticsRepository)

export default function CastPerformancePage() {
  const [selectedYear, setSelectedYear] = useState(2024)
  const [selectedMonth, setSelectedMonth] = useState(12)
  const [displayType, setDisplayType] = useState('全て表示')
  const [selectedCast, setSelectedCast] = useState('')

  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i)
  const months = Array.from({ length: 12 }, (_, i) => i + 1)
  const displayTypes = ['全て表示', '出勤のみ', '休みのみ']
  const castList = ['----------', 'きょうか', 'れいな', 'はるひ']

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold">キャスト実績</h1>
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
            <Select value={displayType} onValueChange={setDisplayType}>
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
            <Select value={selectedCast} onValueChange={setSelectedCast}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="キャスト：" />
              </SelectTrigger>
              <SelectContent>
                {castList.map((cast) => (
                  <SelectItem key={cast} value={cast}>
                    {cast}
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

      <div className="flex items-center justify-between text-sm">
        <div className="text-red-500">※ 厚生費は未払いも含めて全て表示しています</div>
        <div className="text-gray-600">
          最終更新:{' '}
          {new Date().toLocaleDateString('ja-JP', {
            year: 'numeric',
            month: 'numeric',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
        <CastPerformanceTable analyticsUseCases={analyticsUseCases} />
      </div>
    </div>
  )
}
