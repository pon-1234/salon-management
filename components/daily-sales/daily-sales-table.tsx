'use client'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { DailySalesData } from '@/lib/types/daily-sales'

interface DailySalesTableProps {
  data: DailySalesData
}

export function DailySalesTable({ data }: DailySalesTableProps) {
  return (
    <div className="rounded-lg border bg-white">
      <Table>
        <TableHeader className="bg-gray-50">
          <TableRow>
            <TableHead className="w-[120px]">女性</TableHead>
            <TableHead>就業時間</TableHead>
            <TableHead className="text-right">現金本数</TableHead>
            <TableHead className="text-right">金額</TableHead>
            <TableHead className="text-right">カード本数</TableHead>
            <TableHead className="text-right">金額</TableHead>
            <TableHead className="text-right">合計本数</TableHead>
            <TableHead className="text-right">▲個引き</TableHead>
            <TableHead className="text-right">▲ホテル割引</TableHead>
            <TableHead className="text-right">合計金額</TableHead>
            <TableHead className="text-right">厚生費</TableHead>
            <TableHead className="text-right">女性売上</TableHead>
            <TableHead className="text-right">売上(現金)</TableHead>
            <TableHead className="text-right">売上(カード)</TableHead>
            <TableHead className="text-right">売上</TableHead>
            <TableHead className="text-right">現金残</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.staffSales.map((staff) => (
            <TableRow key={staff.staffId}>
              <TableCell className="font-medium">{staff.staffName}</TableCell>
              <TableCell>{staff.workingHours.total}</TableCell>
              <TableCell className="text-right">{staff.cashTransactions.count}</TableCell>
              <TableCell className="text-right">
                {staff.cashTransactions.amount.toLocaleString()}
              </TableCell>
              <TableCell className="text-right">{staff.cardTransactions.count}</TableCell>
              <TableCell className="text-right">
                {staff.cardTransactions.amount.toLocaleString()}
              </TableCell>
              <TableCell className="text-right">{staff.totalTransactions}</TableCell>
              <TableCell className="text-right">
                {staff.discounts.regular.toLocaleString()}
              </TableCell>
              <TableCell className="text-right">{staff.discounts.hotel.toLocaleString()}</TableCell>
              <TableCell className="text-right">{staff.totalAmount.toLocaleString()}</TableCell>
              <TableCell className="text-right">{staff.staffFee.toLocaleString()}</TableCell>
              <TableCell className="text-right">{staff.staffSales.toLocaleString()}</TableCell>
              <TableCell className="text-right">{staff.sales.cash.toLocaleString()}</TableCell>
              <TableCell className="text-right">{staff.sales.card.toLocaleString()}</TableCell>
              <TableCell className="text-right">{staff.sales.total.toLocaleString()}</TableCell>
              <TableCell className="text-right">{staff.currentBalance.toLocaleString()}</TableCell>
            </TableRow>
          ))}
          <TableRow className="bg-gray-50 font-bold">
            <TableCell>
              TOTAL
              <div className="text-sm font-normal">
                就業人数 {data.totalStaff}人
                <br />
                {data.totalWorkingHours}時間
              </div>
            </TableCell>
            <TableCell />
            <TableCell className="text-right">{data.totals.cashTransactions.count}</TableCell>
            <TableCell className="text-right">
              {data.totals.cashTransactions.amount.toLocaleString()}
            </TableCell>
            <TableCell className="text-right">{data.totals.cardTransactions.count}</TableCell>
            <TableCell className="text-right">
              {data.totals.cardTransactions.amount.toLocaleString()}
            </TableCell>
            <TableCell className="text-right">{data.totals.totalTransactions}</TableCell>
            <TableCell className="text-right">
              {data.totals.discounts.regular.toLocaleString()}
            </TableCell>
            <TableCell className="text-right">
              {data.totals.discounts.hotel.toLocaleString()}
            </TableCell>
            <TableCell className="text-right">{data.totals.totalAmount.toLocaleString()}</TableCell>
            <TableCell className="text-right">{data.totals.staffFee.toLocaleString()}</TableCell>
            <TableCell className="text-right">{data.totals.staffSales.toLocaleString()}</TableCell>
            <TableCell className="text-right">{data.totals.sales.cash.toLocaleString()}</TableCell>
            <TableCell className="text-right">{data.totals.sales.card.toLocaleString()}</TableCell>
            <TableCell className="text-right">{data.totals.sales.total.toLocaleString()}</TableCell>
            <TableCell className="text-right">
              {data.totals.currentBalance.toLocaleString()}
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  )
}
