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
import { Progress } from '@/components/ui/progress'
import { AnalyticsUseCases } from '@/lib/analytics/usecases'

interface MarketingConversionTableProps {
  year: number
  analyticsUseCases: AnalyticsUseCases
}

interface ConversionData {
  channel: string
  impressions: number
  clicks: number
  visits: number
  bookings: number
  customers: number
  ctr: number
  visitRate: number
  bookingRate: number
  conversionRate: number
}

export function MarketingConversionTable({
  year,
  analyticsUseCases,
}: MarketingConversionTableProps) {
  const [data, setData] = useState<ConversionData[]>([])

  useEffect(() => {
    // ダミーデータ（実際にはuseCasesから取得）
    const dummyData: ConversionData[] = [
      {
        channel: 'ホットペッパー',
        impressions: 125000,
        clicks: 15625,
        visits: 12500,
        bookings: 4688,
        customers: 3945,
        ctr: 12.5,
        visitRate: 80.0,
        bookingRate: 37.5,
        conversionRate: 31.6,
      },
      {
        channel: 'Instagram',
        impressions: 85000,
        clicks: 8500,
        visits: 6800,
        bookings: 3060,
        customers: 2456,
        ctr: 10.0,
        visitRate: 80.0,
        bookingRate: 45.0,
        conversionRate: 28.9,
      },
      {
        channel: 'Google広告',
        impressions: 68000,
        clicks: 5440,
        visits: 4352,
        bookings: 2176,
        customers: 1678,
        ctr: 8.0,
        visitRate: 80.0,
        bookingRate: 50.0,
        conversionRate: 24.7,
      },
      {
        channel: '紹介',
        impressions: 0,
        clicks: 0,
        visits: 2864,
        bookings: 1718,
        customers: 1432,
        ctr: 0,
        visitRate: 0,
        bookingRate: 60.0,
        conversionRate: 50.0,
      },
      {
        channel: 'ウォークイン',
        impressions: 0,
        clicks: 0,
        visits: 1705,
        bookings: 1279,
        customers: 1023,
        ctr: 0,
        visitRate: 0,
        bookingRate: 75.0,
        conversionRate: 60.0,
      },
    ]
    setData(dummyData)
  }, [year, analyticsUseCases])

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>チャネル</TableHead>
            <TableHead className="text-right">インプレッション</TableHead>
            <TableHead className="text-right">クリック</TableHead>
            <TableHead className="text-right">訪問</TableHead>
            <TableHead className="text-right">予約</TableHead>
            <TableHead className="text-right">成約</TableHead>
            <TableHead className="text-center">CTR</TableHead>
            <TableHead className="text-center">予約率</TableHead>
            <TableHead className="text-center">成約率</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((item) => (
            <TableRow key={item.channel}>
              <TableCell className="font-medium">{item.channel}</TableCell>
              <TableCell className="text-right">
                {item.impressions > 0 ? item.impressions.toLocaleString() : '-'}
              </TableCell>
              <TableCell className="text-right">
                {item.clicks > 0 ? item.clicks.toLocaleString() : '-'}
              </TableCell>
              <TableCell className="text-right">{item.visits.toLocaleString()}</TableCell>
              <TableCell className="text-right">{item.bookings.toLocaleString()}</TableCell>
              <TableCell className="text-right font-medium">
                {item.customers.toLocaleString()}
              </TableCell>
              <TableCell className="text-center">
                {item.ctr > 0 ? (
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-sm">{item.ctr}%</span>
                    <Progress value={item.ctr} className="h-2 w-16" />
                  </div>
                ) : (
                  '-'
                )}
              </TableCell>
              <TableCell className="text-center">
                <div className="flex flex-col items-center gap-1">
                  <span className="text-sm">{item.bookingRate}%</span>
                  <Progress value={item.bookingRate} className="h-2 w-16" />
                </div>
              </TableCell>
              <TableCell className="text-center">
                <div className="flex flex-col items-center gap-1">
                  <span className="text-sm font-medium text-green-600">{item.conversionRate}%</span>
                  <Progress value={item.conversionRate} className="h-2 w-16" />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
