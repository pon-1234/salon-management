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
import { MonthlyData } from '@/lib/types/analytics'

interface AnnualReportTableProps {
  year: number
  analyticsUseCases: AnalyticsUseCases
}

export function AnnualReportTable({ year, analyticsUseCases }: AnnualReportTableProps) {
  const [data, setData] = useState<MonthlyData[]>([])

  useEffect(() => {
    const fetchData = async () => {
      const result = await analyticsUseCases.getMonthlyReport(year)
      setData(result)
    }
    fetchData()
  }, [year, analyticsUseCases])

  // 合計を計算
  const totals = data.reduce(
    (acc, curr) => ({
      staffCount: acc.staffCount + curr.staffCount,
      workingDays: acc.workingDays + curr.workingDays,
      workingHours: acc.workingHours + curr.workingHours,
      cashSales: acc.cashSales + curr.cashSales,
      cardCount: acc.cardCount + curr.cardCount,
      cardSales: acc.cardSales + curr.cardSales,
      tokyoCount: acc.tokyoCount + curr.tokyoCount,
      kanagawaCount: acc.kanagawaCount + curr.kanagawaCount,
      totalCount: acc.totalCount + curr.totalCount,
      totalSales: acc.totalSales + curr.totalSales,
      discounts: acc.discounts + curr.discounts,
      pointRewards: acc.pointRewards + curr.pointRewards,
      totalRevenue: acc.totalRevenue + curr.totalRevenue,
      outsourcingCost: acc.outsourcingCost + curr.outsourcingCost,
      welfareCost: acc.welfareCost + curr.welfareCost,
      newCustomerCount: acc.newCustomerCount + curr.newCustomerCount,
      repeatCustomerCount: acc.repeatCustomerCount + curr.repeatCustomerCount,
      storeSales: acc.storeSales + curr.storeSales,
    }),
    {
      staffCount: 0,
      workingDays: 0,
      workingHours: 0,
      cashSales: 0,
      cardCount: 0,
      cardSales: 0,
      tokyoCount: 0,
      kanagawaCount: 0,
      totalCount: 0,
      totalSales: 0,
      discounts: 0,
      pointRewards: 0,
      totalRevenue: 0,
      outsourcingCost: 0,
      welfareCost: 0,
      newCustomerCount: 0,
      repeatCustomerCount: 0,
      storeSales: 0,
    }
  )

  // 月平均を計算
  const averages = {
    staffCount: totals.staffCount / 12,
    workingDays: totals.workingDays / 12,
    workingHours: totals.workingHours / 12,
    cashSales: totals.cashSales / 12,
    cardCount: totals.cardCount / 12,
    cardSales: totals.cardSales / 12,
    tokyoCount: totals.tokyoCount / 12,
    kanagawaCount: totals.kanagawaCount / 12,
    totalCount: totals.totalCount / 12,
    totalSales: totals.totalSales / 12,
    discounts: totals.discounts / 12,
    pointRewards: totals.pointRewards / 12,
    totalRevenue: totals.totalRevenue / 12,
    outsourcingCost: totals.outsourcingCost / 12,
    welfareCost: totals.welfareCost / 12,
    newCustomerCount: totals.newCustomerCount / 12,
    repeatCustomerCount: totals.repeatCustomerCount / 12,
    storeSales: totals.storeSales / 12,
  }

  return (
    <div className="rounded-lg border bg-white print:border-none">
      <div>
        <Table className="min-w-[1200px]">
          <TableHeader className="bg-gray-50">
            <TableRow>
              <TableHead>月</TableHead>
              <TableHead className="text-right">在籍数</TableHead>
              <TableHead className="text-right">就業数/日</TableHead>
              <TableHead className="text-right">就業時間</TableHead>
              <TableHead className="text-right">現金売上</TableHead>
              <TableHead className="text-right">カード本数</TableHead>
              <TableHead className="text-right">カード売上</TableHead>
              <TableHead className="text-right">回転率</TableHead>
              <TableHead className="text-right">東京</TableHead>
              <TableHead className="text-right">神奈川</TableHead>
              <TableHead className="text-right">合計本数</TableHead>
              <TableHead className="text-right">合計売上</TableHead>
              <TableHead className="text-right">単価/1本</TableHead>
              <TableHead className="text-right">▲値引き</TableHead>
              <TableHead className="text-right">▲ポイント割引</TableHead>
              <TableHead className="text-right">外注費</TableHead>
              <TableHead className="text-right">厚生費</TableHead>
              <TableHead className="text-right">新規本数</TableHead>
              <TableHead className="text-right">リピート本数</TableHead>
              <TableHead className="text-right">店舗売上</TableHead>
              <TableHead className="text-right">前月比</TableHead>
              <TableHead className="text-right">店舗売上/月</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row) => (
              <TableRow key={row.month}>
                <TableCell>{row.month}月</TableCell>
                <TableCell className="text-right">{row.staffCount}</TableCell>
                <TableCell className="text-right">{row.workingDays}</TableCell>
                <TableCell className="text-right">{row.workingHours}</TableCell>
                <TableCell className="text-right">{row.cashSales.toLocaleString()}</TableCell>
                <TableCell className="text-right">{row.cardCount}</TableCell>
                <TableCell className="text-right">{row.cardSales.toLocaleString()}</TableCell>
                <TableCell className="text-right">
                  {typeof row.turnoverRate === 'number' ? row.turnoverRate.toFixed(2) : '-'}
                </TableCell>
                <TableCell className="text-right">{row.tokyoCount}</TableCell>
                <TableCell className="text-right">{row.kanagawaCount}</TableCell>
                <TableCell className="text-right">{row.totalCount}</TableCell>
                <TableCell className="text-right">{row.totalSales.toLocaleString()}</TableCell>
                <TableCell className="text-right">
                  {row.salesPerCustomer.toLocaleString()}
                </TableCell>
                <TableCell className="text-right">{row.discounts.toLocaleString()}</TableCell>
                <TableCell className="text-right">{row.pointRewards.toLocaleString()}</TableCell>
                <TableCell className="text-right">{row.outsourcingCost.toLocaleString()}</TableCell>
                <TableCell className="text-right">{row.welfareCost.toLocaleString()}</TableCell>
                <TableCell className="text-right">{row.newCustomerCount}</TableCell>
                <TableCell className="text-right">{row.repeatCustomerCount}</TableCell>
                <TableCell className="text-right">{row.storeSales.toLocaleString()}</TableCell>
                <TableCell className="text-right">
                  {(row.previousYearRatio * 100).toFixed(0)}%
                </TableCell>
                <TableCell className="text-right">
                  {(row.storeSalesRatio * 100).toFixed(0)}%
                </TableCell>
              </TableRow>
            ))}
            <TableRow className="font-bold">
              <TableCell>合計</TableCell>
              <TableCell className="text-right">{totals.staffCount.toLocaleString()}</TableCell>
              <TableCell className="text-right">{totals.workingDays.toLocaleString()}</TableCell>
              <TableCell className="text-right">{totals.workingHours.toLocaleString()}</TableCell>
              <TableCell className="text-right">{totals.cashSales.toLocaleString()}</TableCell>
              <TableCell className="text-right">{totals.cardCount.toLocaleString()}</TableCell>
              <TableCell className="text-right">{totals.cardSales.toLocaleString()}</TableCell>
              <TableCell className="text-right">-</TableCell>
              <TableCell className="text-right">{totals.tokyoCount.toLocaleString()}</TableCell>
              <TableCell className="text-right">{totals.kanagawaCount.toLocaleString()}</TableCell>
              <TableCell className="text-right">{totals.totalCount.toLocaleString()}</TableCell>
              <TableCell className="text-right">{totals.totalSales.toLocaleString()}</TableCell>
              <TableCell className="text-right">-</TableCell>
              <TableCell className="text-right">{totals.discounts.toLocaleString()}</TableCell>
              <TableCell className="text-right">{totals.pointRewards.toLocaleString()}</TableCell>
              <TableCell className="text-right">
                {totals.outsourcingCost.toLocaleString()}
              </TableCell>
              <TableCell className="text-right">{totals.welfareCost.toLocaleString()}</TableCell>
              <TableCell className="text-right">
                {totals.newCustomerCount.toLocaleString()}
              </TableCell>
              <TableCell className="text-right">
                {totals.repeatCustomerCount.toLocaleString()}
              </TableCell>
              <TableCell className="text-right">{totals.storeSales.toLocaleString()}</TableCell>
              <TableCell className="text-right">-</TableCell>
              <TableCell className="text-right">-</TableCell>
            </TableRow>
            <TableRow className="text-sm text-gray-500">
              <TableCell>月平均</TableCell>
              <TableCell className="text-right">{averages.staffCount.toFixed(1)}</TableCell>
              <TableCell className="text-right">{averages.workingDays.toFixed(1)}</TableCell>
              <TableCell className="text-right">{averages.workingHours.toFixed(1)}</TableCell>
              <TableCell className="text-right">
                {Math.round(averages.cashSales).toLocaleString()}
              </TableCell>
              <TableCell className="text-right">{averages.cardCount.toFixed(1)}</TableCell>
              <TableCell className="text-right">
                {Math.round(averages.cardSales).toLocaleString()}
              </TableCell>
              <TableCell className="text-right">-</TableCell>
              <TableCell className="text-right">{averages.tokyoCount.toFixed(1)}</TableCell>
              <TableCell className="text-right">{averages.kanagawaCount.toFixed(1)}</TableCell>
              <TableCell className="text-right">{averages.totalCount.toFixed(1)}</TableCell>
              <TableCell className="text-right">
                {Math.round(averages.totalSales).toLocaleString()}
              </TableCell>
              <TableCell className="text-right">-</TableCell>
              <TableCell className="text-right">
                {Math.round(averages.discounts).toLocaleString()}
              </TableCell>
              <TableCell className="text-right">
                {Math.round(averages.pointRewards).toLocaleString()}
              </TableCell>
              <TableCell className="text-right">
                {Math.round(averages.outsourcingCost).toLocaleString()}
              </TableCell>
              <TableCell className="text-right">
                {Math.round(averages.welfareCost).toLocaleString()}
              </TableCell>
              <TableCell className="text-right">{averages.newCustomerCount.toFixed(1)}</TableCell>
              <TableCell className="text-right">
                {averages.repeatCustomerCount.toFixed(1)}
              </TableCell>
              <TableCell className="text-right">
                {Math.round(averages.storeSales).toLocaleString()}
              </TableCell>
              <TableCell className="text-right">-</TableCell>
              <TableCell className="text-right">-</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
