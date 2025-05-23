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
import { AreaSalesReport } from "@/lib/types/area-sales"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from 'lucide-react'
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

interface AreaSalesTableProps {
  data: AreaSalesReport;
}

export function AreaSalesTable({ data }: AreaSalesTableProps) {
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  return (
    <div className="overflow-x-auto">
      <div className="rounded-lg border bg-white print:border-none min-w-max">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[200px]">エリア</TableHead>
              {months.map((month) => (
                <TableHead key={month} className="text-right whitespace-nowrap">
                  {`${month.toString().padStart(2, '0')}月`}
                </TableHead>
              ))}
              <TableHead className="text-right bg-gray-100">TOTAL</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.areas.map((area) => (
              <TableRow key={area.area}>
                <TableCell className={cn(
                  area.isSubtotal && "font-medium text-emerald-700"
                )}>
                  {area.area}
                </TableCell>
                {area.monthlySales.map((sales, index) => (
                  <TableCell 
                    key={index} 
                    className={cn(
                      "text-right",
                      area.isSubtotal ? "text-emerald-700" : "text-blue-600"
                    )}
                  >
                    {sales}
                  </TableCell>
                ))}
                <TableCell 
                  className={cn(
                    "text-right font-medium bg-gray-50",
                    area.isSubtotal ? "text-emerald-700" : "text-blue-600"
                  )}
                >
                  {area.total.toLocaleString()}
                </TableCell>
              </TableRow>
            ))}
            <TableRow className="font-bold">
              <TableCell>TOTAL</TableCell>
              {data.total.monthlySales.map((sales, index) => (
                <TableCell key={index} className="text-right text-blue-600">
                  {sales}
                </TableCell>
              ))}
              <TableCell className="text-right text-blue-600 bg-gray-50">
                {data.total.total.toLocaleString()}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
