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
import { AnalyticsUseCases } from '@/lib/analytics/usecases'
import { OptionSalesData } from '@/lib/types/analytics'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

interface OptionSalesTableProps {
  year: number
  analyticsUseCases: AnalyticsUseCases
}

export function OptionSalesTable({ year, analyticsUseCases }: OptionSalesTableProps) {
  const [data, setData] = useState<OptionSalesData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const result = await analyticsUseCases.getOptionSalesReport(year)
        setData(result)
      } catch (err) {
        setError('データの取得中にエラーが発生しました。')
        console.error(err)
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [year, analyticsUseCases])

  const months = Array.from({ length: 12 }, (_, i) => i + 1)

  const calculateTotal = (sales: number[]) => {
    return sales.reduce((sum, count) => sum + count, 0)
  }

  if (isLoading) {
    return <TableSkeleton />
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>エラー</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
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
          {data.map((option) => {
            const total = calculateTotal(option.monthlySales)
            if (total === 0) return null // 合計が0の行は表示しない

            return (
              <TableRow key={option.id}>
                <TableCell className="font-medium">{option.name}</TableCell>
                <TableCell>
                  {option.price > 0 ? `${option.price.toLocaleString()}円` : '無料'}
                </TableCell>
                {option.monthlySales.map((count, index) => (
                  <TableCell key={index} className="text-right">
                    {count || ''}
                  </TableCell>
                ))}
                <TableCell className="text-right font-medium text-blue-600">{total}</TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}

function TableSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
    </div>
  )
}
