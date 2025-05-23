"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Printer } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { DistrictSalesTable } from "@/components/analytics/district-sales-table"
import { generateDistrictSalesData } from "@/lib/district-sales/data"

export default function DistrictSalesPage() {
  const [selectedYear, setSelectedYear] = useState(2024)
  const [selectedArea, setSelectedArea] = useState("東京都")
  
  const currentYear = new Date().getFullYear()
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i)
  const areas = ["東京都", "神奈川県", "埼玉県", "千葉県"]

  const handlePrint = () => {
    window.print()
  }

  const data = generateDistrictSalesData(selectedYear, selectedArea)

  return (
    <div className="space-y-4 w-full">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold">売上げ集計（区別）</h1>
          <div className="flex gap-2">
            <Select
              value={selectedYear.toString()}
              onValueChange={(value) => setSelectedYear(parseInt(value))}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}年
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={selectedArea}
              onValueChange={setSelectedArea}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {areas.map((area) => (
                  <SelectItem key={area} value={area}>
                    {area}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button onClick={handlePrint} className="print:hidden bg-emerald-600 hover:bg-emerald-700 text-white">
          <Printer className="mr-2 h-4 w-4" />
          印刷する
        </Button>
      </div>
      <div className="overflow-x-auto">
        <DistrictSalesTable data={data} />
      </div>
    </div>
  )
}
