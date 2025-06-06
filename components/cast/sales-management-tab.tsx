"use client"

import React, { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar, DollarSign, MapPin, User, Plus, Edit } from 'lucide-react'
import { SalesRecord } from "@/lib/cast/types"
import { getSalesRecordsByCast } from "@/lib/cast/sales-data"
import { format } from "date-fns"
import { ja } from "date-fns/locale"

interface SalesManagementTabProps {
  castId: string
  castName: string
}

export function SalesManagementTab({ castId, castName }: SalesManagementTabProps) {
  const [salesRecords, setSalesRecords] = useState<SalesRecord[]>(getSalesRecordsByCast(castId))
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [selectedRecord, setSelectedRecord] = useState<SalesRecord | null>(null)

  const handleAddSales = (newRecord: Partial<SalesRecord>) => {
    const record: SalesRecord = {
      id: `sales_${Date.now()}`,
      castId,
      date: new Date(newRecord.date!),
      serviceName: newRecord.serviceName!,
      customerName: newRecord.customerName!,
      serviceAmount: newRecord.serviceAmount!,
      designationFee: newRecord.designationFee || 0,
      optionFees: newRecord.optionFees || 0,
      totalAmount: (newRecord.serviceAmount || 0) + (newRecord.designationFee || 0) + (newRecord.optionFees || 0),
      castShare: Math.floor(((newRecord.serviceAmount || 0) + (newRecord.designationFee || 0) + (newRecord.optionFees || 0)) * 0.6),
      shopShare: Math.floor(((newRecord.serviceAmount || 0) + (newRecord.designationFee || 0) + (newRecord.optionFees || 0)) * 0.4),
      paymentStatus: "未精算",
      location: newRecord.location!,
      notes: newRecord.notes
    }
    setSalesRecords([record, ...salesRecords])
    setIsAddDialogOpen(false)
  }

  const handleStatusChange = (recordId: string, status: "未精算" | "精算済み") => {
    setSalesRecords(salesRecords.map(record => 
      record.id === recordId ? { ...record, paymentStatus: status } : record
    ))
  }

  const totalUnpaid = salesRecords
    .filter(record => record.paymentStatus === "未精算")
    .reduce((sum, record) => sum + record.castShare, 0)

  const totalSales = salesRecords.reduce((sum, record) => sum + record.totalAmount, 0)

  return (
    <div className="space-y-6">
      {/* サマリーカード */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <DollarSign className="w-4 h-4 text-green-600" />
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
              <User className="w-4 h-4 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">取り分合計</p>
                <p className="text-2xl font-bold">¥{salesRecords.reduce((sum, record) => sum + record.castShare, 0).toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-orange-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">未精算額</p>
                <p className="text-2xl font-bold text-orange-600">¥{totalUnpaid.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 売上記録テーブル */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>売上記録</CardTitle>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  売上追加
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>新規売上記録</DialogTitle>
                </DialogHeader>
                <SalesRecordForm onSubmit={handleAddSales} />
              </DialogContent>
            </Dialog>
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
                <TableHead>取り分</TableHead>
                <TableHead>状態</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {salesRecords.map((record) => (
                <TableRow key={record.id}>
                  <TableCell>
                    <div className="text-sm">
                      <div>{format(record.date, "M/d(E)", { locale: ja })}</div>
                      <div className="text-gray-500">{format(record.date, "HH:mm")}</div>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{record.customerName}</TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div>{record.serviceName}</div>
                      {record.optionFees > 0 && (
                        <div className="text-gray-500">オプション: ¥{record.optionFees.toLocaleString()}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center text-sm">
                      <MapPin className="w-3 h-3 mr-1 text-gray-400" />
                      {record.location}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      <div className="font-medium">¥{record.totalAmount.toLocaleString()}</div>
                      <div className="text-gray-500 text-xs">
                        サービス: ¥{record.serviceAmount.toLocaleString()}
                        {record.designationFee > 0 && ` + 指名: ¥${record.designationFee.toLocaleString()}`}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">¥{record.castShare.toLocaleString()}</TableCell>
                  <TableCell>
                    <Select 
                      value={record.paymentStatus} 
                      onValueChange={(value: "未精算" | "精算済み") => handleStatusChange(record.id, value)}
                    >
                      <SelectTrigger className="w-28">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="未精算">
                          <Badge variant="destructive" className="text-xs">未精算</Badge>
                        </SelectItem>
                        <SelectItem value="精算済み">
                          <Badge variant="secondary" className="text-xs">精算済み</Badge>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setSelectedRecord(record)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
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

interface SalesRecordFormProps {
  onSubmit: (data: Partial<SalesRecord>) => void
  initialData?: Partial<SalesRecord>
}

function SalesRecordForm({ onSubmit, initialData }: SalesRecordFormProps) {
  const [formData, setFormData] = useState({
    date: initialData?.date ? format(initialData.date, "yyyy-MM-dd") : format(new Date(), "yyyy-MM-dd"),
    time: initialData?.date ? format(initialData.date, "HH:mm") : "14:00",
    customerName: initialData?.customerName || "",
    serviceName: initialData?.serviceName || "",
    serviceAmount: initialData?.serviceAmount || 0,
    designationFee: initialData?.designationFee || 0,
    optionFees: initialData?.optionFees || 0,
    location: initialData?.location || "",
    notes: initialData?.notes || ""
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const dateTime = new Date(`${formData.date}T${formData.time}`)
    onSubmit({
      ...formData,
      date: dateTime,
      serviceAmount: Number(formData.serviceAmount),
      designationFee: Number(formData.designationFee),
      optionFees: Number(formData.optionFees)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="date">日付</Label>
          <Input
            id="date"
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            required
          />
        </div>
        <div>
          <Label htmlFor="time">時間</Label>
          <Input
            id="time"
            type="time"
            value={formData.time}
            onChange={(e) => setFormData({ ...formData, time: e.target.value })}
            required
          />
        </div>
      </div>

      <div>
        <Label htmlFor="customerName">顧客名</Label>
        <Input
          id="customerName"
          value={formData.customerName}
          onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
          required
        />
      </div>

      <div>
        <Label htmlFor="serviceName">サービス名</Label>
        <Select value={formData.serviceName} onValueChange={(value) => setFormData({ ...formData, serviceName: value })}>
          <SelectTrigger>
            <SelectValue placeholder="サービスを選択" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="リラクゼーション60分">リラクゼーション60分</SelectItem>
            <SelectItem value="スタンダード90分">スタンダード90分</SelectItem>
            <SelectItem value="スタンダード120分">スタンダード120分</SelectItem>
            <SelectItem value="プレミアム90分">プレミアム90分</SelectItem>
            <SelectItem value="プレミアム150分">プレミアム150分</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label htmlFor="serviceAmount">サービス料金</Label>
          <Input
            id="serviceAmount"
            type="number"
            value={formData.serviceAmount}
            onChange={(e) => setFormData({ ...formData, serviceAmount: Number(e.target.value) })}
            required
          />
        </div>
        <div>
          <Label htmlFor="designationFee">指名料</Label>
          <Input
            id="designationFee"
            type="number"
            value={formData.designationFee}
            onChange={(e) => setFormData({ ...formData, designationFee: Number(e.target.value) })}
          />
        </div>
        <div>
          <Label htmlFor="optionFees">オプション料金</Label>
          <Input
            id="optionFees"
            type="number"
            value={formData.optionFees}
            onChange={(e) => setFormData({ ...formData, optionFees: Number(e.target.value) })}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="location">施術場所</Label>
        <Input
          id="location"
          value={formData.location}
          onChange={(e) => setFormData({ ...formData, location: e.target.value })}
          placeholder="例: 六本木ヒルズ"
          required
        />
      </div>

      <div>
        <Label htmlFor="notes">備考</Label>
        <Textarea
          id="notes"
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          placeholder="特記事項があれば入力してください"
        />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="submit">保存</Button>
      </div>
    </form>
  )
}