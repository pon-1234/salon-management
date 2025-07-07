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
import { MarketingChannelData } from '@/lib/types/analytics'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { AlertCircle } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'

interface MarketingChannelTableProps {
  year: number
  analyticsUseCases: AnalyticsUseCases
}

export function MarketingChannelTable({ year, analyticsUseCases }: MarketingChannelTableProps) {
  const [data, setData] = useState<MarketingChannelData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const result = await analyticsUseCases.getMarketingChannelReport(year)
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
                  {sales || '-'}
                </TableCell>
              ))}
              <TableCell className="bg-gray-50 text-right font-medium text-blue-600">
                {channel.total}
              </TableCell>
            </TableRow>
          ))}
          <TableRow className="bg-gray-50 font-bold">
            <TableCell>TOTAL</TableCell>
            {totals.map((total, index) => (
              <TableCell key={index} className="text-right text-blue-600">
                {total}
              </TableCell>
            ))}
            <TableCell className="text-right text-blue-600">
              {data.length > 0 ? data.reduce((acc, curr) => acc + (curr.total || 0), 0) : 0}
            </TableCell>
          </TableRow>
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
