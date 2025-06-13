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

interface AnnualStoreTableProps {
  year: number
  analyticsUseCases: AnalyticsUseCases
}

interface StoreData {
  id: string
  name: string
  location: string
  totalSales: number
  customerCount: number
  averagePerCustomer: number
  staffCount: number
  salesPerStaff: number
  growthRate: number
}

export function AnnualStoreTable({ year, analyticsUseCases }: AnnualStoreTableProps) {
  const [data, setData] = useState<StoreData[]>([])

  useEffect(() => {
    // ダミーデータ（実際にはuseCasesから取得）
    const dummyData: StoreData[] = [
      {
        id: "1",
        name: "渋谷店",
        location: "東京都渋谷区",
        totalSales: 45678900,
        customerCount: 4567,
        averagePerCustomer: 10004,
        staffCount: 8,
        salesPerStaff: 5709863,
        growthRate: 12.3
      },
      {
        id: "2",
        name: "新宿店",
        location: "東京都新宿区",
        totalSales: 38912300,
        customerCount: 4012,
        averagePerCustomer: 9700,
        staffCount: 7,
        salesPerStaff: 5558900,
        growthRate: 8.5
      },
      {
        id: "3",
        name: "横浜店",
        location: "神奈川県横浜市",
        totalSales: 17927200,
        customerCount: 2125,
        averagePerCustomer: 8437,
        staffCount: 5,
        salesPerStaff: 3585440,
        growthRate: -2.1
      }
    ]
    setData(dummyData)
  }, [year, analyticsUseCases])

  // 合計を計算
  const totals = data.reduce(
    (acc, curr) => ({
      totalSales: acc.totalSales + curr.totalSales,
      customerCount: acc.customerCount + curr.customerCount,
      staffCount: acc.staffCount + curr.staffCount,
    }),
    {
      totalSales: 0,
      customerCount: 0,
      staffCount: 0,
    }
  )

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>店舗名</TableHead>
            <TableHead>所在地</TableHead>
            <TableHead className="text-right">売上高</TableHead>
            <TableHead className="text-right">来客数</TableHead>
            <TableHead className="text-right">客単価</TableHead>
            <TableHead className="text-right">スタッフ数</TableHead>
            <TableHead className="text-right">人当たり売上</TableHead>
            <TableHead className="text-right">前年比</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((store) => (
            <TableRow key={store.id}>
              <TableCell className="font-medium">{store.name}</TableCell>
              <TableCell>{store.location}</TableCell>
              <TableCell className="text-right">
                ¥{store.totalSales.toLocaleString()}
              </TableCell>
              <TableCell className="text-right">
                {store.customerCount.toLocaleString()}人
              </TableCell>
              <TableCell className="text-right">
                ¥{store.averagePerCustomer.toLocaleString()}
              </TableCell>
              <TableCell className="text-right">
                {store.staffCount}人
              </TableCell>
              <TableCell className="text-right">
                ¥{store.salesPerStaff.toLocaleString()}
              </TableCell>
              <TableCell className="text-right">
                <span className={store.growthRate > 0 ? "text-green-600" : "text-red-600"}>
                  {store.growthRate > 0 ? "+" : ""}{store.growthRate}%
                </span>
              </TableCell>
            </TableRow>
          ))}
          <TableRow className="font-bold bg-gray-50">
            <TableCell colSpan={2}>全店舗合計</TableCell>
            <TableCell className="text-right">
              ¥{totals.totalSales.toLocaleString()}
            </TableCell>
            <TableCell className="text-right">
              {totals.customerCount.toLocaleString()}人
            </TableCell>
            <TableCell className="text-right">
              ¥{totals.customerCount > 0 ? Math.round(totals.totalSales / totals.customerCount).toLocaleString() : 0}
            </TableCell>
            <TableCell className="text-right">
              {totals.staffCount}人
            </TableCell>
            <TableCell className="text-right">
              ¥{totals.staffCount > 0 ? Math.round(totals.totalSales / totals.staffCount).toLocaleString() : 0}
            </TableCell>
            <TableCell className="text-right">-</TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  )
}