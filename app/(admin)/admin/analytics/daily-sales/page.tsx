"use client"

import { useState, useEffect } from "react"
import { DailySalesData } from "@/lib/types/daily-sales"
import { DailySalesUseCases } from "@/lib/daily-sales/usecases"
import { DailySalesRepositoryImpl } from "@/lib/daily-sales/repository-impl"
import { DailySalesTable } from "@/components/daily-sales/daily-sales-table"
import { DateSelector } from "@/components/daily-sales/date-selector"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  RefreshCw, 
  Download, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Calendar,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  Activity
} from 'lucide-react'
import { 
  LineChart, 
  Line, 
  AreaChart,
  Area,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar
} from 'recharts'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'

const dailySalesRepository = new DailySalesRepositoryImpl()
const dailySalesUseCases = new DailySalesUseCases(dailySalesRepository)

// KPIカードコンポーネント
function KPICard({ 
  title, 
  value, 
  change, 
  icon: Icon, 
  trend,
  subtitle 
}: { 
  title: string
  value: string | number
  change?: number
  icon: any
  trend?: 'up' | 'down' | 'neutral'
  subtitle?: string
}) {
  const isPositive = trend === 'up' || (change && change > 0)
  const TrendIcon = isPositive ? ArrowUpRight : ArrowDownRight
  
  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className={`p-2 rounded-lg ${
          isPositive ? 'bg-emerald-100' : 'bg-red-100'
        }`}>
          <Icon className={`h-4 w-4 ${
            isPositive ? 'text-emerald-600' : 'text-red-600'
          }`} />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-1">
          <div className="text-2xl font-bold">{value}</div>
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
          {change !== undefined && (
            <div className="flex items-center space-x-1">
              <TrendIcon className={`h-4 w-4 ${
                isPositive ? 'text-emerald-600' : 'text-red-600'
              }`} />
              <span className={`text-sm font-medium ${
                isPositive ? 'text-emerald-600' : 'text-red-600'
              }`}>
                {Math.abs(change)}%
              </span>
              <span className="text-xs text-muted-foreground">前日比</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default function DailySalesPage() {
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [salesData, setSalesData] = useState<DailySalesData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [hourlyData, setHourlyData] = useState<any[]>([])
  const [weeklyData, setWeeklyData] = useState<any[]>([])

  const fetchDailySales = async (date: Date) => {
    setIsLoading(true)
    try {
      const data = await dailySalesUseCases.getDailySales(date)
      setSalesData(data)
      
      // モックの時間別データ
      setHourlyData([
        { hour: '10:00', sales: 45000, customers: 3 },
        { hour: '11:00', sales: 62000, customers: 4 },
        { hour: '12:00', sales: 98000, customers: 6 },
        { hour: '13:00', sales: 125000, customers: 8 },
        { hour: '14:00', sales: 143000, customers: 9 },
        { hour: '15:00', sales: 167000, customers: 10 },
        { hour: '16:00', sales: 195000, customers: 12 },
        { hour: '17:00', sales: 234000, customers: 14 },
        { hour: '18:00', sales: 289000, customers: 17 },
        { hour: '19:00', sales: 356000, customers: 21 },
        { hour: '20:00', sales: 412000, customers: 24 },
        { hour: '21:00', sales: 468000, customers: 27 },
      ])
      
      // モックの週間データ
      setWeeklyData([
        { day: '月', sales: 456000 },
        { day: '火', sales: 512000 },
        { day: '水', sales: 489000 },
        { day: '木', sales: 534000 },
        { day: '金', sales: 612000 },
        { day: '土', sales: 756000 },
        { day: '日', sales: 468000 },
      ])
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

  const handleExport = () => {
    // エクスポート機能の実装
    console.log('Exporting data...')
  }

  // 仮の前日比データ
  const kpiData = salesData ? {
    totalSales: {
      value: `¥${salesData.totals.sales.total.toLocaleString()}`,
      change: 12.5,
      trend: 'up' as const
    },
    customerCount: {
      value: salesData.totals.totalTransactions,
      change: -5.2,
      trend: 'down' as const
    },
    averageSpend: {
      value: `¥${Math.floor(salesData.totals.sales.total / Math.max(salesData.totals.totalTransactions, 1)).toLocaleString()}`,
      change: 8.3,
      trend: 'up' as const
    },
    profitMargin: {
      value: `${Math.round((salesData.totals.staffSales / Math.max(salesData.totals.sales.total, 1)) * 100)}%`,
      change: 2.1,
      trend: 'up' as const
    }
  } : null

  return (
    <div className="space-y-6 w-full p-6">
      {/* ヘッダー */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">売上日報</h1>
          <p className="text-muted-foreground mt-1">
            {format(selectedDate, 'yyyy年MM月dd日(E)', { locale: ja })}の売上データ
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DateSelector
            selectedDate={selectedDate}
            onDateChange={handleDateChange}
          />
          <Button onClick={handleRefresh} variant="outline" size="icon">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button onClick={handleExport} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            エクスポート
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : salesData ? (
        <>
          {/* KPIカード */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <KPICard
              title="総売上"
              value={kpiData!.totalSales.value}
              change={kpiData!.totalSales.change}
              icon={DollarSign}
              trend={kpiData!.totalSales.trend}
            />
            <KPICard
              title="来客数"
              value={kpiData!.customerCount.value}
              change={kpiData!.customerCount.change}
              icon={Users}
              trend={kpiData!.customerCount.trend}
              subtitle="組"
            />
            <KPICard
              title="客単価"
              value={kpiData!.averageSpend.value}
              change={kpiData!.averageSpend.change}
              icon={Activity}
              trend={kpiData!.averageSpend.trend}
            />
            <KPICard
              title="利益率"
              value={kpiData!.profitMargin.value}
              change={kpiData!.profitMargin.change}
              icon={TrendingUp}
              trend={kpiData!.profitMargin.trend}
            />
          </div>

          {/* グラフセクション */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* 時間別売上推移 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>時間別売上推移</span>
                  <Badge variant="secondary">リアルタイム</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={hourlyData}>
                    <defs>
                      <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="hour" 
                      className="text-xs"
                      tick={{ fill: '#6b7280' }}
                    />
                    <YAxis 
                      className="text-xs"
                      tick={{ fill: '#6b7280' }}
                      tickFormatter={(value) => `¥${(value / 1000).toFixed(0)}k`}
                    />
                    <Tooltip 
                      formatter={(value: any) => [`¥${value.toLocaleString()}`, '売上']}
                      contentStyle={{ 
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        border: '1px solid #e5e7eb',
                        borderRadius: '6px'
                      }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="sales" 
                      stroke="#10b981" 
                      fillOpacity={1} 
                      fill="url(#colorSales)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* 週間売上比較 */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  週間売上比較
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={weeklyData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="day"
                      className="text-xs"
                      tick={{ fill: '#6b7280' }}
                    />
                    <YAxis 
                      className="text-xs"
                      tick={{ fill: '#6b7280' }}
                      tickFormatter={(value) => `¥${(value / 1000).toFixed(0)}k`}
                    />
                    <Tooltip 
                      formatter={(value: any) => [`¥${value.toLocaleString()}`, '売上']}
                      contentStyle={{ 
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        border: '1px solid #e5e7eb',
                        borderRadius: '6px'
                      }}
                    />
                    <Bar 
                      dataKey="sales" 
                      fill="#3b82f6"
                      radius={[8, 8, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* 詳細テーブル */}
          <Card>
            <CardHeader>
              <CardTitle>売上詳細</CardTitle>
              <div className="mt-4 space-y-1 text-sm text-muted-foreground">
                <p className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">注意</Badge>
                  「女性売上」は原価費を減算しています
                </p>
                <p className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">情報</Badge>
                  厚生費は女性手取りの10%となります（自動計算）
                </p>
              </div>
            </CardHeader>
            <CardContent>
              <DailySalesTable data={salesData} />
            </CardContent>
          </Card>
        </>
      ) : (
        <Alert variant="destructive">
          <AlertDescription>
            データの取得に失敗しました。
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}