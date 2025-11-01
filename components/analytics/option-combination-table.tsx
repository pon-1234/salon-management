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
import { OptionCombinationData } from '@/lib/types/analytics'

interface OptionCombinationTableProps {
  data: OptionCombinationData[]
}

export function OptionCombinationTable({ data }: OptionCombinationTableProps) {
  const getAttachRateBadge = (rate: number) => {
    if (rate >= 50) return <Badge className="bg-green-500">高</Badge>
    if (rate >= 30) return <Badge className="bg-yellow-500">中</Badge>
    return <Badge variant="secondary">低</Badge>
  }

  if (data.length === 0) {
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
            <TableHead>コース名</TableHead>
            <TableHead>オプション名</TableHead>
            <TableHead className="text-right">販売数</TableHead>
            <TableHead className="text-right">売上額</TableHead>
            <TableHead className="text-right">装着率</TableHead>
            <TableHead className="text-right">平均客単価</TableHead>
            <TableHead className="text-center">評価</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((item) => (
            <TableRow key={`${item.courseId}:${item.optionId}`}>
              <TableCell className="font-medium">{item.courseName}</TableCell>
              <TableCell>{item.optionName}</TableCell>
              <TableCell className="text-right">{item.count.toLocaleString()}件</TableCell>
              <TableCell className="text-right">¥{item.revenue.toLocaleString()}</TableCell>
              <TableCell className="text-right">{item.attachRate.toFixed(1)}%</TableCell>
              <TableCell className="text-right">¥{item.averageSpending.toLocaleString()}</TableCell>
              <TableCell className="text-center">{getAttachRateBadge(item.attachRate)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
