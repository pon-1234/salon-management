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
import { TrendingUp, TrendingDown } from 'lucide-react'

export interface MarketingROIRow {
  channel: string
  cost: number
  customers: number
  revenue: number
  cac: number
  ltv: number
  roi: number
  trend: number
}

interface MarketingROITableProps {
  data: MarketingROIRow[]
}

export function MarketingROITable({ data }: MarketingROITableProps) {
  const getROIBadge = (roi: number) => {
    if (roi >= 5000) return <Badge className="bg-green-500">優秀</Badge>
    if (roi >= 2000) return <Badge className="bg-yellow-500">良好</Badge>
    if (roi >= 1000) return <Badge variant="secondary">普通</Badge>
    if (roi < 0) return <Badge variant="destructive">赤字</Badge>
    return <Badge variant="outline">要改善</Badge>
  }

  if (data.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center rounded-lg border text-sm text-muted-foreground">
        データがありません。
      </div>
    )
  }

  const totalCost = data.reduce((sum, item) => sum + item.cost, 0)
  const totalCustomers = data.reduce((sum, item) => sum + item.customers, 0)
  const totalRevenue = data.reduce((sum, item) => sum + item.revenue, 0)

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
            <TableHead className="text-right">想定LTV</TableHead>
            <TableHead className="text-right">ROI</TableHead>
            <TableHead className="text-center">評価</TableHead>
            <TableHead className="text-right">前年比</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((item) => (
            <TableRow key={item.channel}>
              <TableCell className="font-medium">{item.channel}</TableCell>
              <TableCell className="text-right">¥{item.cost.toLocaleString()}</TableCell>
              <TableCell className="text-right">{item.customers.toLocaleString()}人</TableCell>
              <TableCell className="text-right">¥{item.revenue.toLocaleString()}</TableCell>
              <TableCell className="text-right">¥{item.cac.toLocaleString()}</TableCell>
              <TableCell className="text-right">¥{item.ltv.toLocaleString()}</TableCell>
              <TableCell className="text-right font-medium">
                {item.roi ? `${item.roi.toLocaleString()}%` : '-'}
              </TableCell>
              <TableCell className="text-center">{getROIBadge(item.roi)}</TableCell>
              <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                  {item.trend >= 0 ? (
                    <TrendingUp className="h-4 w-4 text-green-600" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-600" />
                  )}
                  <span className={item.trend >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {item.trend >= 0 ? '+' : ''}
                    {item.trend.toFixed(1)}%
                  </span>
                </div>
              </TableCell>
            </TableRow>
          ))}
          <TableRow className="bg-gray-50 font-bold">
            <TableCell>合計</TableCell>
            <TableCell className="text-right">¥{totalCost.toLocaleString()}</TableCell>
            <TableCell className="text-right">{totalCustomers.toLocaleString()}人</TableCell>
            <TableCell className="text-right">¥{totalRevenue.toLocaleString()}</TableCell>
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
