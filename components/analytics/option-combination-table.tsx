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

interface OptionCombinationTableProps {
  year: number
  analyticsUseCases: AnalyticsUseCases
}

interface CombinationData {
  id: string
  courseName: string
  optionName: string
  count: number
  revenue: number
  attachRate: number
  averageSpending: number
}

export function OptionCombinationTable({ year, analyticsUseCases }: OptionCombinationTableProps) {
  const [data, setData] = useState<CombinationData[]>([])

  useEffect(() => {
    // ダミーデータ（実際にはuseCasesから取得）
    const dummyData: CombinationData[] = [
      {
        id: '1',
        courseName: 'リラクゼーション90分',
        optionName: 'アロマオイル',
        count: 89,
        revenue: 267000,
        attachRate: 50.0,
        averageSpending: 15000,
      },
      {
        id: '2',
        courseName: 'リラクゼーション90分',
        optionName: 'ホットストーン',
        count: 56,
        revenue: 280000,
        attachRate: 31.5,
        averageSpending: 17000,
      },
      {
        id: '3',
        courseName: 'ボディケア60分',
        optionName: 'ヘッドマッサージ',
        count: 78,
        revenue: 156000,
        attachRate: 50.0,
        averageSpending: 10000,
      },
      {
        id: '4',
        courseName: 'フェイシャル45分',
        optionName: 'ハンドケア',
        count: 45,
        revenue: 90000,
        attachRate: 33.6,
        averageSpending: 8500,
      },
      {
        id: '5',
        courseName: 'アロマトリートメント',
        optionName: 'フットケア',
        count: 34,
        revenue: 102000,
        attachRate: 34.7,
        averageSpending: 12500,
      },
    ]
    setData(dummyData)
  }, [year, analyticsUseCases])

  const getAttachRateBadge = (rate: number) => {
    if (rate >= 50) return <Badge className="bg-green-500">高</Badge>
    if (rate >= 30) return <Badge className="bg-yellow-500">中</Badge>
    return <Badge variant="secondary">低</Badge>
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
            <TableHead className="text-right">合計単価</TableHead>
            <TableHead className="text-center">評価</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="font-medium">{item.courseName}</TableCell>
              <TableCell>{item.optionName}</TableCell>
              <TableCell className="text-right">{item.count}件</TableCell>
              <TableCell className="text-right">¥{item.revenue.toLocaleString()}</TableCell>
              <TableCell className="text-right">{item.attachRate}%</TableCell>
              <TableCell className="text-right">¥{item.averageSpending.toLocaleString()}</TableCell>
              <TableCell className="text-center">{getAttachRateBadge(item.attachRate)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
