"use client"

import { useEffect, useState } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { AnalyticsUseCases } from "@/lib/analytics/usecases"
import { DailyData } from "@/lib/types/analytics"

interface MonthlySalesTableProps {
  year: number
  month: number
  analyticsUseCases: AnalyticsUseCases
}

export function MonthlySalesTable({ year, month, analyticsUseCases }: MonthlySalesTableProps) {
  const [data, setData] = useState<DailyData[]>([])

  useEffect(() => {
    const fetchData = async () => {
      const result = await analyticsUseCases.getDailyReport(year, month)
      setData(result)
    }
    fetchData()
  }, [year, month, analyticsUseCases])

  // 合計を計算
  const totals = data.reduce(
    (acc, curr) => ({
      customerCount: acc.customerCount + curr.customerCount,
      directSales: acc.directSales + curr.directSales,
      cardSales: acc.cardSales + curr.cardSales,
      totalSales: acc.totalSales + curr.totalSales,
      cashSales: acc.cashSales + curr.cashSales,
      newCustomers: acc.newCustomers + curr.newCustomers,
      repeaters: acc.repeaters + curr.repeaters,
      discounts: acc.discounts + curr.discounts,
      pointUsage: acc.pointUsage + curr.pointUsage,
    }),
    {
      customerCount: 0,
      directSales: 0,
      cardSales: 0,
      totalSales: 0,
      cashSales: 0,
      newCustomers: 0,
      repeaters: 0,
      discounts: 0,
      pointUsage: 0,
    }
  )

  // 日平均を計算
  const averages = {
    customerCount: totals.customerCount / data.length,
    directSales: totals.directSales / data.length,
    cardSales: totals.cardSales / data.length,
    totalSales: totals.totalSales / data.length,
    cashSales: totals.cashSales / data.length,
    newCustomers: totals.newCustomers / data.length,
    repeaters: totals.repeaters / data.length,
    discounts: totals.discounts / data.length,
    pointUsage: totals.pointUsage / data.length,
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">日付</TableHead>
            <TableHead className="text-right">来客数</TableHead>
            <TableHead className="text-right">新規</TableHead>
            <TableHead className="text-right">リピート</TableHead>
            <TableHead className="text-right">売上高</TableHead>
            <TableHead className="text-right">現金売上</TableHead>
            <TableHead className="text-right">カード売上</TableHead>
            <TableHead className="text-right">値引き</TableHead>
            <TableHead className="text-right">ポイント</TableHead>
            <TableHead className="text-right">客単価</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row) => (
            <TableRow
              key={row.date}
              className={cn(
                row.dayOfWeek === "日" && "bg-red-50",
                row.dayOfWeek === "土" && "bg-blue-50"
              )}
            >
              <TableCell>
                {row.date}({row.dayOfWeek})
              </TableCell>
              <TableCell className="text-right">{row.customerCount}</TableCell>
              <TableCell className="text-right">{row.newCustomers}</TableCell>
              <TableCell className="text-right">{row.repeaters}</TableCell>
              <TableCell className="text-right">
                ¥{row.totalSales.toLocaleString()}
              </TableCell>
              <TableCell className="text-right">
                ¥{row.cashSales.toLocaleString()}
              </TableCell>
              <TableCell className="text-right">
                ¥{row.cardSales.toLocaleString()}
              </TableCell>
              <TableCell className="text-right text-red-600">
                -¥{row.discounts.toLocaleString()}
              </TableCell>
              <TableCell className="text-right text-red-600">
                -{row.pointUsage.toLocaleString()}pt
              </TableCell>
              <TableCell className="text-right">
                ¥{row.customerCount > 0 ? Math.round(row.totalSales / row.customerCount).toLocaleString() : 0}
              </TableCell>
            </TableRow>
          ))}
          <TableRow className="font-bold bg-gray-50">
            <TableCell>合計</TableCell>
            <TableCell className="text-right">
              {totals.customerCount.toLocaleString()}
            </TableCell>
            <TableCell className="text-right">
              {totals.newCustomers.toLocaleString()}
            </TableCell>
            <TableCell className="text-right">
              {totals.repeaters.toLocaleString()}
            </TableCell>
            <TableCell className="text-right">
              ¥{totals.totalSales.toLocaleString()}
            </TableCell>
            <TableCell className="text-right">
              ¥{totals.cashSales.toLocaleString()}
            </TableCell>
            <TableCell className="text-right">
              ¥{totals.cardSales.toLocaleString()}
            </TableCell>
            <TableCell className="text-right text-red-600">
              -¥{totals.discounts.toLocaleString()}
            </TableCell>
            <TableCell className="text-right text-red-600">
              -{totals.pointUsage.toLocaleString()}pt
            </TableCell>
            <TableCell className="text-right">
              ¥{totals.customerCount > 0 ? Math.round(totals.totalSales / totals.customerCount).toLocaleString() : 0}
            </TableCell>
          </TableRow>
          <TableRow className="text-sm text-gray-500">
            <TableCell>日平均</TableCell>
            <TableCell className="text-right">
              {averages.customerCount.toFixed(1)}人
            </TableCell>
            <TableCell className="text-right">
              {averages.newCustomers.toFixed(1)}人
            </TableCell>
            <TableCell className="text-right">
              {averages.repeaters.toFixed(1)}人
            </TableCell>
            <TableCell className="text-right">
              ¥{Math.round(averages.totalSales).toLocaleString()}
            </TableCell>
            <TableCell className="text-right">
              ¥{Math.round(averages.cashSales).toLocaleString()}
            </TableCell>
            <TableCell className="text-right">
              ¥{Math.round(averages.cardSales).toLocaleString()}
            </TableCell>
            <TableCell className="text-right text-red-600">
              -¥{Math.round(averages.discounts).toLocaleString()}
            </TableCell>
            <TableCell className="text-right text-red-600">
              -{Math.round(averages.pointUsage).toLocaleString()}pt
            </TableCell>
            <TableCell className="text-right">
              ¥{averages.customerCount > 0 ? Math.round(averages.totalSales / averages.customerCount).toLocaleString() : 0}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  )
}