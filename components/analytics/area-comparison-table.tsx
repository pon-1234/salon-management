'use client'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { AreaSalesData } from '@/lib/types/area-sales'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { Progress } from '@/components/ui/progress'

interface AreaComparisonTableProps {
  current: AreaSalesData[]
  previous: AreaSalesData[]
}

export function AreaComparisonTable({ current, previous }: AreaComparisonTableProps) {
  if (current.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-gray-500">データがありません</div>
    )
  }

  const previousMap = new Map(previous.map((area) => [area.area, area]))
  const totalCurrentSales = current.reduce((sum, area) => sum + area.total, 0)
  const totalPreviousSales = previous.reduce((sum, area) => sum + area.total, 0)
  const totalCustomers = current.reduce((sum, area) => sum + (area.customerTotal ?? 0), 0)
  const previousCustomers = previous.reduce((sum, area) => sum + (area.customerTotal ?? 0), 0)

  const analysisData = current
    .map((area) => {
      const previousEntry = previousMap.get(area.area)
      const previousSales = previousEntry?.total ?? 0
      const previousCustomerCount = previousEntry?.customerTotal ?? 0
      const growthRate = previousSales > 0
        ? ((area.total - previousSales) / previousSales) * 100
        : area.total > 0
          ? 100
          : 0
      const marketShare = totalCurrentSales > 0 ? (area.total / totalCurrentSales) * 100 : 0
      const customerCount = area.customerTotal ?? 0
      const averageSpending = customerCount > 0 ? area.total / customerCount : 0

      return {
        area: area.area,
        currentSales: area.total,
        previousSales,
        growthRate,
        marketShare,
        customerCount,
        previousCustomerCount,
        averageSpending,
      }
    })
    .sort((a, b) => b.currentSales - a.currentSales)
    .map((entry, index) => ({ ...entry, rank: index + 1 }))

  const overallGrowthRate =
    totalPreviousSales > 0
      ? ((totalCurrentSales - totalPreviousSales) / totalPreviousSales) * 100
      : totalCurrentSales > 0
        ? 100
        : 0

  const getRankBadge = (rank: number) => {
    if (rank === 1) return <Badge className="bg-yellow-500">1位</Badge>
    if (rank === 2) return <Badge className="bg-gray-400">2位</Badge>
    if (rank === 3) return <Badge className="bg-orange-600">3位</Badge>
    return <Badge variant="secondary">{rank}位</Badge>
  }

  const getGrowthIcon = (rate: number) => {
    if (rate > 5) return <TrendingUp className="h-4 w-4 text-green-600" />
    if (rate < -5) return <TrendingDown className="h-4 w-4 text-red-600" />
    return <Minus className="h-4 w-4 text-gray-400" />
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-lg border p-4 text-center">
          <div className="text-2xl font-bold">¥{totalCurrentSales.toLocaleString()}</div>
          <div className="text-sm text-gray-600">全エリア合計売上</div>
        </div>
        <div className="rounded-lg border p-4 text-center">
          <div className="flex items-center justify-center gap-1 text-2xl font-bold">
            {overallGrowthRate >= 0 ? (
              <TrendingUp className="h-5 w-5 text-green-600" />
            ) : (
              <TrendingDown className="h-5 w-5 text-red-600" />
            )}
            <span className={overallGrowthRate >= 0 ? 'text-green-600' : 'text-red-600'}>
              {overallGrowthRate >= 0 ? '+' : ''}
              {overallGrowthRate.toFixed(1)}%
            </span>
          </div>
          <div className="text-sm text-gray-600">全体成長率</div>
        </div>
        <div className="rounded-lg border p-4 text-center">
          <div className="text-2xl font-bold">{totalCustomers.toLocaleString()}人</div>
          <div className="text-sm text-gray-600">総来客数</div>
        </div>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">順位</TableHead>
              <TableHead>エリア</TableHead>
              <TableHead className="text-right">当年売上</TableHead>
              <TableHead className="text-right">前年売上</TableHead>
              <TableHead className="text-center">成長率</TableHead>
              <TableHead className="text-center">市場シェア</TableHead>
              <TableHead className="text-right">来客数</TableHead>
              <TableHead className="text-right">客単価</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {analysisData.map((area) => (
              <TableRow key={area.area}>
                <TableCell>{getRankBadge(area.rank)}</TableCell>
                <TableCell className="font-medium">{area.area}</TableCell>
                <TableCell className="text-right">¥{area.currentSales.toLocaleString()}</TableCell>
                <TableCell className="text-right text-gray-500">
                  ¥{Math.round(area.previousSales).toLocaleString()}
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    {getGrowthIcon(area.growthRate)}
                    <span className={area.growthRate >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {area.growthRate >= 0 ? '+' : ''}
                      {area.growthRate.toFixed(1)}%
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-sm font-medium">{area.marketShare.toFixed(1)}%</span>
                    <Progress value={area.marketShare} className="h-2 w-16" />
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  {area.customerCount ? `${area.customerCount.toLocaleString()}人` : '-'}
                </TableCell>
                <TableCell className="text-right">
                  {area.customerCount > 0
                    ? `¥${Math.round(area.averageSpending).toLocaleString()}`
                    : '-'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
