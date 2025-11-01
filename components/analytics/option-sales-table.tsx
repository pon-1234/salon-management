'use client'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { OptionSalesData } from '@/lib/types/analytics'

interface OptionSalesTableProps {
  data: OptionSalesData[]
}

export function OptionSalesTable({ data }: OptionSalesTableProps) {
  const months = Array.from({ length: 12 }, (_, i) => i + 1)

  const calculateTotal = (sales: number[]) => sales.reduce((sum, count) => sum + count, 0)

  if (data.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center rounded-lg border text-sm text-muted-foreground">
        データがありません。
      </div>
    )
  }

  return (
    <div className="rounded-lg border bg-white print:border-none">
      <Table className="min-w-[1200px]">
        <TableHeader className="bg-gray-50">
          <TableRow>
            <TableHead className="w-[200px]">オプション</TableHead>
            <TableHead className="w-[100px]">価格</TableHead>
            {months.map((month) => (
              <TableHead key={month} className="whitespace-nowrap text-right">
                {`${month.toString().padStart(2, '0')}月`}
              </TableHead>
            ))}
            <TableHead className="bg-gray-100 text-right">TOTAL</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data
            .map((option) => ({
              ...option,
              total: calculateTotal(option.monthlySales),
            }))
            .filter((option) => option.total > 0)
            .map((option) => (
              <TableRow key={option.id}>
                <TableCell className="font-medium">{option.name}</TableCell>
                <TableCell>{option.price > 0 ? `${option.price.toLocaleString()}円` : '無料'}</TableCell>
                {option.monthlySales.map((count, index) => (
                  <TableCell key={index} className="text-right">
                    {count || ''}
                  </TableCell>
                ))}
                <TableCell className="text-right font-medium text-blue-600">
                  {option.total.toLocaleString()}
                </TableCell>
              </TableRow>
            ))}
        </TableBody>
      </Table>
    </div>
  )
}
