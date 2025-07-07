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
import { Badge } from '@/components/ui/badge'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface DistrictPerformanceTableProps {
  area: string
  year: number
}

interface PerformanceData {
  district: string
  revenue: number
  customers: number
  averageSpending: number
  newCustomerRate: number
  repeatRate: number
  growthRate: number
  rank: number
  previousRank: number
}

export function DistrictPerformanceTable({ area, year }: DistrictPerformanceTableProps) {
  const [data, setData] = useState<PerformanceData[]>([])

  useEffect(() => {
    // ダミーデータ（実際にはAPIから取得）
    const districts =
      area === '東京都'
        ? [
            '渋谷区',
            '新宿区',
            '港区',
            '中央区',
            '千代田区',
            '品川区',
            '目黒区',
            '世田谷区',
            '豊島区',
            '台東区',
          ]
        : ['横浜市', '川崎市', '相模原市', '藤沢市', '鎌倉市', '茅ヶ崎市', '平塚市', '小田原市']

    const dummyData: PerformanceData[] = districts.map((district, index) => ({
      district,
      revenue: Math.floor(Math.random() * 10000000) + 5000000,
      customers: Math.floor(Math.random() * 1000) + 500,
      averageSpending: Math.floor(Math.random() * 2000) + 8000,
      newCustomerRate: Math.random() * 30 + 10,
      repeatRate: Math.random() * 40 + 50,
      growthRate: (Math.random() - 0.5) * 40,
      rank: index + 1,
      previousRank: Math.floor(Math.random() * districts.length) + 1,
    }))

    // 売上高でソート
    dummyData.sort((a, b) => b.revenue - a.revenue)
    dummyData.forEach((item, index) => {
      item.rank = index + 1
    })

    setData(dummyData)
  }, [area, year])

  const getRankingIcon = (current: number, previous: number) => {
    if (current < previous) return <TrendingUp className="h-4 w-4 text-green-600" />
    if (current > previous) return <TrendingDown className="h-4 w-4 text-red-600" />
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
          {data.map((item) => (
            <TableRow key={item.district}>
              <TableCell>
                <div className="flex items-center gap-1">
                  <span className="font-medium">{item.rank}</span>
                  {getRankingIcon(item.rank, item.previousRank)}
                </div>
              </TableCell>
              <TableCell className="font-medium">{item.district}</TableCell>
              <TableCell className="text-right">¥{item.revenue.toLocaleString()}</TableCell>
              <TableCell className="text-right">{item.customers.toLocaleString()}人</TableCell>
              <TableCell className="text-right">¥{item.averageSpending.toLocaleString()}</TableCell>
              <TableCell className="text-right">{item.newCustomerRate.toFixed(1)}%</TableCell>
              <TableCell className="text-right">{item.repeatRate.toFixed(1)}%</TableCell>
              <TableCell className="text-center">{getPerformanceBadge(item.repeatRate)}</TableCell>
              <TableCell className="text-right">
                <span className={item.growthRate > 0 ? 'text-green-600' : 'text-red-600'}>
                  {item.growthRate > 0 ? '+' : ''}
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
