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
import { DistrictSalesReport } from "@/lib/types/district-sales"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from 'lucide-react'
import { Skeleton } from "@/components/ui/skeleton"

interface DistrictSalesTableProps {
  data: DistrictSalesReport;
}

export function DistrictSalesTable({ data }: DistrictSalesTableProps) {
  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  return (
    <div className="overflow-x-auto">
      <div className="rounded-lg border bg-white print:border-none min-w-max">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[300px]">地区</TableHead>
              {months.map((month) => (
                <TableHead key={month} className="text-right whitespace-nowrap">
                  {`${month.toString().padStart(2, '0')}月`}
                </TableHead>
              ))}
              <TableHead className="text-right bg-gray-100">TOTAL</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.districts.map((district, index) => (
              <TableRow key={`${district.district}-${district.code}-${index}`}>
                <TableCell>
                  {district.district} ({district.code})
                </TableCell>
                {district.monthlySales.map((sales, index) => (
                  <TableCell key={index} className="text-right text-blue-600">
                    {sales || "-"}
                  </TableCell>
                ))}
                <TableCell className="text-right font-medium text-blue-600 bg-gray-50">
                  {district.total}
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
                {data.total.total}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
