'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Calendar, DollarSign, MapPin, User } from 'lucide-react'
import { SalesRecord } from '@/lib/cast/types'
import { getSalesRecordsByCast } from '@/lib/cast/sales-data'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'

interface SalesManagementTabProps {
  castId: string
  castName: string
}

export function SalesManagementTab({ castId, castName }: SalesManagementTabProps) {
  const [salesRecords, setSalesRecords] = useState<SalesRecord[]>(getSalesRecordsByCast(castId))

  const totalUnpaid = salesRecords
    .filter((record) => record.paymentStatus === '未精算')
    .reduce((sum, record) => sum + record.castShare, 0)

  const totalSales = salesRecords.reduce((sum, record) => sum + record.totalAmount, 0)

  return (
    <div className="space-y-6">
      {/* サマリーカード */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">総売上</p>
                <p className="text-2xl font-bold">¥{totalSales.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <User className="h-4 w-4 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">キャスト売上合計</p>
                <p className="text-2xl font-bold">
                  ¥
                  {salesRecords.reduce((sum, record) => sum + record.castShare, 0).toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-orange-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">未精算額</p>
                <p className="text-2xl font-bold text-orange-600">
                  ¥{totalUnpaid.toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 売上記録テーブル */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>売上記録</CardTitle>
            <Badge variant="secondary" className="text-xs">
              予約から自動集計（手動追加なし）
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>日時</TableHead>
                <TableHead>顧客名</TableHead>
                <TableHead>サービス</TableHead>
                <TableHead>場所</TableHead>
                <TableHead>金額</TableHead>
                <TableHead>キャスト売上</TableHead>
                <TableHead>状態</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {salesRecords.map((record) => (
                <TableRow key={record.id}>
                  <TableCell>
                    <div className="text-sm">
                      <div>{format(record.date, 'M/d(E)', { locale: ja })}</div>
                      <div className="text-gray-500">{format(record.date, 'HH:mm')}</div>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{record.customerName}</TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>{record.serviceName}</div>
                      {record.optionFees > 0 && (
                        <div className="text-gray-500">
                          オプション: ¥{record.optionFees.toLocaleString()}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center text-sm">
                      <MapPin className="mr-1 h-3 w-3 text-gray-400" />
                      {record.location}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div className="font-medium">¥{record.totalAmount.toLocaleString()}</div>
                      <div className="text-xs text-gray-500">
                        サービス: ¥{record.serviceAmount.toLocaleString()}
                        {record.designationFee > 0 &&
                          ` + 指名: ¥${record.designationFee.toLocaleString()}`}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">
                    ¥{record.castShare.toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={record.paymentStatus === '精算済み' ? 'secondary' : 'destructive'}
                      className="text-xs"
                    >
                      {record.paymentStatus}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
