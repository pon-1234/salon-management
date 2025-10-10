'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import {
  Clock,
  Users,
  CreditCard,
  Banknote,
  TrendingUp,
  Target,
  Calendar,
  BarChart3,
  Star,
  UserPlus,
  Repeat,
} from 'lucide-react'
import { WorkPerformance, MonthlyPerformanceSummary } from '@/lib/cast/types'
import {
  getWorkPerformancesByCast,
  getMonthlyPerformanceSummary,
  calculateDailyStats,
} from '@/lib/cast/performance-data'
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns'
import { ja } from 'date-fns/locale'

interface WorkPerformanceTabProps {
  castId: string
  castName: string
}

export function WorkPerformanceTab({ castId, castName }: WorkPerformanceTabProps) {
  const [performances] = useState<WorkPerformance[]>(getWorkPerformancesByCast(castId))
  const [monthlyStats] = useState<MonthlyPerformanceSummary>(
    getMonthlyPerformanceSummary(castId, 2025, 6)
  )
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month'>('week')

  // 期間別データ取得
  const getPerformancesByPeriod = (period: 'week' | 'month') => {
    const now = new Date()
    const start = period === 'week' ? startOfWeek(now, { weekStartsOn: 1 }) : startOfMonth(now)
    const end = period === 'week' ? endOfWeek(now, { weekStartsOn: 1 }) : endOfMonth(now)

    return performances.filter((p) => p.date >= start && p.date <= end)
  }

  const weekPerformances = getPerformancesByPeriod('week')
  const monthPerformances = getPerformancesByPeriod('month')

  const weekStats = calculateDailyStats(weekPerformances)
  const monthStatsCalc = calculateDailyStats(monthPerformances)

  return (
    <div className="space-y-6">
      {/* 期間選択タブ */}
      <Tabs
        value={selectedPeriod}
        onValueChange={(value) => setSelectedPeriod(value as 'week' | 'month')}
        className="space-y-6"
      >
        <TabsList>
          <TabsTrigger value="week">今週</TabsTrigger>
          <TabsTrigger value="month">今月</TabsTrigger>
        </TabsList>

        <TabsContent value="week" className="space-y-6">
          <PerformanceOverview
            title="今週の成績"
            period={
              format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'M/d', { locale: ja }) +
              ' - ' +
              format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'M/d', { locale: ja })
            }
            stats={weekStats}
          />
          <PerformanceDetailTable performances={weekPerformances} />
        </TabsContent>

        <TabsContent value="month" className="space-y-6">
          <PerformanceOverview
            title="今月の成績"
            period={format(startOfMonth(new Date()), 'yyyy年M月', { locale: ja })}
            stats={monthStatsCalc}
          />
          <MonthlyTargetProgress monthlyStats={monthlyStats} />
          <PerformanceDetailTable performances={monthPerformances} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

interface PerformanceOverviewProps {
  title: string
  period: string
  stats: ReturnType<typeof calculateDailyStats>
}

function PerformanceOverview({ title, period, stats }: PerformanceOverviewProps) {
  return (
    <>
      <div className="mb-4">
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="text-sm text-gray-600">{period}</p>
      </div>

      {/* メインKPI */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">出勤日数</p>
                <p className="text-2xl font-bold">{stats.totalWorkDays}日</p>
                <p className="text-xs text-gray-500">
                  平均 {stats.averageWorkHours.toFixed(1)}h/日
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">サービス数</p>
                <p className="text-2xl font-bold">{stats.totalServiceCount}本</p>
                <p className="text-xs text-gray-500">
                  平均 {stats.averageServiceCount.toFixed(1)}本/日
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-orange-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">売上金額</p>
                <p className="text-2xl font-bold">¥{stats.totalRevenue.toLocaleString()}</p>
                <p className="text-xs text-gray-500">
                  平均 ¥{stats.averageRevenue.toLocaleString()}/日
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Target className="h-4 w-4 text-purple-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">客単価</p>
                <p className="text-2xl font-bold">¥{stats.averageServiceAmount.toLocaleString()}</p>
                <p className="text-xs text-gray-500">
                  リピート率 {stats.averageRepeatRate.toFixed(1)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Repeat className="h-4 w-4 text-emerald-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">店リピート</p>
                <p className="text-2xl font-bold">{stats.totalStoreRepeats}件</p>
                <p className="text-xs text-gray-500">
                  店舗貢献率 {stats.storeRepeatRate.toFixed(1)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 詳細指標 */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        {/* 決済方法別 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <CreditCard className="h-4 w-4" />
              決済方法別
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Banknote className="h-4 w-4 text-green-600" />
                <span className="text-sm">現金</span>
              </div>
              <div className="text-right">
                <div className="font-medium">{stats.totalCashCount}本</div>
                <div className="text-sm text-gray-500">
                  ¥{stats.totalCashAmount.toLocaleString()}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-blue-600" />
                <span className="text-sm">カード</span>
              </div>
              <div className="text-right">
                <div className="font-medium">{stats.totalCardCount}本</div>
                <div className="text-sm text-gray-500">
                  ¥{stats.totalCardAmount.toLocaleString()}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 顧客獲得 */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <UserPlus className="h-4 w-4" />
              顧客獲得
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">新規顧客</span>
              <div className="text-right">
                <div className="font-medium">{stats.totalNewCustomers}人</div>
                <div className="text-sm text-gray-500">{stats.newCustomerRate.toFixed(1)}%</div>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">指名獲得</span>
              <div className="text-right">
                <div className="font-medium">{stats.totalDesignations}本</div>
                <div className="text-sm text-gray-500">{stats.designationRate.toFixed(1)}%</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* パフォーマンス */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Star className="h-4 w-4" />
              パフォーマンス
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <div className="mb-1 flex justify-between text-sm">
                <span>リピート率</span>
                <span>{stats.averageRepeatRate.toFixed(1)}%</span>
              </div>
              <Progress value={stats.averageRepeatRate} className="h-2" />
            </div>
            <div>
              <div className="mb-1 flex justify-between text-sm">
                <span>指名率</span>
                <span>{stats.designationRate.toFixed(1)}%</span>
              </div>
              <Progress value={stats.designationRate} className="h-2" />
            </div>
          </CardContent>
        </Card>

        {/* 店リピート */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Repeat className="h-4 w-4" />
              店リピート
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">貢献件数</span>
              <div className="text-right">
                <div className="font-medium">{stats.totalStoreRepeats}件</div>
                <div className="text-sm text-gray-500">
                  前回他キャスト→自店舗 {stats.storeRepeatRate.toFixed(1)}%
                </div>
              </div>
            </div>
            <p className="text-xs text-gray-500">
              直前来店のキャストと異なる場合のみ前回キャストへ付与。二重付与防止済み。
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  )
}

interface MonthlyTargetProgressProps {
  monthlyStats: MonthlyPerformanceSummary
}

function MonthlyTargetProgress({ monthlyStats }: MonthlyTargetProgressProps) {
  // 目標値（例として設定）
  const targets = {
    workDays: 25,
    serviceCount: 120,
    revenue: 1800000,
    designationRate: 70,
    repeatRate: 70,
    storeRepeatShare: 25,
  }

  const workDaysProgress = (monthlyStats.totalWorkDays / targets.workDays) * 100
  const serviceProgress = (monthlyStats.totalServiceCount / targets.serviceCount) * 100
  const revenueProgress = (monthlyStats.totalRevenue / targets.revenue) * 100
  const designationProgress =
    (((monthlyStats.totalDesignations / monthlyStats.totalServiceCount) * 100) /
      targets.designationRate) *
    100
  const repeatProgress = (monthlyStats.averageRepeatRate / targets.repeatRate) * 100
  const storeRepeatProgress =
    (monthlyStats.storeRepeatShare / targets.storeRepeatShare) * 100

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          月間目標達成状況
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <div className="mb-2 flex justify-between text-sm">
              <span>出勤日数</span>
              <span>
                {monthlyStats.totalWorkDays} / {targets.workDays}日
              </span>
            </div>
            <Progress value={Math.min(workDaysProgress, 100)} className="h-2" />
            <div className="mt-1 text-xs text-gray-500">{workDaysProgress.toFixed(1)}% 達成</div>
          </div>

          <div>
            <div className="mb-2 flex justify-between text-sm">
              <span>サービス数</span>
              <span>
                {monthlyStats.totalServiceCount} / {targets.serviceCount}本
              </span>
            </div>
            <Progress value={Math.min(serviceProgress, 100)} className="h-2" />
            <div className="mt-1 text-xs text-gray-500">{serviceProgress.toFixed(1)}% 達成</div>
          </div>

          <div>
            <div className="mb-2 flex justify-between text-sm">
              <span>売上金額</span>
              <span>
                ¥{monthlyStats.totalRevenue.toLocaleString()} / ¥{targets.revenue.toLocaleString()}
              </span>
            </div>
            <Progress value={Math.min(revenueProgress, 100)} className="h-2" />
            <div className="mt-1 text-xs text-gray-500">{revenueProgress.toFixed(1)}% 達成</div>
          </div>

          <div>
            <div className="mb-2 flex justify-between text-sm">
              <span>リピート率</span>
              <span>
                {monthlyStats.averageRepeatRate.toFixed(1)}% / {targets.repeatRate}%
              </span>
            </div>
            <Progress value={Math.min(repeatProgress, 100)} className="h-2" />
            <div className="mt-1 text-xs text-gray-500">{repeatProgress.toFixed(1)}% 達成</div>
          </div>

          <div>
            <div className="mb-2 flex justify-between text-sm">
              <span>店リピート貢献</span>
              <span>
                {monthlyStats.totalStoreRepeats}件 / 目標比 {targets.storeRepeatShare}%
              </span>
            </div>
            <Progress value={Math.min(storeRepeatProgress, 100)} className="h-2" />
            <div className="mt-1 text-xs text-gray-500">
              {storeRepeatProgress.toFixed(1)}% 達成（店舗シェア {monthlyStats.storeRepeatShare.toFixed(1)}%）
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

interface PerformanceDetailTableProps {
  performances: WorkPerformance[]
}

function PerformanceDetailTable({ performances }: PerformanceDetailTableProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>日別詳細成績</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>日付</TableHead>
              <TableHead>時間</TableHead>
              <TableHead>現金本数</TableHead>
              <TableHead>現金金額</TableHead>
              <TableHead>カード本数</TableHead>
              <TableHead>カード金額</TableHead>
              <TableHead>合計本数</TableHead>
              <TableHead>新規</TableHead>
              <TableHead>指名</TableHead>
              <TableHead>店リピート</TableHead>
              <TableHead>リピート率</TableHead>
              <TableHead>合計金額</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {performances.map((performance) => (
              <TableRow key={performance.id}>
                <TableCell>
                  <div className="text-sm">
                    <div>{format(performance.date, 'M/d(E)', { locale: ja })}</div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className="text-xs">
                    {performance.workHours}h
                  </Badge>
                </TableCell>
                <TableCell className="text-center">
                  <div className="font-medium">{performance.cashCount}</div>
                </TableCell>
                <TableCell className="text-right">
                  ¥{performance.cashAmount.toLocaleString()}
                </TableCell>
                <TableCell className="text-center">
                  <div className="font-medium">{performance.cardCount}</div>
                </TableCell>
                <TableCell className="text-right">
                  ¥{performance.cardAmount.toLocaleString()}
                </TableCell>
                <TableCell className="text-center font-medium">{performance.totalCount}</TableCell>
                <TableCell className="text-center">
                  <div className="text-sm">
                    <div>フリー: {performance.newFreeCount}</div>
                    <div>パネル: {performance.newPanelCount}</div>
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <div className="text-sm">
                    <div>本指名: {performance.regularDesignationCount}</div>
                    <div>合計: {performance.totalDesignationCount}</div>
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant="secondary" className="text-xs">
                    {performance.storeRepeatCount}件
                  </Badge>
                </TableCell>
                <TableCell className="text-center">
                  <Badge
                    variant={
                      performance.repeatRate >= 70
                        ? 'default'
                        : performance.repeatRate >= 50
                          ? 'secondary'
                          : 'destructive'
                    }
                    className="text-xs"
                  >
                    {performance.repeatRate}%
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-medium">
                  ¥{performance.totalAmount.toLocaleString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {performances.length === 0 && (
          <div className="py-8 text-center text-gray-500">
            <Calendar className="mx-auto mb-2 h-12 w-12 text-gray-300" />
            該当期間のデータがありません
          </div>
        )}
      </CardContent>
    </Card>
  )
}
