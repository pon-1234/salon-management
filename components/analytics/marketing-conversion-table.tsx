'use client'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Progress } from '@/components/ui/progress'

export interface MarketingConversionRow {
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

interface MarketingConversionTableProps {
  data: MarketingConversionRow[]
}

export function MarketingConversionTable({ data }: MarketingConversionTableProps) {
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
                    <span className="text-sm">{item.ctr.toFixed(1)}%</span>
                    <Progress value={item.ctr} className="h-2 w-16" />
                  </div>
                ) : (
                  '-'
                )}
              </TableCell>
              <TableCell className="text-center">
                <div className="flex flex-col items-center gap-1">
                  <span className="text-sm">{item.bookingRate.toFixed(1)}%</span>
                  <Progress value={item.bookingRate} className="h-2 w-16" />
                </div>
              </TableCell>
              <TableCell className="text-center">
                <div className="flex flex-col items-center gap-1">
                  <span className="text-sm font-medium text-green-600">
                    {item.conversionRate.toFixed(1)}%
                  </span>
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
