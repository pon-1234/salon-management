/**
 * @design_doc   docs/LEGACY_GOLD_ADMIN_MIGRATION_INVENTORY.md cast settlement management
 * @related_to   SettlementPaymentDto, CastSettlementsData
 * @known_issues Legacy settlement totals require production-data reconciliation
 */
'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Calendar, CreditCard, User, Eye, Receipt } from 'lucide-react'
import { SettlementPaymentDto } from '@/lib/cast-portal/types'
import { displaySettlementMethodLabel } from '@/lib/payment/method-labels'
import { settlementStatusPresentation } from '@/components/cast/payment-record-form'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'

interface PaymentHistoryTabProps {
  castId: string
  storeId: string
}

async function readApiErrorBody(response: Response, fallback: string): Promise<string> {
  const body = await response.text().catch(() => '')
  if (!body.trim()) return fallback

  try {
    const payload = JSON.parse(body) as { error?: unknown; message?: unknown }
    if (typeof payload.error === 'string' && payload.error.trim()) return payload.error
    if (typeof payload.message === 'string' && payload.message.trim()) return payload.message
  } catch {
    return body.trim()
  }

  return fallback
}

export function PaymentHistoryTab({ castId, storeId }: PaymentHistoryTabProps) {
  const [paymentRecords, setPaymentRecords] = useState<SettlementPaymentDto[]>([])
  const [selectedPayment, setSelectedPayment] = useState<SettlementPaymentDto | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPayments = useCallback(async () => {
    try {
      setError(null)
      const params = new URLSearchParams({ castId, storeId })
      const res = await fetch(`/api/admin/cast/settlements/payments?${params.toString()}`, {
        cache: 'no-store',
      })
      if (!res.ok) {
        throw new Error(await readApiErrorBody(res, '入金記録の取得に失敗しました'))
      }
      const data = (await res.json()) as SettlementPaymentDto[]
      setPaymentRecords(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : '通信エラー')
    } finally {
      setLoading(false)
    }
  }, [castId, storeId])

  useEffect(() => {
    void fetchPayments()
  }, [fetchPayments])

  const totalPaid = paymentRecords.reduce((sum, record) => sum + record.amount, 0)

  const lastPaidAt = useMemo(() => {
    if (paymentRecords.length === 0) return null
    return new Date(Math.max(...paymentRecords.map((r) => new Date(r.paidAt).getTime())))
  }, [paymentRecords])

  const getPaymentTypeColor = (type: string) => {
    switch (type) {
      case '現金精算':
      case '現金':
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
    return (
      <div role="alert" className="p-4 text-sm text-destructive">
        {error}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        精算の実行は上の「精算する」から行います。ここでは記録の確認だけできます。店舗全体の一覧は「精算」からも開けます。
      </p>
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
          <CardTitle>精算履歴</CardTitle>
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
                      <div className="text-gray-500">
                        {format(new Date(record.paidAt), 'HH:mm')}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getPaymentTypeColor(record.method)}>
                      {displaySettlementMethodLabel(record.method)}
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
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label="入金記録の詳細を表示"
                        onClick={() => setSelectedPayment(record)}
                      >
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
              <DialogDescription>支払内容と対象予約を確認できます。</DialogDescription>
            </DialogHeader>
            <PaymentDetailView payment={selectedPayment} />
          </DialogContent>
        </Dialog>
      )}
    </div>
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
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="font-medium">{record.courseName ?? 'コース未設定'}</div>
                      <Badge
                        variant="outline"
                        className={settlementStatusPresentation[record.settlementStatus].className}
                      >
                        {settlementStatusPresentation[record.settlementStatus].label}
                      </Badge>
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
