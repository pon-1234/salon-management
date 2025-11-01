'use client'

import { useMemo } from 'react'
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

interface CourseRankingTableProps {
  current: CourseSummary[]
  previous: CourseSummary[]
}

interface CourseSummary {
  id: string
  name: string
  duration: number
  price: number
  totalBookings: number
  revenue: number
}

interface RankingRow {
  id: string
  rank: number
  previousRank: number | null
  name: string
  duration: number
  price: number
  bookings: number
  revenue: number
  revenueGrowth: number | null
}

const calculateGrowthRate = (current: number, previous: number) => {
  if (previous === 0) {
    return current === 0 ? null : 100
  }
  return ((current - previous) / previous) * 100
}

export function CourseRankingTable({ current, previous }: CourseRankingTableProps) {
  const previousRankMap = useMemo(() => {
    const sorted = [...previous].sort((a, b) => b.revenue - a.revenue)
    const map = new Map<string, number>()
    sorted.forEach((course, index) => {
      map.set(course.id, index + 1)
    })
    return map
  }, [previous])

  const previousRevenueMap = useMemo(() => {
    const map = new Map<string, number>()
    previous.forEach((course) => {
      map.set(course.id, course.revenue)
    })
    return map
  }, [previous])

  const rows = useMemo<RankingRow[]>(() => {
    const sortedCurrent = [...current].sort((a, b) => b.revenue - a.revenue)
    return sortedCurrent.map((course, index) => {
      const previousRank = previousRankMap.get(course.id) ?? null
      const previousRevenue = previousRevenueMap.get(course.id) ?? 0
      return {
        id: course.id,
        rank: index + 1,
        previousRank,
        name: course.name,
        duration: course.duration,
        price: course.price,
        bookings: course.totalBookings,
        revenue: course.revenue,
        revenueGrowth:
          previousRank === null && previousRevenue === 0
            ? null
            : calculateGrowthRate(course.revenue, previousRevenue),
      }
    })
  }, [current, previousRankMap, previousRevenueMap])

  const getRankingIcon = (rank: number, previousRank: number | null) => {
    if (!previousRank) {
      return <Badge variant="outline">New</Badge>
    }
    if (rank < previousRank) return <TrendingUp className="h-4 w-4 text-green-600" />
    if (rank > previousRank) return <TrendingDown className="h-4 w-4 text-red-600" />
    return <Minus className="h-4 w-4 text-gray-400" />
  }

  const getRankBadge = (rank: number) => {
    if (rank === 1) return <Badge className="bg-yellow-500">1位</Badge>
    if (rank === 2) return <Badge className="bg-gray-400">2位</Badge>
    if (rank === 3) return <Badge className="bg-orange-600">3位</Badge>
    return <Badge variant="secondary">{rank}位</Badge>
  }

  if (rows.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center rounded-lg border text-sm text-muted-foreground">
        データがありません。
      </div>
    )
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
            <TableHead className="text-right">前月比</TableHead>
            <TableHead className="text-right">前月順位</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((course) => (
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
              <TableCell className="text-right">{course.bookings.toLocaleString()}件</TableCell>
              <TableCell className="text-right font-medium text-green-600">
                ¥{course.revenue.toLocaleString()}
              </TableCell>
              <TableCell className="text-right">
                {course.revenueGrowth === null ? (
                  <span className="text-muted-foreground">-</span>
                ) : (
                  <span className={course.revenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {`${course.revenueGrowth >= 0 ? '+' : ''}${course.revenueGrowth.toFixed(1)}%`}
                  </span>
                )}
              </TableCell>
              <TableCell className="text-right">
                {course.previousRank ? `${course.previousRank}位` : <span className="text-muted-foreground">-</span>}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
