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
import { cn } from '@/lib/utils'

interface DistrictHeatmapTableProps {
  area: string
  year: number
}

interface HeatmapData {
  district: string
  monthlyRevenue: number[]
}

export function DistrictHeatmapTable({ area, year }: DistrictHeatmapTableProps) {
  const [data, setData] = useState<HeatmapData[]>([])

  useEffect(() => {
    // ダミーデータ（実際にはAPIから取得）
    const districts =
      area === '東京都'
        ? ['渋谷区', '新宿区', '港区', '中央区', '千代田区', '品川区', '目黒区', '世田谷区']
        : ['横浜市', '川崎市', '相模原市', '藤沢市', '鎌倉市', '茅ヶ崎市']

    const dummyData: HeatmapData[] = districts.map((district) => ({
      district,
      monthlyRevenue: Array.from(
        { length: 12 },
        () => Math.floor(Math.random() * 2000000) + 500000
      ),
    }))
    setData(dummyData)
  }, [area, year])

  const months = [
    '1月',
    '2月',
    '3月',
    '4月',
    '5月',
    '6月',
    '7月',
    '8月',
    '9月',
    '10月',
    '11月',
    '12月',
  ]

  // 最大値を取得（色の濃さを計算するため）
  const maxRevenue = Math.max(...data.flatMap((d) => d.monthlyRevenue))

  // 売上高に基づいて背景色の濃さを計算
  const getCellColor = (revenue: number) => {
    const intensity = (revenue / maxRevenue) * 100
    if (intensity >= 80) return 'bg-green-600 text-white'
    if (intensity >= 60) return 'bg-green-500 text-white'
    if (intensity >= 40) return 'bg-green-400'
    if (intensity >= 20) return 'bg-green-300'
    return 'bg-green-200'
  }

  return (
    <div>
      <p className="mb-4 text-sm text-gray-600">
        売上高の高さを色の濃さで表現しています。濃い緑色ほど売上が高いことを示します。
      </p>
      <div className="overflow-x-auto rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[150px]">地区</TableHead>
              {months.map((month) => (
                <TableHead key={month} className="min-w-[80px] text-center">
                  {month}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((district) => (
              <TableRow key={district.district}>
                <TableCell className="font-medium">{district.district}</TableCell>
                {district.monthlyRevenue.map((revenue, index) => (
                  <TableCell
                    key={index}
                    className={cn('text-center text-xs', getCellColor(revenue))}
                  >
                    {(revenue / 1000000).toFixed(1)}M
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
