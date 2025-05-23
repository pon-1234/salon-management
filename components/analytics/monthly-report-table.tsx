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

interface MonthlyReportTableProps {
  year: number
  month: number
  analyticsUseCases: AnalyticsUseCases
}

export function MonthlyReportTable({ year, month, analyticsUseCases }: MonthlyReportTableProps) {
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
      staffCount: acc.staffCount + curr.staffCount,
      workingHours: acc.workingHours + curr.workingHours,
      directSales: acc.directSales + curr.directSales,
      cardSales: acc.cardSales + curr.cardSales,
      pointRewards: acc.pointRewards + curr.pointRewards,
      totalSales: acc.totalSales + curr.totalSales,
      staffSales: acc.staffSales + curr.staffSales,
      storeSales: acc.storeSales + curr.storeSales,
      cashSales: acc.cashSales + curr.cashSales,
      customerCount: acc.customerCount + curr.customerCount,
      newCustomers: acc.newCustomers + curr.newCustomers,
      repeaters: acc.repeaters + curr.repeaters,
      discounts: acc.discounts + curr.discounts,
      pointUsage: acc.pointUsage + curr.pointUsage,
    }),
    {
      staffCount: 0,
      workingHours: 0,
      directSales: 0,
      cardSales: 0,
      pointRewards: 0,
      totalSales: 0,
      staffSales: 0,
      storeSales: 0,
      cashSales: 0,
      customerCount: 0,
      newCustomers: 0,
      repeaters: 0,
      discounts: 0,
      pointUsage: 0,
    }
  )

  // 日平均を計算
  const averages = {
    staffCount: totals.staffCount / data.length,
    workingHours: totals.workingHours / data.length,
    directSales: totals.directSales / data.length,
    cardSales: totals.cardSales / data.length,
    pointRewards: totals.pointRewards / data.length,
    totalSales: totals.totalSales / data.length,
    staffSales: totals.staffSales / data.length,
    storeSales: totals.storeSales / data.length,
    cashSales: totals.cashSales / data.length,
    customerCount: totals.customerCount / data.length,
    newCustomers: totals.newCustomers / data.length,
    repeaters: totals.repeaters / data.length,
    discounts: totals.discounts / data.length,
    pointUsage: totals.pointUsage / data.length,
  }

  return (
    <div className="rounded-lg border bg-white print:border-none">
      <div>
        <Table className="min-w-[1200px]">
          <TableHeader className="bg-gray-50">
            <TableRow>
              <TableHead className="w-[100px]">日時</TableHead>
              <TableHead className="text-right">就業人数</TableHead>
              <TableHead className="text-right">就業時間</TableHead>
              <TableHead className="text-right">当次</TableHead>
              <TableHead className="text-right">ポ終</TableHead>
              <TableHead className="text-right">回転率</TableHead>
              <TableHead className="text-right">新規</TableHead>
              <TableHead className="text-right">リピート</TableHead>
              <TableHead className="text-right">▲値引き</TableHead>
              <TableHead className="text-right">▲ポイント割引</TableHead>
              <TableHead className="text-right">合計本数</TableHead>
              <TableHead className="text-right">合計売上</TableHead>
              <TableHead className="text-right">カード本数</TableHead>
              <TableHead className="text-right">カード売上</TableHead>
              <TableHead className="text-right">ネット予約</TableHead>
              <TableHead className="text-right">事業者売上</TableHead>
              <TableHead className="text-right">厚生費</TableHead>
              <TableHead className="text-right">店舗売上</TableHead>
              <TableHead className="text-right">現金売上</TableHead>
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
                <TableCell className="text-right">{row.staffCount}</TableCell>
                <TableCell className="text-right">{row.workingHours}</TableCell>
                <TableCell className="text-right">
                  {row.directSales.toLocaleString()}
                </TableCell>
                <TableCell className="text-right">
                  {row.cardSales.toLocaleString()}
                </TableCell>
                <TableCell className="text-right">
                  {row.turnoverRate.toFixed(2)}
                </TableCell>
                <TableCell className="text-right">{row.newCustomers}</TableCell>
                <TableCell className="text-right">{row.repeaters}</TableCell>
                <TableCell className="text-right">
                  {row.discounts.toLocaleString()}
                </TableCell>
                <TableCell className="text-right">
                  {row.pointUsage.toLocaleString()}
                </TableCell>
                <TableCell className="text-right">{row.customerCount}</TableCell>
                <TableCell className="text-right">
                  {row.totalSales.toLocaleString()}
                </TableCell>
                <TableCell className="text-right">0</TableCell>
                <TableCell className="text-right">0</TableCell>
                <TableCell className="text-right">0</TableCell>
                <TableCell className="text-right">
                  {row.staffSales.toLocaleString()}
                </TableCell>
                <TableCell className="text-right">
                  {row.storeSales.toLocaleString()}
                </TableCell>
                <TableCell className="text-right">
                  {row.storeSales.toLocaleString()}
                </TableCell>
                <TableCell className="text-right">
                  {row.cashSales.toLocaleString()}
                </TableCell>
              </TableRow>
            ))}
            <TableRow className="font-bold">
              <TableCell>TOTAL</TableCell>
              <TableCell className="text-right">
                {totals.staffCount.toLocaleString()}
              </TableCell>
              <TableCell className="text-right">
                {totals.workingHours.toLocaleString()}
              </TableCell>
              <TableCell className="text-right">
                {totals.directSales.toLocaleString()}
              </TableCell>
              <TableCell className="text-right">
                {totals.cardSales.toLocaleString()}
              </TableCell>
              <TableCell className="text-right">-</TableCell>
              <TableCell className="text-right">
                {totals.newCustomers.toLocaleString()}
              </TableCell>
              <TableCell className="text-right">
                {totals.repeaters.toLocaleString()}
              </TableCell>
              <TableCell className="text-right">
                {totals.discounts.toLocaleString()}
              </TableCell>
              <TableCell className="text-right">
                {totals.pointUsage.toLocaleString()}
              </TableCell>
              <TableCell className="text-right">
                {totals.customerCount.toLocaleString()}
              </TableCell>
              <TableCell className="text-right">
                {totals.totalSales.toLocaleString()}
              </TableCell>
              <TableCell className="text-right">0</TableCell>
              <TableCell className="text-right">0</TableCell>
              <TableCell className="text-right">0</TableCell>
              <TableCell className="text-right">
                {totals.staffSales.toLocaleString()}
              </TableCell>
              <TableCell className="text-right">
                {totals.storeSales.toLocaleString()}
              </TableCell>
              <TableCell className="text-right">
                {totals.storeSales.toLocaleString()}
              </TableCell>
              <TableCell className="text-right">
                {totals.cashSales.toLocaleString()}
              </TableCell>
            </TableRow>
            <TableRow className="text-sm text-gray-500">
              <TableCell>1日平均</TableCell>
              <TableCell className="text-right">
                {averages.staffCount.toFixed(1)}人/日
              </TableCell>
              <TableCell className="text-right">
                {averages.workingHours.toFixed(1)}時間/日
              </TableCell>
              <TableCell className="text-right">
                {Math.round(averages.directSales).toLocaleString()}円/日
              </TableCell>
              <TableCell className="text-right">
                {Math.round(averages.cardSales).toLocaleString()}円/日
              </TableCell>
              <TableCell className="text-right">-</TableCell>
              <TableCell className="text-right">
                {averages.newCustomers.toFixed(1)}人/日
              </TableCell>
              <TableCell className="text-right">
                {averages.repeaters.toFixed(1)}人/日
              </TableCell>
              <TableCell className="text-right">
                {Math.round(averages.discounts).toLocaleString()}円/日
              </TableCell>
              <TableCell className="text-right">
                {Math.round(averages.pointUsage).toLocaleString()}pt/日
              </TableCell>
              <TableCell className="text-right">
                {averages.customerCount.toFixed(1)}本/日
              </TableCell>
              <TableCell className="text-right">
                {Math.round(averages.totalSales).toLocaleString()}円/日
              </TableCell>
              <TableCell className="text-right">0本/日</TableCell>
              <TableCell className="text-right">0円/日</TableCell>
              <TableCell className="text-right">0件/日</TableCell>
              <TableCell className="text-right">
                {Math.round(averages.staffSales).toLocaleString()}円/日
              </TableCell>
              <TableCell className="text-right">
                {Math.round(averages.storeSales).toLocaleString()}円/日
              </TableCell>
              <TableCell className="text-right">
                {Math.round(averages.storeSales).toLocaleString()}円/日
              </TableCell>
              <TableCell className="text-right">
                {Math.round(averages.cashSales).toLocaleString()}円/日
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
