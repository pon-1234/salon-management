'use client'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { MarketingChannelData } from '@/lib/types/analytics'

interface MarketingChannelTableProps {
  data: MarketingChannelData[]
}

export function MarketingChannelTable({ data }: MarketingChannelTableProps) {

  const months = Array.from({ length: 12 }, (_, i) => i + 1)

  // Calculate totals
  const totals =
    data.length > 0
      ? data.reduce((acc, curr) => {
          if (curr.monthlySales && Array.isArray(curr.monthlySales)) {
            curr.monthlySales.forEach((sale, index) => {
              acc[index] = (acc[index] || 0) + sale
            })
          }
          return acc
        }, [] as number[])
      : []

  if (data.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center rounded-lg border text-sm text-muted-foreground">
        データがありません。
      </div>
    )
  }

  return (
    <div className="rounded-lg border bg-white print:border-none">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[200px]">営業媒体</TableHead>
            {months.map((month) => (
              <TableHead key={month} className="whitespace-nowrap text-right">
                {`${month.toString().padStart(2, '0')}月`}
              </TableHead>
            ))}
            <TableHead className="bg-gray-100 text-right">TOTAL</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((channel) => (
            <TableRow key={channel.channel}>
              <TableCell>{channel.channel}</TableCell>
              {channel.monthlySales.map((sales, index) => (
                <TableCell key={index} className="text-right text-blue-600">
                  {sales ? sales.toLocaleString() : '-'}
                </TableCell>
              ))}
              <TableCell className="bg-gray-50 text-right font-medium text-blue-600">
                {channel.total.toLocaleString()}
              </TableCell>
            </TableRow>
          ))}
          <TableRow className="bg-gray-50 font-bold">
            <TableCell>TOTAL</TableCell>
            {totals.map((total, index) => (
              <TableCell key={index} className="text-right text-blue-600">
                {total.toLocaleString()}
              </TableCell>
            ))}
            <TableCell className="text-right text-blue-600">
              {data.length > 0
                ? data.reduce((acc, curr) => acc + (curr.total || 0), 0).toLocaleString()
                : 0}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  )
}
