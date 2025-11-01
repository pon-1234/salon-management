'use client'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { AreaSalesData } from '@/lib/types/area-sales'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AreaSalesTableProps {
  data: AreaSalesData[]
}

export function AreaSalesTable({ data }: AreaSalesTableProps) {
  const months = Array.from({ length: 12 }, (_, i) => i + 1)

  // Null/array check
  if (!data || !Array.isArray(data) || data.length === 0) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>データがありません</AlertTitle>
        <AlertDescription>表示するデータがありません。</AlertDescription>
      </Alert>
    )
  }

  // Calculate totals
  const totalMonthlySales = Array.from({ length: 12 }, (_, i) =>
    data.reduce((sum, area) => sum + (area.monthlySales[i] || 0), 0)
  )
  const grandTotal = totalMonthlySales.reduce((sum, sales) => sum + sales, 0)

  return (
    <div className="overflow-x-auto">
      <div className="min-w-max rounded-lg border bg-white print:border-none">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[200px]">エリア</TableHead>
              {months.map((month) => (
                <TableHead key={month} className="whitespace-nowrap text-right">
                  {`${month.toString().padStart(2, '0')}月`}
                </TableHead>
              ))}
              <TableHead className="bg-gray-100 text-right">TOTAL</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((area) => (
              <TableRow key={area.area}>
                <TableCell className={cn(area.isSubtotal && 'font-medium text-emerald-700')}>
                  {area.area}
                </TableCell>
                {area.monthlySales.map((sales, index) => (
                  <TableCell
                    key={index}
                    className={cn(
                      'text-right',
                      area.isSubtotal ? 'text-emerald-700' : 'text-blue-600'
                    )}
                  >
                    {sales.toLocaleString()}
                  </TableCell>
                ))}
                <TableCell
                  className={cn(
                    'bg-gray-50 text-right font-medium',
                    area.isSubtotal ? 'text-emerald-700' : 'text-blue-600'
                  )}
                >
                  {area.total.toLocaleString()}
                </TableCell>
              </TableRow>
            ))}
            <TableRow className="font-bold">
              <TableCell>TOTAL</TableCell>
              {totalMonthlySales.map((sales, index) => (
                <TableCell key={index} className="text-right text-blue-600">
                  {sales.toLocaleString()}
                </TableCell>
              ))}
              <TableCell className="bg-gray-50 text-right text-blue-600">
                {grandTotal.toLocaleString()}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
