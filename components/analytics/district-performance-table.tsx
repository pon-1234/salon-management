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
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { DistrictSalesData } from '@/lib/types/district-sales'

interface DistrictPerformanceTableProps {
  current: DistrictSalesData[]
  previous: DistrictSalesData[]
}

interface PerformanceRow {
  district: string
  revenue: number
  customers: number
  averageSpending: number
  newCustomerRate: number
  repeatRate: number
  growthRate: number
  rank: number
  previousRank: number | null
}

export function DistrictPerformanceTable({ current, previous }: DistrictPerformanceTableProps) {
  if (current.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-gray-500">データがありません</div>
    )
  }

  const previousMap = new Map(previous.map((district) => [district.district, district]))

  const rows: PerformanceRow[] = current
    .map((district) => {
      const revenue = district.total
      const customers = district.customerTotal ?? 0
      const previousEntry = previousMap.get(district.district)
      const previousRevenue = previousEntry?.total ?? 0
      const previousCustomers = previousEntry?.customerTotal ?? 0
      const averageSpending = customers > 0 ? revenue / customers : 0
      const newCustomers = district.newCustomerTotal ?? 0
      const newCustomerRate = customers > 0 ? (newCustomers / customers) * 100 : 0
      const repeatRate = 100 - newCustomerRate
      const growthRate = previousRevenue > 0
        ? ((revenue - previousRevenue) / previousRevenue) * 100
        : revenue > 0
          ? 100
          : 0

      return {
        district: district.district,
        revenue,
        customers,
        averageSpending,
        newCustomerRate,
        repeatRate,
        growthRate,
        rank: 0,
        previousRank: previousEntry ? previous.indexOf(previousEntry) + 1 : null,
      }
    })
    .sort((a, b) => b.revenue - a.revenue)
    .map((row, index) => ({ ...row, rank: index + 1 }))

  const getRankingIcon = (currentRank: number, previousRank: number | null) => {
    if (!previousRank) return <Badge variant="outline">NEW</Badge>
    if (currentRank < previousRank) return <TrendingUp className="h-4 w-4 text-green-600" />
    if (currentRank > previousRank) return <TrendingDown className="h-4 w-4 text-red-600" />
    return <Minus className="h-4 w-4 text-gray-400" />
  }

  const getPerformanceBadge = (rate: number) => {
    if (rate >= 70) return <Badge className="bg-green-500">優秀</Badge>
    if (rate >= 50) return <Badge className="bg-yellow-500">良好</Badge>
    return <Badge variant="secondary">要改善</Badge>
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[60px]">順位</TableHead>
            <TableHead>地区</TableHead>
            <TableHead className="text-right">売上高</TableHead>
            <TableHead className="text-right">来客数</TableHead>
            <TableHead className="text-right">客単価</TableHead>
            <TableHead className="text-right">新規率</TableHead>
            <TableHead className="text-right">リピート率</TableHead>
            <TableHead className="text-center">評価</TableHead>
            <TableHead className="text-right">成長率</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((item) => (
            <TableRow key={item.district}>
              <TableCell>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{item.rank}</span>
                  {getRankingIcon(item.rank, item.previousRank)}
                </div>
              </TableCell>
              <TableCell className="font-medium">{item.district}</TableCell>
              <TableCell className="text-right">¥{item.revenue.toLocaleString()}</TableCell>
              <TableCell className="text-right">{item.customers.toLocaleString()}人</TableCell>
              <TableCell className="text-right">¥{Math.round(item.averageSpending).toLocaleString()}</TableCell>
              <TableCell className="text-right">{item.newCustomerRate.toFixed(1)}%</TableCell>
              <TableCell className="text-right">{item.repeatRate.toFixed(1)}%</TableCell>
              <TableCell className="text-center">{getPerformanceBadge(item.repeatRate)}</TableCell>
              <TableCell className="text-right">
                <span className={item.growthRate >= 0 ? 'text-green-600' : 'text-red-600'}>
                  {item.growthRate >= 0 ? '+' : ''}
                  {item.growthRate.toFixed(1)}%
                </span>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
