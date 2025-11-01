'use client'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { DistrictSalesReport } from '@/lib/types/district-sales'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'

interface DistrictSalesTableProps {
  data: DistrictSalesReport
}

export function DistrictSalesTable({ data }: DistrictSalesTableProps) {
  const months = Array.from({ length: 12 }, (_, i) => i + 1)

  if (!data || data.districts.length === 0) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>データがありません</AlertTitle>
        <AlertDescription>表示する地区データがありません。</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="overflow-x-auto">
      <div className="min-w-max rounded-lg border bg-white print:border-none">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[300px]">地区</TableHead>
              {months.map((month) => (
                <TableHead key={month} className="whitespace-nowrap text-right">
                  {`${month.toString().padStart(2, '0')}月`}
                </TableHead>
              ))}
              <TableHead className="bg-gray-100 text-right">TOTAL</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.districts.map((district) => (
              <TableRow key={`${district.district}-${district.code}`}>
                <TableCell>
                  {district.district} ({district.code})
                </TableCell>
                {district.monthlySales.map((sales, index) => (
                  <TableCell key={index} className="text-right text-blue-600">
                    {sales ? `¥${sales.toLocaleString()}` : '-'}
                  </TableCell>
                ))}
                <TableCell className="bg-gray-50 text-right font-medium text-blue-600">
                  ¥{district.total.toLocaleString()}
                </TableCell>
              </TableRow>
            ))}
            <TableRow className="font-bold">
              <TableCell>TOTAL</TableCell>
              {data.total.monthlySales.map((sales, index) => (
                <TableCell key={index} className="text-right text-blue-600">
                  ¥{sales.toLocaleString()}
                </TableCell>
              ))}
              <TableCell className="bg-gray-50 text-right text-blue-600">
                ¥{data.total.total.toLocaleString()}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
