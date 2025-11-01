'use client'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'
import { DistrictSalesData } from '@/lib/types/district-sales'

interface DistrictHeatmapTableProps {
  data: DistrictSalesData[]
}

export function DistrictHeatmapTable({ data }: DistrictHeatmapTableProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-gray-500">データがありません</div>
    )
  }

  const months = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']
  const maxRevenue = Math.max(...data.flatMap((district) => district.monthlySales))

  const getCellColor = (revenue: number) => {
    if (maxRevenue === 0) return 'bg-emerald-100'
    const intensity = (revenue / maxRevenue) * 100
    if (intensity >= 80) return 'bg-emerald-600 text-white'
    if (intensity >= 60) return 'bg-emerald-500 text-white'
    if (intensity >= 40) return 'bg-emerald-400 text-white'
    if (intensity >= 20) return 'bg-emerald-300'
    return 'bg-emerald-200'
  }

  return (
    <div>
      <p className="mb-4 text-sm text-gray-600">
        売上高の高さを色の濃さで表現しています。濃い緑色ほど売上が高いことを示します。
      </p>
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[150px]">地区</TableHead>
              {months.map((month) => (
                <TableHead key={month} className="min-w-[80px] text-center">
                  {month}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((district) => (
              <TableRow key={district.district}>
                <TableCell className="font-medium">{district.district}</TableCell>
                {district.monthlySales.map((revenue, index) => (
                  <TableCell
                    key={index}
                    className={cn('text-center text-xs font-semibold', getCellColor(revenue))}
                  >
                    {(revenue / 1_000_000).toFixed(1)}M
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
