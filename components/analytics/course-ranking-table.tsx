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
import { AnalyticsUseCases } from '@/lib/analytics/usecases'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface CourseRankingTableProps {
  year: number
  month: number
  analyticsUseCases: AnalyticsUseCases
}

interface CourseRanking {
  rank: number
  previousRank: number
  id: string
  name: string
  duration: number
  price: number
  bookings: number
  revenue: number
  customerSatisfaction: number
  rebookingRate: number
}

export function CourseRankingTable({ year, month, analyticsUseCases }: CourseRankingTableProps) {
  const [data, setData] = useState<CourseRanking[]>([])

  useEffect(() => {
    // ダミーデータ（実際にはuseCasesから取得）
    const dummyData: CourseRanking[] = [
      {
        rank: 1,
        previousRank: 1,
        id: '1',
        name: 'リラクゼーション90分',
        duration: 90,
        price: 12000,
        bookings: 178,
        revenue: 2136000,
        customerSatisfaction: 4.8,
        rebookingRate: 72,
      },
      {
        rank: 2,
        previousRank: 3,
        id: '2',
        name: 'ボディケア60分',
        duration: 60,
        price: 8000,
        bookings: 156,
        revenue: 1248000,
        customerSatisfaction: 4.6,
        rebookingRate: 68,
      },
      {
        rank: 3,
        previousRank: 2,
        id: '3',
        name: 'フェイシャル45分',
        duration: 45,
        price: 6500,
        bookings: 134,
        revenue: 871000,
        customerSatisfaction: 4.7,
        rebookingRate: 65,
      },
      {
        rank: 4,
        previousRank: 5,
        id: '4',
        name: 'アロマトリートメント',
        duration: 75,
        price: 9500,
        bookings: 98,
        revenue: 931000,
        customerSatisfaction: 4.9,
        rebookingRate: 78,
      },
      {
        rank: 5,
        previousRank: 4,
        id: '5',
        name: 'ヘッドスパ30分',
        duration: 30,
        price: 4500,
        bookings: 87,
        revenue: 391500,
        customerSatisfaction: 4.5,
        rebookingRate: 58,
      },
    ]
    setData(dummyData)
  }, [year, month, analyticsUseCases])

  const getRankingIcon = (current: number, previous: number) => {
    if (current < previous) return <TrendingUp className="h-4 w-4 text-green-600" />
    if (current > previous) return <TrendingDown className="h-4 w-4 text-red-600" />
    return <Minus className="h-4 w-4 text-gray-400" />
  }

  const getRankBadge = (rank: number) => {
    if (rank === 1) return <Badge className="bg-yellow-500">1位</Badge>
    if (rank === 2) return <Badge className="bg-gray-400">2位</Badge>
    if (rank === 3) return <Badge className="bg-orange-600">3位</Badge>
    return <Badge variant="secondary">{rank}位</Badge>
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[80px]">順位</TableHead>
            <TableHead>コース名</TableHead>
            <TableHead className="text-right">価格</TableHead>
            <TableHead className="text-right">予約数</TableHead>
            <TableHead className="text-right">売上額</TableHead>
            <TableHead className="text-right">満足度</TableHead>
            <TableHead className="text-right">リピート率</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((course) => (
            <TableRow key={course.id}>
              <TableCell>
                <div className="flex items-center gap-2">
                  {getRankBadge(course.rank)}
                  {getRankingIcon(course.rank, course.previousRank)}
                </div>
              </TableCell>
              <TableCell className="font-medium">
                {course.name}
                <span className="ml-2 text-xs text-gray-500">({course.duration}分)</span>
              </TableCell>
              <TableCell className="text-right">¥{course.price.toLocaleString()}</TableCell>
              <TableCell className="text-right">{course.bookings}件</TableCell>
              <TableCell className="text-right font-medium text-green-600">
                ¥{course.revenue.toLocaleString()}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                  <span className="text-yellow-500">★</span>
                  {course.customerSatisfaction}
                </div>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                  {course.rebookingRate}%
                  {course.rebookingRate >= 70 && (
                    <Badge variant="outline" className="text-xs">
                      高
                    </Badge>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
