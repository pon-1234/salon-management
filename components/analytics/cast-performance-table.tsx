'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import { AnalyticsUseCases } from '@/lib/analytics/usecases'
import { StaffPerformanceData } from '@/lib/types/analytics'
import {
  TrendingUp,
  Users,
  DollarSign,
  Target,
  Clock,
  CreditCard,
  Banknote,
  Star,
} from 'lucide-react'

interface CastPerformanceTableProps {
  analyticsUseCases: AnalyticsUseCases
}

interface TotalsAccumulator {
  workingCasts: number
  totalHours: number
  cashTransactions: {
    count: number
    amount: number
  }
  cardTransactions: {
    count: number
    amount: number
  }
  totalTransactions: number
  newCustomers: {
    free: number
    paid: number
  }
  designations: {
    regular: number
    total: number
    rate: number
  }
  discount: number
  totalAmount: number
  castFee: number
  castRevenue: number
  storeRevenue: number
}

export function CastPerformanceTable({ analyticsUseCases }: CastPerformanceTableProps) {
  const [data, setData] = useState<StaffPerformanceData[]>([])

  useEffect(() => {
    const fetchData = async () => {
      const result = await analyticsUseCases.getStaffPerformance()
      setData(result)
    }
    fetchData()
  }, [analyticsUseCases])

  const totals = data.reduce<TotalsAccumulator>(
    (acc, curr) => ({
      workingCasts: acc.workingCasts + 1,
      totalHours: acc.totalHours + parseInt(curr.workDays.split('/')[1]),
      cashTransactions: {
        count: acc.cashTransactions.count + curr.cashTransactions.count,
        amount: acc.cashTransactions.amount + curr.cashTransactions.amount,
      },
      cardTransactions: {
        count: acc.cardTransactions.count + curr.cardTransactions.count,
        amount: acc.cardTransactions.amount + curr.cardTransactions.amount,
      },
      totalTransactions: acc.totalTransactions + curr.totalTransactions,
      newCustomers: {
        free: acc.newCustomers.free + curr.newCustomers.free,
        paid: acc.newCustomers.paid + curr.newCustomers.paid,
      },
      designations: {
        regular: acc.designations.regular + curr.designations.regular,
        total: acc.designations.total + curr.designations.total,
        rate: 0, // Will be calculated after reduce
      },
      discount: acc.discount + curr.discount,
      totalAmount: acc.totalAmount + curr.totalAmount,
      castFee: acc.castFee + curr.staffFee,
      castRevenue: acc.castRevenue + curr.staffRevenue,
      storeRevenue: acc.storeRevenue + curr.storeRevenue,
    }),
    {
      workingCasts: 0,
      totalHours: 0,
      cashTransactions: { count: 0, amount: 0 },
      cardTransactions: { count: 0, amount: 0 },
      totalTransactions: 0,
      newCustomers: { free: 0, paid: 0 },
      designations: { regular: 0, total: 0, rate: 0 },
      discount: 0,
      totalAmount: 0,
      castFee: 0,
      castRevenue: 0,
      storeRevenue: 0,
    }
  )

  totals.designations.rate =
    totals.totalTransactions > 0
      ? Math.round((totals.designations.total / totals.totalTransactions) * 100)
      : 0

  const averageServiceAmount =
    totals.totalTransactions > 0 ? Math.round(totals.totalAmount / totals.totalTransactions) : 0

  const newCustomerRate =
    totals.totalTransactions > 0
      ? Math.round(
          ((totals.newCustomers.free + totals.newCustomers.paid) / totals.totalTransactions) * 100
        )
      : 0

  return (
    <div className="space-y-6">
      {/* サマリーカード */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">稼働キャスト</p>
                <p className="text-2xl font-bold">{totals.workingCasts}人</p>
                <p className="text-xs text-gray-500">{totals.totalHours}時間</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Target className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">総サービス数</p>
                <p className="text-2xl font-bold">{totals.totalTransactions}本</p>
                <p className="text-xs text-gray-500">
                  客単価 ¥{averageServiceAmount.toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-4 w-4 text-orange-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">総売上</p>
                <p className="text-2xl font-bold">¥{totals.totalAmount.toLocaleString()}</p>
                <p className="text-xs text-gray-500">値引 ¥{totals.discount.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Star className="h-4 w-4 text-purple-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">指名率</p>
                <p className="text-2xl font-bold">{totals.designations.rate}%</p>
                <p className="text-xs text-gray-500">新規率 {newCustomerRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 決済方法別と収益分析 */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <CreditCard className="h-4 w-4" />
              決済方法別売上
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Banknote className="h-4 w-4 text-green-600" />
                <span className="text-sm">現金</span>
              </div>
              <div className="text-right">
                <div className="font-medium">{totals.cashTransactions.count}本</div>
                <div className="text-sm text-gray-500">
                  ¥{totals.cashTransactions.amount.toLocaleString()}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-blue-600" />
                <span className="text-sm">カード</span>
              </div>
              <div className="text-right">
                <div className="font-medium">{totals.cardTransactions.count}本</div>
                <div className="text-sm text-gray-500">
                  ¥{totals.cardTransactions.amount.toLocaleString()}
                </div>
              </div>
            </div>
            <div className="border-t pt-2">
              <div className="text-sm text-gray-600">
                現金比率:{' '}
                {totals.totalTransactions > 0
                  ? Math.round((totals.cashTransactions.count / totals.totalTransactions) * 100)
                  : 0}
                %
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4" />
              収益分析
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">キャスト収益</span>
              <div className="text-right">
                <div className="font-medium">¥{totals.castRevenue.toLocaleString()}</div>
                <div className="text-xs text-gray-500">
                  {Math.round((totals.castRevenue / totals.totalAmount) * 100)}%
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">店舗収益</span>
              <div className="text-right">
                <div className="font-medium">¥{totals.storeRevenue.toLocaleString()}</div>
                <div className="text-xs text-gray-500">
                  {Math.round((totals.storeRevenue / totals.totalAmount) * 100)}%
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">厚生費</span>
              <div className="text-right">
                <div className="font-medium">¥{totals.castFee.toLocaleString()}</div>
                <div className="text-xs text-gray-500">
                  {Math.round((totals.castFee / totals.totalAmount) * 100)}%
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        {data.map((row) => {
          const designationVariant: 'default' | 'secondary' | 'destructive' =
            row.designations.rate >= 70
              ? 'default'
              : row.designations.rate >= 50
                ? 'secondary'
                : 'destructive'

          const averageSessionAmount =
            row.totalTransactions > 0 ? Math.round(row.totalAmount / row.totalTransactions) : 0

          return (
            <Card key={row.id} className="shadow-sm">
              <CardHeader className="flex flex-col gap-2 justify-between md:flex-row md:items-center">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/admin/cast/manage/${row.id}`}
                      className="text-lg font-semibold text-blue-600 hover:underline"
                    >
                      {row.name}
                    </Link>
                    <Badge variant="outline">{row.workDays}</Badge>
                    <span className="text-sm text-gray-500">ID: {row.id}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    年齢 {row.age}歳 ・ 就業時間 {row.workDays.split('/')[1]}h
                  </p>
                </div>
                <Badge variant={designationVariant} className="text-xs uppercase">
                  指名率 {row.designations.rate}%
                </Badge>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-lg border border-border/60 bg-muted/10 p-4">
                    <p className="text-xs uppercase text-muted-foreground">サービス実績</p>
                    <div className="mt-1 text-2xl font-semibold text-blue-600">
                      {row.totalTransactions.toLocaleString()}本
                    </div>
                    <p className="text-xs text-muted-foreground">
                      客単価 ¥{averageSessionAmount.toLocaleString()}
                    </p>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                      <div>
                        <span className="block font-medium text-foreground">現金</span>
                        <span>
                          {row.cashTransactions.count}本 · ¥
                          {row.cashTransactions.amount.toLocaleString()}
                        </span>
                      </div>
                      <div>
                        <span className="block font-medium text-foreground">カード</span>
                        <span>
                          {row.cardTransactions.count}本 · ¥
                          {row.cardTransactions.amount.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border border-border/60 bg-muted/10 p-4">
                    <p className="text-xs uppercase text-muted-foreground">売上概要</p>
                    <div className="mt-1 text-2xl font-semibold">
                      ¥{row.totalAmount.toLocaleString()}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      値引 {row.discount > 0 ? `-¥${row.discount.toLocaleString()}` : '-'}
                    </p>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                      <div>
                        <span className="block font-medium text-foreground">キャスト収益</span>
                        <span>¥{row.staffRevenue.toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="block font-medium text-foreground">店舗収益</span>
                        <span>¥{row.storeRevenue.toLocaleString()}</span>
                      </div>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      厚生費 ¥{row.staffFee.toLocaleString()}
                    </p>
                  </div>

                  <div className="rounded-lg border border-border/60 bg-muted/10 p-4">
                    <p className="text-xs uppercase text-muted-foreground">顧客動向</p>
                    <div className="mt-1 flex items-baseline gap-2 text-2xl font-semibold">
                      {row.designations.total}
                      <span className="text-xs text-muted-foreground">指名/本指名</span>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                      <div>
                        <span className="block font-medium text-foreground">本指名</span>
                        <span>{row.designations.regular}本</span>
                      </div>
                      <div>
                        <span className="block font-medium text-foreground">総指名</span>
                        <span>{row.designations.total}本</span>
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                      <div>
                        <span className="block font-medium text-foreground">新規(フリー)</span>
                        <span>{row.newCustomers.free}人</span>
                      </div>
                      <div>
                        <span className="block font-medium text-foreground">新規(パネル)</span>
                        <span>{row.newCustomers.paid}人</span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg border border-border/60 bg-muted/10 p-4">
                    <p className="text-xs uppercase text-muted-foreground">時間配分</p>
                    <div className="mt-1 text-2xl font-semibold">
                      {row.workDays.split('/')[1]}時間
                    </div>
                    <p className="text-xs text-muted-foreground">
                      稼働日 {row.workDays.split('/')[0]}日
                    </p>
                    <div className="mt-3 space-y-2 text-xs text-muted-foreground">
                      <div className="flex items-center justify-between font-medium text-foreground">
                        <span>現金比率</span>
                        <span>
                          {row.totalTransactions > 0
                            ? Math.round(
                                (row.cashTransactions.count / row.totalTransactions) * 100
                              )
                            : 0}
                          %
                        </span>
                      </div>
                      <div className="flex items-center justify-between font-medium text-foreground">
                        <span>カード比率</span>
                        <span>
                          {row.totalTransactions > 0
                            ? Math.round(
                                (row.cardTransactions.count / row.totalTransactions) * 100
                              )
                            : 0}
                          %
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card className="border-dashed">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">TOTAL サマリー</CardTitle>
          <p className="text-xs text-muted-foreground">
            稼働 {totals.workingCasts}人 ・ 就業時間 {totals.totalHours}h ・ 総売上 ¥
            {totals.totalAmount.toLocaleString()}
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-border/60 bg-muted/10 p-3 text-sm">
              <p className="text-xs uppercase text-muted-foreground">サービス数</p>
              <div className="text-lg font-semibold text-blue-600">
                {totals.totalTransactions.toLocaleString()}本
              </div>
              <p className="text-xs text-muted-foreground">
                客単価 ¥{averageServiceAmount.toLocaleString()}
              </p>
            </div>
            <div className="rounded-lg border border-border/60 bg-muted/10 p-3 text-sm">
              <p className="text-xs uppercase text-muted-foreground">新規顧客</p>
              <div className="text-lg font-semibold">
                {(totals.newCustomers.free + totals.newCustomers.paid).toLocaleString()}人
              </div>
              <p className="text-xs text-muted-foreground">新規率 {newCustomerRate}%</p>
            </div>
            <div className="rounded-lg border border-border/60 bg-muted/10 p-3 text-sm">
              <p className="text-xs uppercase text-muted-foreground">指名</p>
              <div className="text-lg font-semibold">{totals.designations.total}本</div>
              <p className="text-xs text-muted-foreground">本指名 {totals.designations.regular}本</p>
            </div>
            <div className="rounded-lg border border-border/60 bg-muted/10 p-3 text-sm">
              <p className="text-xs uppercase text-muted-foreground">収益</p>
              <div className="text-lg font-semibold">
                キャスト ¥{totals.castRevenue.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                店舗 ¥{totals.storeRevenue.toLocaleString()} / 厚生費 ¥
                {totals.castFee.toLocaleString()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
