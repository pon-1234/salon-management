'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Printer, TrendingUp, Megaphone, DollarSign, Target, BarChart3 } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { MarketingChannelChart } from '@/components/analytics/marketing-channel-chart'
import { MarketingChannelTable } from '@/components/analytics/marketing-channel-table'
import { MarketingROITable } from '@/components/analytics/marketing-roi-table'
import { MarketingConversionTable } from '@/components/analytics/marketing-conversion-table'
import { AnalyticsUseCases } from '@/lib/analytics/usecases'
import { AnalyticsRepositoryImpl } from '@/lib/analytics/repository-impl'

const analyticsRepository = new AnalyticsRepositoryImpl()
const analyticsUseCases = new AnalyticsUseCases(analyticsRepository)

export default function MarketingChannelsPage() {
  const [selectedYear, setSelectedYear] = useState(2024)
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i)

  const handlePrint = () => {
    window.print()
  }

  // ダミーデータ（実際にはuseCasesから取得）
  const kpiData = {
    totalCustomers: 10245,
    previousYearCustomers: 9456,
    topChannel: 'ホットペッパー',
    topChannelPercentage: 38.5,
    averageCAC: 1250, // Customer Acquisition Cost
    previousCAC: 1430,
    conversionRate: 24.5,
    previousConversionRate: 22.1,
  }

  const calculateGrowthRate = (current: number, previous: number) => {
    return (((current - previous) / previous) * 100).toFixed(1)
  }

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold">営業媒体別分析</h1>
          <Select
            value={selectedYear.toString()}
            onValueChange={(value) => setSelectedYear(parseInt(value))}
          >
            <SelectTrigger className="w-[120px]">
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
            <CardTitle className="text-sm font-medium">総顧客獲得数</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpiData.totalCustomers.toLocaleString()}人</div>
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3 text-green-600" />
              <span className="text-green-600">
                {calculateGrowthRate(kpiData.totalCustomers, kpiData.previousYearCustomers)}%
              </span>
              前年比
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">最大獲得チャネル</CardTitle>
            <Megaphone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">{kpiData.topChannel}</div>
            <p className="text-xs text-muted-foreground">全体の{kpiData.topChannelPercentage}%</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">顧客獲得単価</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">¥{kpiData.averageCAC.toLocaleString()}</div>
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <TrendingUp className="h-3 w-3 text-green-600" />
              <span className="text-green-600">
                -
                {Math.abs(parseFloat(calculateGrowthRate(kpiData.averageCAC, kpiData.previousCAC)))}
                %
              </span>
              前年比（改善）
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">平均CV率</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpiData.conversionRate}%</div>
            <p className="text-xs text-muted-foreground">
              前年比 +{(kpiData.conversionRate - kpiData.previousConversionRate).toFixed(1)}pt
            </p>
          </CardContent>
        </Card>
      </div>

      {/* チャネル別構成グラフ */}
      <Card>
        <CardHeader>
          <CardTitle>チャネル別顧客獲得推移</CardTitle>
        </CardHeader>
        <CardContent>
          <MarketingChannelChart year={selectedYear} analyticsUseCases={analyticsUseCases} />
        </CardContent>
      </Card>

      {/* 詳細データテーブル */}
      <Card>
        <CardHeader>
          <CardTitle>詳細データ</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="monthly" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="monthly">月別推移</TabsTrigger>
              <TabsTrigger value="roi">ROI分析</TabsTrigger>
              <TabsTrigger value="conversion">CV分析</TabsTrigger>
            </TabsList>
            <TabsContent value="monthly" className="mt-4">
              <MarketingChannelTable year={selectedYear} analyticsUseCases={analyticsUseCases} />
            </TabsContent>
            <TabsContent value="roi" className="mt-4">
              <MarketingROITable year={selectedYear} analyticsUseCases={analyticsUseCases} />
            </TabsContent>
            <TabsContent value="conversion" className="mt-4">
              <MarketingConversionTable year={selectedYear} analyticsUseCases={analyticsUseCases} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
