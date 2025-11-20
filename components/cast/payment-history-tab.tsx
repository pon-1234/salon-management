'use client'

import { useState } from 'react'
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
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
import { Calendar, CreditCard, User, Plus, Eye, Receipt } from 'lucide-react'
import { PaymentRecord, SalesRecord } from '@/lib/cast/types'
import { getPaymentRecordsByCast, getSalesRecordsByCast } from '@/lib/cast/sales-data'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'

interface PaymentHistoryTabProps {
  castId: string
  castName: string
}

export function PaymentHistoryTab({ castId, castName }: PaymentHistoryTabProps) {
  const [paymentRecords, setPaymentRecords] = useState<PaymentRecord[]>(
    getPaymentRecordsByCast(castId)
  )
  const [salesRecords] = useState<SalesRecord[]>(getSalesRecordsByCast(castId))
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [selectedPayment, setSelectedPayment] = useState<PaymentRecord | null>(null)

  const handleAddPayment = (newRecord: Partial<PaymentRecord>) => {
    const record: PaymentRecord = {
      id: `payment_${Date.now()}`,
      castId,
      date: new Date(newRecord.date!),
      paymentType: newRecord.paymentType!,
      amount: newRecord.amount!,
      salesRecordIds: newRecord.salesRecordIds || [],
      handledBy: newRecord.handledBy!,
      notes: newRecord.notes,
    }
    setPaymentRecords([record, ...paymentRecords])
    setIsAddDialogOpen(false)
  }

  const totalPaid = paymentRecords.reduce((sum, record) => sum + record.amount, 0)

  const getPaymentTypeColor = (type: string) => {
    switch (type) {
      case '現金精算':
        return 'bg-green-100 text-green-700'
      case '振込':
        return 'bg-blue-100 text-blue-700'
      case 'その他':
        return 'bg-gray-100 text-gray-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  return (
    <div className="space-y-6">
      {/* サマリーカード */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CreditCard className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">総支払額</p>
                <p className="text-2xl font-bold">¥{totalPaid.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Receipt className="h-4 w-4 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">支払回数</p>
                <p className="text-2xl font-bold">{paymentRecords.length}回</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Calendar className="h-4 w-4 text-purple-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">最終支払日</p>
                <p className="text-lg font-bold">
                  {paymentRecords.length > 0
                    ? format(Math.max(...paymentRecords.map((r) => r.date.getTime())), 'M/d(E)', {
                        locale: ja,
                      })
                    : '未支払'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 入金記録テーブル */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>入金履歴</CardTitle>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  入金記録追加
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>新規入金記録</DialogTitle>
                </DialogHeader>
                <PaymentRecordForm
                  onSubmit={handleAddPayment}
                  salesRecords={salesRecords.filter((r) => r.paymentStatus === '未精算')}
                />
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>支払日</TableHead>
                <TableHead>支払方法</TableHead>
                <TableHead>金額</TableHead>
                <TableHead>処理者</TableHead>
                <TableHead>対象売上</TableHead>
                <TableHead>備考</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paymentRecords.map((record) => (
                <TableRow key={record.id}>
                  <TableCell>
                    <div className="text-sm">
                      <div>{format(record.date, 'yyyy/M/d(E)', { locale: ja })}</div>
                      <div className="text-gray-500">{format(record.date, 'HH:mm')}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getPaymentTypeColor(record.paymentType)}>
                      {record.paymentType}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-lg font-medium">
                    ¥{record.amount.toLocaleString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center text-sm">
                      <User className="mr-1 h-3 w-3 text-gray-400" />
                      {record.handledBy}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {record.salesRecordIds.length}件の売上
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-32 truncate text-sm text-gray-600">
                    {record.notes || '-'}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" onClick={() => setSelectedPayment(record)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {paymentRecords.length === 0 && (
            <div className="py-8 text-center text-gray-500">入金記録がありません</div>
          )}
        </CardContent>
      </Card>

      {/* 詳細表示ダイアログ */}
      {selectedPayment && (
        <Dialog open={!!selectedPayment} onOpenChange={() => setSelectedPayment(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>入金記録詳細</DialogTitle>
            </DialogHeader>
            <PaymentDetailView payment={selectedPayment} salesRecords={salesRecords} />
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

interface PaymentRecordFormProps {
  onSubmit: (data: Partial<PaymentRecord>) => void
  salesRecords: SalesRecord[]
  initialData?: Partial<PaymentRecord>
}

function PaymentRecordForm({ onSubmit, salesRecords, initialData }: PaymentRecordFormProps) {
  const [formData, setFormData] = useState({
    date: initialData?.date
      ? format(initialData.date, 'yyyy-MM-dd')
      : format(new Date(), 'yyyy-MM-dd'),
    time: initialData?.date ? format(initialData.date, 'HH:mm') : '10:00',
    paymentType: initialData?.paymentType || '現金精算',
    amount: initialData?.amount || 0,
    handledBy: initialData?.handledBy || '',
    salesRecordIds: initialData?.salesRecordIds || [],
    notes: initialData?.notes || '',
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const dateTime = new Date(`${formData.date}T${formData.time}`)
    onSubmit({
      ...formData,
      date: dateTime,
      amount: Number(formData.amount),
    })
  }

  const selectedSalesTotal = salesRecords
    .filter((record) => formData.salesRecordIds.includes(record.id))
    .reduce((sum, record) => sum + record.castShare, 0)

  const handleSalesRecordToggle = (recordId: string) => {
    setFormData({
      ...formData,
      salesRecordIds: formData.salesRecordIds.includes(recordId)
        ? formData.salesRecordIds.filter((id) => id !== recordId)
        : [...formData.salesRecordIds, recordId],
      amount: formData.salesRecordIds.includes(recordId)
        ? formData.amount - (salesRecords.find((r) => r.id === recordId)?.castShare || 0)
        : formData.amount + (salesRecords.find((r) => r.id === recordId)?.castShare || 0),
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="date">支払日</Label>
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

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="paymentType">支払方法</Label>
          <Select
            value={formData.paymentType}
            onValueChange={(value) =>
              setFormData({ ...formData, paymentType: value as '現金精算' | '振込' | 'その他' })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="現金精算">現金精算</SelectItem>
              <SelectItem value="振込">振込</SelectItem>
              <SelectItem value="その他">その他</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="handledBy">処理者</Label>
          <Input
            id="handledBy"
            value={formData.handledBy}
            onChange={(e) => setFormData({ ...formData, handledBy: e.target.value })}
            placeholder="例: 管理者"
            required
          />
        </div>
      </div>

      <div>
        <Label htmlFor="amount">支払金額</Label>
        <Input
          id="amount"
          type="number"
          value={formData.amount}
          onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
          required
        />
        {selectedSalesTotal > 0 && (
          <p className="mt-1 text-sm text-gray-600">
            選択された売上のキャスト売上合計: ¥{selectedSalesTotal.toLocaleString()}
          </p>
        )}
      </div>

      {salesRecords.length > 0 && (
        <div>
          <Label>対象売上記録</Label>
          <div className="mt-2 max-h-40 overflow-y-auto rounded-md border p-2">
            {salesRecords.map((record) => (
              <label key={record.id} className="flex items-center space-x-2 p-2 hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={formData.salesRecordIds.includes(record.id)}
                  onChange={() => handleSalesRecordToggle(record.id)}
                />
                <div className="flex-1 text-sm">
                  <div className="font-medium">
                    {format(record.date, 'M/d', { locale: ja })} {record.customerName} -{' '}
                    {record.serviceName}
                  </div>
                  <div className="text-gray-500">キャスト売上: ¥{record.castShare.toLocaleString()}</div>
                </div>
              </label>
            ))}
          </div>
        </div>
      )}

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

interface PaymentDetailViewProps {
  payment: PaymentRecord
  salesRecords: SalesRecord[]
}

function PaymentDetailView({ payment, salesRecords }: PaymentDetailViewProps) {
  const targetSales = salesRecords.filter((record) => payment.salesRecordIds.includes(record.id))

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>支払日時</Label>
          <p className="font-medium">
            {format(payment.date, 'yyyy年M月d日(E) HH:mm', { locale: ja })}
          </p>
        </div>
        <div>
          <Label>支払方法</Label>
          <Badge className="mt-1">{payment.paymentType}</Badge>
        </div>
        <div>
          <Label>支払金額</Label>
          <p className="text-2xl font-bold">¥{payment.amount.toLocaleString()}</p>
        </div>
        <div>
          <Label>処理者</Label>
          <p className="font-medium">{payment.handledBy}</p>
        </div>
      </div>

      {payment.notes && (
        <div>
          <Label>備考</Label>
          <p className="mt-1 text-sm text-gray-600">{payment.notes}</p>
        </div>
      )}

      {targetSales.length > 0 && (
        <div>
          <Label>対象売上記録 ({targetSales.length}件)</Label>
          <div className="mt-2 space-y-2">
            {targetSales.map((record) => (
              <div key={record.id} className="rounded-lg border bg-gray-50 p-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-medium">
                      {record.customerName} - {record.serviceName}
                    </div>
                    <div className="text-sm text-gray-600">
                      {format(record.date, 'M/d(E) HH:mm', { locale: ja })} @ {record.location}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">¥{record.castShare.toLocaleString()}</div>
                    <div className="text-sm text-gray-500">キャスト売上</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
