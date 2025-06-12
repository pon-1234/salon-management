"use client"

import { useState, useEffect } from "react"
import { DailySalesData } from "@/lib/types/daily-sales"
import { DailySalesUseCases } from "@/lib/daily-sales/usecases"
import { DailySalesRepositoryImpl } from "@/lib/daily-sales/repository-impl"
import { DailySalesTable } from "@/components/daily-sales/daily-sales-table"
import { DateSelector } from "@/components/daily-sales/date-selector"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { RefreshCw } from 'lucide-react'

const dailySalesRepository = new DailySalesRepositoryImpl()
const dailySalesUseCases = new DailySalesUseCases(dailySalesRepository)

export default function DailySalesPage() {
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [salesData, setSalesData] = useState<DailySalesData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const fetchDailySales = async (date: Date) => {
    setIsLoading(true)
    try {
      const data = await dailySalesUseCases.getDailySales(date)
      setSalesData(data)
    } catch (error) {
      console.error('Failed to fetch daily sales:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchDailySales(selectedDate)
  }, [selectedDate])

  const handleDateChange = (date: Date) => {
    setSelectedDate(date)
  }

  const handleRefresh = () => {
    fetchDailySales(selectedDate)
  }

  return (
    <div className="space-y-4 w-full">
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold">売上げ日報</h1>
          <Button onClick={handleRefresh} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            更新する
          </Button>
        </div>
        <DateSelector
          selectedDate={selectedDate}
          onDateChange={handleDateChange}
        />
      </div>

      <div className="space-y-2 mb-4 text-sm text-red-500">
        <p>※「女性売上」は原価費を減算しています。</p>
        <p>※厚生費は女性手取りの10%となります。日報作成時に自動計算されます。</p>
        <p>※個引きは店の個引きのみの表示です。女性個引きは女性売上から差し引いています。</p>
      </div>

      {isLoading ? (
        <div className="text-center py-8">読み込み中...</div>
      ) : salesData ? (
        <DailySalesTable data={salesData} />
      ) : (
        <Alert>
          <AlertDescription>
            データの取得に失敗しました。
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}
