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
import Link from "next/link"
import { AnalyticsUseCases } from "@/lib/analytics/usecases"
import { StaffPerformanceData } from "@/lib/types/analytics"

interface StaffPerformanceTableProps {
  analyticsUseCases: AnalyticsUseCases
}

export function StaffPerformanceTable({ analyticsUseCases }: StaffPerformanceTableProps) {
  const [data, setData] = useState<StaffPerformanceData[]>([])

  useEffect(() => {
    const fetchData = async () => {
      const result = await analyticsUseCases.getStaffPerformance()
      setData(result)
    }
    fetchData()
  }, [analyticsUseCases])

  const totals = data.reduce(
    (acc, curr) => ({
      workingStaff: acc.workingStaff + 1,
      totalHours: acc.totalHours + parseInt(curr.workDays.split('/')[1]),
      cashTransactions: {
        count: acc.cashTransactions.count + curr.cashTransactions.count,
        amount: acc.cashTransactions.amount + curr.cashTransactions.amount,
      },
      cardTransactions: {
        count: acc.cardTransactions.count + curr.cardTransactions.count,
        amount: acc.cardTransactions.amount + curr.cardTransactions.amount,
      },
      totalTransactions: acc.totalTransactions + curr.totalTransactions,
      newCustomers: {
        free: acc.newCustomers.free + curr.newCustomers.free,
        paid: acc.newCustomers.paid + curr.newCustomers.paid,
      },
      designations: {
        regular: acc.designations.regular + curr.designations.regular,
        total: acc.designations.total + curr.designations.total,
      },
      discount: acc.discount + curr.discount,
      totalAmount: acc.totalAmount + curr.totalAmount,
      staffFee: acc.staffFee + curr.staffFee,
      staffRevenue: acc.staffRevenue + curr.staffRevenue,
      storeRevenue: acc.storeRevenue + curr.storeRevenue,
    }),
    {
      workingStaff: 0,
      totalHours: 0,
      cashTransactions: { count: 0, amount: 0 },
      cardTransactions: { count: 0, amount: 0 },
      totalTransactions: 0,
      newCustomers: { free: 0, paid: 0 },
      designations: { regular: 0, total: 0 },
      discount: 0,
      totalAmount: 0,
      staffFee: 0,
      staffRevenue: 0,
      storeRevenue: 0,
    }
  )

  totals.designations.rate = Math.round((totals.designations.regular / totals.designations.total) * 100)

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="whitespace-nowrap">女性</TableHead>
          <TableHead className="whitespace-nowrap">就業日数/時間</TableHead>
          <TableHead className="text-right whitespace-nowrap">現金本数</TableHead>
          <TableHead className="text-right whitespace-nowrap">金額</TableHead>
          <TableHead className="text-right whitespace-nowrap">カード本数</TableHead>
          <TableHead className="text-right whitespace-nowrap">金額</TableHead>
          <TableHead className="text-right whitespace-nowrap">合計本数</TableHead>
          <TableHead className="text-right whitespace-nowrap">新規(フリー)</TableHead>
          <TableHead className="text-right whitespace-nowrap">新規(バネル)</TableHead>
          <TableHead className="text-right whitespace-nowrap">本指名</TableHead>
          <TableHead className="text-right whitespace-nowrap">指名合計</TableHead>
          <TableHead className="text-right whitespace-nowrap">指名率</TableHead>
          <TableHead className="text-right whitespace-nowrap">値引き</TableHead>
          <TableHead className="text-right whitespace-nowrap">合計金額</TableHead>
          <TableHead className="text-right whitespace-nowrap">厚生費</TableHead>
          <TableHead className="text-right whitespace-nowrap">女性売上</TableHead>
          <TableHead className="text-right whitespace-nowrap">店舗売上</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((row) => (
          <TableRow key={row.id}>
            <TableCell className="font-medium">
              <div>
                <Link href={`/staff/${row.id}`} className="text-blue-600 hover:underline">
                  {row.name}
                </Link>
                <span className="text-gray-500">({row.age}歳)</span>
              </div>
              <div className="text-xs text-gray-500">{row.id}</div>
            </TableCell>
            <TableCell>{row.workDays}</TableCell>
            <TableCell className="text-right">{row.cashTransactions.count}</TableCell>
            <TableCell className="text-right">{row.cashTransactions.amount.toLocaleString()}</TableCell>
            <TableCell className="text-right">{row.cardTransactions.count}</TableCell>
            <TableCell className="text-right">{row.cardTransactions.amount.toLocaleString()}</TableCell>
            <TableCell className="text-right">{row.totalTransactions}</TableCell>
            <TableCell className="text-right">{row.newCustomers.free}</TableCell>
            <TableCell className="text-right">{row.newCustomers.paid}</TableCell>
            <TableCell className="text-right">{row.designations.regular}</TableCell>
            <TableCell className="text-right">{row.designations.total}</TableCell>
            <TableCell className="text-right">{row.designations.rate}%</TableCell>
            <TableCell className="text-right">{row.discount.toLocaleString()}</TableCell>
            <TableCell className="text-right">{row.totalAmount.toLocaleString()}</TableCell>
            <TableCell className="text-right">{row.staffFee.toLocaleString()}</TableCell>
            <TableCell className="text-right">{row.staffRevenue.toLocaleString()}</TableCell>
            <TableCell className="text-right">{row.storeRevenue.toLocaleString()}</TableCell>
          </TableRow>
        ))}
        <TableRow className="font-bold">
          <TableCell>
            <div>TOTAL</div>
            <div className="text-sm">
              就業人数 {totals.workingStaff}人
              <br />
              {totals.totalHours}時間
            </div>
          </TableCell>
          <TableCell></TableCell>
          <TableCell className="text-right">{totals.cashTransactions.count}</TableCell>
          <TableCell className="text-right">{totals.cashTransactions.amount.toLocaleString()}</TableCell>
          <TableCell className="text-right">{totals.cardTransactions.count}</TableCell>
          <TableCell className="text-right">{totals.cardTransactions.amount.toLocaleString()}</TableCell>
          <TableCell className="text-right">{totals.totalTransactions}</TableCell>
          <TableCell className="text-right">{totals.newCustomers.free}</TableCell>
          <TableCell className="text-right">{totals.newCustomers.paid}</TableCell>
          <TableCell className="text-right">{totals.designations.regular}</TableCell>
          <TableCell className="text-right">{totals.designations.total}</TableCell>
          <TableCell className="text-right">{totals.designations.rate}%</TableCell>
          <TableCell className="text-right">{totals.discount.toLocaleString()}</TableCell>
          <TableCell className="text-right">{totals.totalAmount.toLocaleString()}</TableCell>
          <TableCell className="text-right">{totals.staffFee.toLocaleString()}</TableCell>
          <TableCell className="text-right">{totals.staffRevenue.toLocaleString()}</TableCell>
          <TableCell className="text-right">{totals.storeRevenue.toLocaleString()}</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  )
}
