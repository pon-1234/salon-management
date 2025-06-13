"use client"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { AreaSalesData } from "@/lib/types/area-sales"
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { Progress } from "@/components/ui/progress"

interface AreaComparisonTableProps {
  data: AreaSalesData[]
  year: number
}

export function AreaComparisonTable({ data, year }: AreaComparisonTableProps) {
  // Null/array check
  if (!data || !Array.isArray(data) || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        データがありません
      </div>
    );
  }

  // ダミーの前年データ（実際にはAPIから取得）
  const previousYearData = data.map(area => ({
    area: area.area,
    total: area.total * (0.8 + Math.random() * 0.4), // 80-120%のランダム値
    customerCount: Math.floor(Math.random() * 3000) + 2000
  }))

  // 分析データを作成
  const analysisData = data.map((area, index) => {
    const previous = previousYearData[index]
    const growthRate = ((area.total - previous.total) / previous.total * 100)
    const marketShare = (area.total / data.reduce((sum, a) => sum + a.total, 0) * 100)
    
    return {
      area: area.area,
      currentSales: area.total,
      previousSales: previous.total,
      growthRate,
      marketShare,
      customerCount: previous.customerCount,
      averageSpending: area.total / previous.customerCount,
      rank: 0 // 後で設定
    }
  })

  // ランキングを設定
  analysisData.sort((a, b) => b.currentSales - a.currentSales)
  analysisData.forEach((item, index) => {
    item.rank = index + 1
  })

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

  // 全体の合計
  const totals = analysisData.reduce((acc, curr) => ({
    currentSales: acc.currentSales + curr.currentSales,
    previousSales: acc.previousSales + curr.previousSales,
    customerCount: acc.customerCount + curr.customerCount
  }), { currentSales: 0, previousSales: 0, customerCount: 0 })

  const overallGrowthRate = ((totals.currentSales - totals.previousSales) / totals.previousSales * 100)

  return (
    <div className="space-y-4">
      {/* サマリーカード */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div className="rounded-lg border p-4 text-center">
          <div className="text-2xl font-bold">¥{totals.currentSales.toLocaleString()}</div>
          <div className="text-sm text-gray-600">全エリア合計</div>
        </div>
        <div className="rounded-lg border p-4 text-center">
          <div className="text-2xl font-bold flex items-center justify-center gap-1">
            {overallGrowthRate > 0 ? (
              <TrendingUp className="h-5 w-5 text-green-600" />
            ) : (
              <TrendingDown className="h-5 w-5 text-red-600" />
            )}
            <span className={overallGrowthRate > 0 ? "text-green-600" : "text-red-600"}>
              {overallGrowthRate > 0 ? "+" : ""}{overallGrowthRate.toFixed(1)}%
            </span>
          </div>
          <div className="text-sm text-gray-600">全体成長率</div>
        </div>
        <div className="rounded-lg border p-4 text-center">
          <div className="text-2xl font-bold">{totals.customerCount.toLocaleString()}人</div>
          <div className="text-sm text-gray-600">総来客数</div>
        </div>
      </div>

      {/* 比較テーブル */}
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
                <TableCell>
                  {getRankBadge(area.rank)}
                </TableCell>
                <TableCell className="font-medium">{area.area}</TableCell>
                <TableCell className="text-right">
                  ¥{area.currentSales.toLocaleString()}
                </TableCell>
                <TableCell className="text-right text-gray-500">
                  ¥{Math.round(area.previousSales).toLocaleString()}
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex items-center justify-center gap-1">
                    {getGrowthIcon(area.growthRate)}
                    <span className={area.growthRate > 0 ? "text-green-600" : "text-red-600"}>
                      {area.growthRate > 0 ? "+" : ""}{area.growthRate.toFixed(1)}%
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-sm font-medium">{area.marketShare.toFixed(1)}%</span>
                    <Progress value={area.marketShare} className="w-16 h-2" />
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  {area.customerCount.toLocaleString()}人
                </TableCell>
                <TableCell className="text-right">
                  ¥{Math.round(area.averageSpending).toLocaleString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}