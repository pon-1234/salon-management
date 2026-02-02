'use client'

import { useEffect, useMemo, useState } from 'react'
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
import { CastSettlementRecordDetail, CastSettlementsData, SettlementPaymentDto } from '@/lib/cast-portal/types'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'

interface PaymentHistoryTabProps {
  castId: string
  storeId: string
}

export function PaymentHistoryTab({ castId, storeId }: PaymentHistoryTabProps) {
  const [paymentRecords, setPaymentRecords] = useState<SettlementPaymentDto[]>([])
  const [pendingReservations, setPendingReservations] = useState<CastSettlementRecordDetail[]>([])
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [selectedPayment, setSelectedPayment] = useState<SettlementPaymentDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPayments = async () => {
    try {
      setError(null)
      const params = new URLSearchParams({ castId, storeId })
      const res = await fetch(`/api/admin/cast/settlements/payments?${params.toString()}`)
      if (!res.ok) {
        throw new Error('入金記録の取得に失敗しました')
      }
      const data = (await res.json()) as SettlementPaymentDto[]
      setPaymentRecords(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : '通信エラー')
    } finally {
      setLoading(false)
    }
  }

  const fetchPendingReservations = async () => {
    try {
      const res = await fetch(`/api/admin/cast/settlements?castId=${encodeURIComponent(castId)}`, {
        cache: 'no-store',
      })
      if (!res.ok) throw new Error('精算情報の取得に失敗しました')
      const data = (await res.json()) as CastSettlementsData
      const pending = data.days.flatMap((d) =>
        d.records.filter((r) => r.settlementStatus !== 'settled')
      )
      setPendingReservations(pending)
    } catch (e) {
      setError(e instanceof Error ? e.message : '精算情報の取得に失敗しました')
    }
  }

  useEffect(() => {
    fetchPayments()
    fetchPendingReservations()
  }, [])

  const handleAddPayment = async (payload: Partial<SettlementPaymentDto>) => {
    try {
      const res = await fetch('/api/admin/cast/settlements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          castId,
          storeId,
          amount: payload.amount,
          method: payload.method,
          handledBy: payload.handledBy,
          paidAt: payload.paidAt,
          notes: payload.notes,
          reservationIds: payload.reservations?.map((r) => r.id) ?? [],
        }),
      })
      if (!res.ok) throw new Error('入金記録の保存に失敗しました')
      await fetchPayments()
      await fetchPendingReservations()
      setIsAddDialogOpen(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : '保存に失敗しました')
    }
  }

  const totalPaid = paymentRecords.reduce((sum, record) => sum + record.amount, 0)

  const lastPaidAt = useMemo(() => {
    if (paymentRecords.length === 0) return null
    return new Date(
      Math.max(...paymentRecords.map((r) => new Date(r.paidAt).getTime()))
    )
  }, [paymentRecords])

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

  if (loading) {
    return <div className="p-4 text-sm text-muted-foreground">入金記録を読み込み中...</div>
  }

  if (error) {
    return <div className="p-4 text-sm text-destructive">{error}</div>
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
                  {lastPaidAt ? format(lastPaidAt, 'M/d(E)', { locale: ja }) : '未支払'}
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
                <PaymentRecordForm onSubmit={handleAddPayment} reservations={pendingReservations} />
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
                <TableHead>対象予約</TableHead>
                <TableHead>備考</TableHead>
                <TableHead>操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paymentRecords.map((record) => (
                <TableRow key={record.id}>
                  <TableCell>
                    <div className="text-sm">
                      <div>{format(new Date(record.paidAt), 'yyyy/M/d(E)', { locale: ja })}</div>
                      <div className="text-gray-500">{format(new Date(record.paidAt), 'HH:mm')}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getPaymentTypeColor(record.method)}>
                      {record.method}
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
                      {record.reservations.length}件の予約
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
            <PaymentDetailView payment={selectedPayment} />
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}

interface PaymentRecordFormProps {
  onSubmit: (data: Partial<SettlementPaymentDto>) => void
  reservations: CastSettlementRecordDetail[]
  initialData?: Partial<SettlementPaymentDto>
}

function PaymentRecordForm({ onSubmit, reservations, initialData }: PaymentRecordFormProps) {
  const [formData, setFormData] = useState({
    date: initialData?.paidAt
      ? format(new Date(initialData.paidAt), 'yyyy-MM-dd')
      : format(new Date(), 'yyyy-MM-dd'),
    time: initialData?.paidAt ? format(new Date(initialData.paidAt), 'HH:mm') : '10:00',
    paymentType: (initialData as any)?.method || '現金精算',
    amount: initialData?.amount || 0,
    reservationIds: (initialData as any)?.reservations?.map((r: any) => r.id) || [],
    handledBy: initialData?.handledBy || '',
    notes: initialData?.notes || '',
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const dateTime = new Date(`${formData.date}T${formData.time}`)
    onSubmit({
      amount: Number(formData.amount),
      method: formData.paymentType,
      handledBy: formData.handledBy,
      paidAt: dateTime.toISOString(),
      reservations: formData.reservationIds.map((id) => ({ id } as any)),
      notes: formData.notes,
    })
  }

  const selectedSalesTotal = reservations
    .filter((record) => formData.reservationIds.includes(record.id))
    .reduce((sum, record) => sum + record.staffRevenue, 0)

  const handleReservationToggle = (recordId: string) => {
    setFormData({
      ...formData,
      reservationIds: formData.reservationIds.includes(recordId)
        ? formData.reservationIds.filter((id) => id !== recordId)
        : [...formData.reservationIds, recordId],
      amount: formData.reservationIds.includes(recordId)
        ? formData.amount - (reservations.find((r) => r.id === recordId)?.staffRevenue || 0)
        : formData.amount + (reservations.find((r) => r.id === recordId)?.staffRevenue || 0),
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
            onValueChange={(value) => setFormData({ ...formData, paymentType: value })}
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

      {reservations.length > 0 && (
        <div>
          <Label>対象予約</Label>
          <div className="mt-2 max-h-40 overflow-y-auto rounded-md border p-2">
            {reservations.map((record) => (
              <label key={record.id} className="flex items-center space-x-2 p-2 hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={formData.reservationIds.includes(record.id)}
                  onChange={() => handleReservationToggle(record.id)}
                />
                <div className="flex-1 text-sm">
                  <div className="font-medium">
                    {format(new Date(record.startTime), 'M/d(E) HH:mm', { locale: ja })}{' '}
                    {record.courseName ?? 'コース未設定'}
                  </div>
                  <div className="text-gray-500">
                    キャスト売上: ¥{record.staffRevenue.toLocaleString()} / 状態:{' '}
                    {record.settlementStatus === 'settled' ? '精算済み' : '未精算'}
                  </div>
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
  payment: SettlementPaymentDto
}

function PaymentDetailView({ payment }: PaymentDetailViewProps) {
  const targets = payment.reservations || []

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>支払日時</Label>
          <p className="font-medium">
            {format(new Date(payment.paidAt), 'yyyy年M月d日(E) HH:mm', { locale: ja })}
          </p>
        </div>
        <div>
          <Label>支払方法</Label>
          <Badge className="mt-1">{payment.method}</Badge>
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

      {targets.length > 0 && (
        <div>
          <Label>対象予約 ({targets.length}件)</Label>
          <div className="mt-2 space-y-2">
            {targets.map((record) => (
              <div key={record.id} className="rounded-lg border bg-gray-50 p-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-medium">
                      {record.courseName ?? 'コース未設定'}
                    </div>
                    <div className="text-sm text-gray-600">
                      {format(new Date(record.startTime), 'M/d(E) HH:mm', { locale: ja })}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">¥{record.staffRevenue.toLocaleString()}</div>
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
