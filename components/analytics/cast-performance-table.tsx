'use client'

import { useEffect, useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
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

      {/* 詳細テーブル */}
      <Card>
        <CardHeader>
          <CardTitle>キャスト別詳細実績</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[120px] whitespace-nowrap">キャスト</TableHead>
                  <TableHead className="whitespace-nowrap">就業日数/時間</TableHead>
                  <TableHead className="whitespace-nowrap text-right">現金本数</TableHead>
                  <TableHead className="whitespace-nowrap text-right">現金金額</TableHead>
                  <TableHead className="whitespace-nowrap text-right">カード本数</TableHead>
                  <TableHead className="whitespace-nowrap text-right">カード金額</TableHead>
                  <TableHead className="whitespace-nowrap text-right">合計本数</TableHead>
                  <TableHead className="whitespace-nowrap text-right">新規(フリー)</TableHead>
                  <TableHead className="whitespace-nowrap text-right">新規(パネル)</TableHead>
                  <TableHead className="whitespace-nowrap text-right">本指名</TableHead>
                  <TableHead className="whitespace-nowrap text-right">指名合計</TableHead>
                  <TableHead className="whitespace-nowrap text-right">指名率</TableHead>
                  <TableHead className="whitespace-nowrap text-right">値引き</TableHead>
                  <TableHead className="whitespace-nowrap text-right">合計金額</TableHead>
                  <TableHead className="whitespace-nowrap text-right">厚生費</TableHead>
                  <TableHead className="whitespace-nowrap text-right">キャスト収益</TableHead>
                  <TableHead className="whitespace-nowrap text-right">店舗収益</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((row) => (
                  <TableRow key={row.id} className="hover:bg-gray-50">
                    <TableCell className="font-medium">
                      <div>
                        <Link
                          href={`/admin/cast/manage/${row.id}`}
                          className="font-medium text-blue-600 hover:underline"
                        >
                          {row.name}
                        </Link>
                        <span className="ml-1 text-gray-500">({row.age}歳)</span>
                      </div>
                      <div className="text-xs text-gray-400">{row.id}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">
                        {row.workDays}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {row.cashTransactions.count}
                    </TableCell>
                    <TableCell className="text-right">
                      ¥{row.cashTransactions.amount.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {row.cardTransactions.count}
                    </TableCell>
                    <TableCell className="text-right">
                      ¥{row.cardTransactions.amount.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right font-bold text-blue-600">
                      {row.totalTransactions}
                    </TableCell>
                    <TableCell className="text-right">{row.newCustomers.free}</TableCell>
                    <TableCell className="text-right">{row.newCustomers.paid}</TableCell>
                    <TableCell className="text-right font-medium">
                      {row.designations.regular}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {row.designations.total}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge
                        variant={
                          row.designations.rate >= 70
                            ? 'default'
                            : row.designations.rate >= 50
                              ? 'secondary'
                              : 'destructive'
                        }
                        className="text-xs"
                      >
                        {row.designations.rate}%
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-red-600">
                      {row.discount > 0 ? `-¥${row.discount.toLocaleString()}` : '-'}
                    </TableCell>
                    <TableCell className="text-right font-bold">
                      ¥{row.totalAmount.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">¥{row.staffFee.toLocaleString()}</TableCell>
                    <TableCell className="text-right font-medium text-green-600">
                      ¥{row.staffRevenue.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right font-medium text-blue-600">
                      ¥{row.storeRevenue.toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}

                {/* 合計行 */}
                <TableRow className="border-t-2 bg-gray-50 font-bold">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div>
                        <div className="font-bold">TOTAL</div>
                        <div className="text-sm font-normal text-gray-600">
                          稼働 {totals.workingCasts}人・{totals.totalHours}時間
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell></TableCell>
                  <TableCell className="text-right">{totals.cashTransactions.count}</TableCell>
                  <TableCell className="text-right">
                    ¥{totals.cashTransactions.amount.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">{totals.cardTransactions.count}</TableCell>
                  <TableCell className="text-right">
                    ¥{totals.cardTransactions.amount.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right text-blue-600">
                    {totals.totalTransactions}
                  </TableCell>
                  <TableCell className="text-right">{totals.newCustomers.free}</TableCell>
                  <TableCell className="text-right">{totals.newCustomers.paid}</TableCell>
                  <TableCell className="text-right">{totals.designations.regular}</TableCell>
                  <TableCell className="text-right">{totals.designations.total}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant="default" className="text-xs">
                      {totals.designations.rate}%
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-red-600">
                    -¥{totals.discount.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right text-lg">
                    ¥{totals.totalAmount.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right">¥{totals.castFee.toLocaleString()}</TableCell>
                  <TableCell className="text-right text-green-600">
                    ¥{totals.castRevenue.toLocaleString()}
                  </TableCell>
                  <TableCell className="text-right text-blue-600">
                    ¥{totals.storeRevenue.toLocaleString()}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
