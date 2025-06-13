"use client"

import { useEffect, useState } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { AnalyticsUseCases } from "@/lib/analytics/usecases"
import { TrendingUp, TrendingDown } from 'lucide-react'

interface MarketingROITableProps {
  year: number
  analyticsUseCases: AnalyticsUseCases
}

interface ROIData {
  channel: string
  cost: number
  customers: number
  revenue: number
  cac: number
  ltv: number
  roi: number
  trend: number
}

export function MarketingROITable({ year, analyticsUseCases }: MarketingROITableProps) {
  const [data, setData] = useState<ROIData[]>([])

  useEffect(() => {
    // ダミーデータ（実際にはuseCasesから取得）
    const dummyData: ROIData[] = [
      {
        channel: "ホットペッパー",
        cost: 1200000,
        customers: 3945,
        revenue: 35678000,
        cac: 304,
        ltv: 9042,
        roi: 2873,
        trend: 12.5
      },
      {
        channel: "Instagram",
        cost: 450000,
        customers: 2456,
        revenue: 21345000,
        cac: 183,
        ltv: 8693,
        roi: 4643,
        trend: 23.8
      },
      {
        channel: "Google広告",
        cost: 680000,
        customers: 1678,
        revenue: 14567000,
        cac: 405,
        ltv: 8683,
        roi: 2042,
        trend: -5.2
      },
      {
        channel: "紹介",
        cost: 120000,
        customers: 1432,
        revenue: 13890000,
        cac: 84,
        ltv: 9701,
        roi: 11475,
        trend: 8.9
      },
      {
        channel: "ウォークイン",
        cost: 0,
        customers: 1023,
        revenue: 9234000,
        cac: 0,
        ltv: 9025,
        roi: 0,
        trend: 3.2
      }
    ]
    setData(dummyData)
  }, [year, analyticsUseCases])

  const getROIBadge = (roi: number) => {
    if (roi >= 5000) return <Badge className="bg-green-500">優秀</Badge>
    if (roi >= 2000) return <Badge className="bg-yellow-500">良好</Badge>
    if (roi >= 1000) return <Badge variant="secondary">普通</Badge>
    return <Badge variant="destructive">要改善</Badge>
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>チャネル</TableHead>
            <TableHead className="text-right">広告費</TableHead>
            <TableHead className="text-right">獲得顧客数</TableHead>
            <TableHead className="text-right">売上貢献</TableHead>
            <TableHead className="text-right">CAC</TableHead>
            <TableHead className="text-right">LTV</TableHead>
            <TableHead className="text-right">ROI</TableHead>
            <TableHead className="text-center">評価</TableHead>
            <TableHead className="text-right">前年比</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((item) => (
            <TableRow key={item.channel}>
              <TableCell className="font-medium">{item.channel}</TableCell>
              <TableCell className="text-right">
                ¥{item.cost.toLocaleString()}
              </TableCell>
              <TableCell className="text-right">
                {item.customers.toLocaleString()}人
              </TableCell>
              <TableCell className="text-right">
                ¥{item.revenue.toLocaleString()}
              </TableCell>
              <TableCell className="text-right">
                ¥{item.cac.toLocaleString()}
              </TableCell>
              <TableCell className="text-right">
                ¥{item.ltv.toLocaleString()}
              </TableCell>
              <TableCell className="text-right font-medium">
                {item.roi > 0 ? `${item.roi}%` : '-'}
              </TableCell>
              <TableCell className="text-center">
                {item.roi > 0 && getROIBadge(item.roi)}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                  {item.trend > 0 ? (
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-600" />
                  )}
                  <span className={item.trend > 0 ? "text-green-600" : "text-red-600"}>
                    {item.trend > 0 ? "+" : ""}{item.trend}%
                  </span>
                </div>
              </TableCell>
            </TableRow>
          ))}
          <TableRow className="font-bold bg-gray-50">
            <TableCell>合計</TableCell>
            <TableCell className="text-right">
              ¥{data.length > 0 ? data.reduce((sum, item) => sum + item.cost, 0).toLocaleString() : '0'}
            </TableCell>
            <TableCell className="text-right">
              {data.length > 0 ? data.reduce((sum, item) => sum + item.customers, 0).toLocaleString() : '0'}人
            </TableCell>
            <TableCell className="text-right">
              ¥{data.length > 0 ? data.reduce((sum, item) => sum + item.revenue, 0).toLocaleString() : '0'}
            </TableCell>
            <TableCell className="text-right">-</TableCell>
            <TableCell className="text-right">-</TableCell>
            <TableCell className="text-right">-</TableCell>
            <TableCell className="text-center">-</TableCell>
            <TableCell className="text-right">-</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  )
}