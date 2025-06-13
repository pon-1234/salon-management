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
import { AnalyticsUseCases } from "@/lib/analytics/usecases"

interface MonthlyAreaTableProps {
  year: number
  month: number
  analyticsUseCases: AnalyticsUseCases
}

interface AreaPerformance {
  area: string
  customerCount: number
  newCustomers: number
  repeaters: number
  totalSales: number
  averagePerCustomer: number
  growthRate: number
}

export function MonthlyAreaTable({ year, month, analyticsUseCases }: MonthlyAreaTableProps) {
  const [data, setData] = useState<AreaPerformance[]>([])

  useEffect(() => {
    // ダミーデータ（実際にはuseCasesから取得）
    const dummyData: AreaPerformance[] = [
      {
        area: "渋谷区",
        customerCount: 234,
        newCustomers: 42,
        repeaters: 192,
        totalSales: 2234500,
        averagePerCustomer: 9550,
        growthRate: 8.5
      },
      {
        area: "新宿区",
        customerCount: 189,
        newCustomers: 31,
        repeaters: 158,
        totalSales: 1823400,
        averagePerCustomer: 9649,
        growthRate: 5.2
      },
      {
        area: "港区",
        customerCount: 156,
        newCustomers: 28,
        repeaters: 128,
        totalSales: 1612300,
        averagePerCustomer: 10336,
        growthRate: 12.3
      },
      {
        area: "中央区",
        customerCount: 98,
        newCustomers: 15,
        repeaters: 83,
        totalSales: 943200,
        averagePerCustomer: 9624,
        growthRate: -2.1
      },
      {
        area: "千代田区",
        customerCount: 67,
        newCustomers: 10,
        repeaters: 57,
        totalSales: 678900,
        averagePerCustomer: 10133,
        growthRate: 3.8
      },
      {
        area: "その他",
        customerCount: 148,
        newCustomers: 28,
        repeaters: 120,
        totalSales: 1345600,
        averagePerCustomer: 9092,
        growthRate: 6.7
      }
    ]
    setData(dummyData)
  }, [year, month, analyticsUseCases])

  // 合計を計算
  const totals = data.reduce(
    (acc, curr) => ({
      customerCount: acc.customerCount + curr.customerCount,
      newCustomers: acc.newCustomers + curr.newCustomers,
      repeaters: acc.repeaters + curr.repeaters,
      totalSales: acc.totalSales + curr.totalSales,
    }),
    {
      customerCount: 0,
      newCustomers: 0,
      repeaters: 0,
      totalSales: 0,
    }
  )

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>エリア</TableHead>
            <TableHead className="text-right">来客数</TableHead>
            <TableHead className="text-right">新規</TableHead>
            <TableHead className="text-right">リピート</TableHead>
            <TableHead className="text-right">売上高</TableHead>
            <TableHead className="text-right">客単価</TableHead>
            <TableHead className="text-right">構成比</TableHead>
            <TableHead className="text-right">前月比</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((area) => (
            <TableRow key={area.area}>
              <TableCell className="font-medium">{area.area}</TableCell>
              <TableCell className="text-right">{area.customerCount}人</TableCell>
              <TableCell className="text-right">{area.newCustomers}人</TableCell>
              <TableCell className="text-right">{area.repeaters}人</TableCell>
              <TableCell className="text-right">
                ¥{area.totalSales.toLocaleString()}
              </TableCell>
              <TableCell className="text-right">
                ¥{area.averagePerCustomer.toLocaleString()}
              </TableCell>
              <TableCell className="text-right">
                {((area.totalSales / totals.totalSales) * 100).toFixed(1)}%
              </TableCell>
              <TableCell className="text-right">
                <span className={area.growthRate > 0 ? "text-green-600" : "text-red-600"}>
                  {area.growthRate > 0 ? "+" : ""}{area.growthRate}%
                </span>
              </TableCell>
            </TableRow>
          ))}
          <TableRow className="font-bold bg-gray-50">
            <TableCell>合計</TableCell>
            <TableCell className="text-right">{totals.customerCount}人</TableCell>
            <TableCell className="text-right">{totals.newCustomers}人</TableCell>
            <TableCell className="text-right">{totals.repeaters}人</TableCell>
            <TableCell className="text-right">
              ¥{totals.totalSales.toLocaleString()}
            </TableCell>
            <TableCell className="text-right">
              ¥{totals.customerCount > 0 ? Math.round(totals.totalSales / totals.customerCount).toLocaleString() : 0}
            </TableCell>
            <TableCell className="text-right">100.0%</TableCell>
            <TableCell className="text-right">-</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  )
}