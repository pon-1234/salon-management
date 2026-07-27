/**
 * @design_doc   Issue #5 - Payment System Integration
 * @related_to   PaymentStatusTable (UI component), Analytics (existing system integration)
 * @known_issues None identified
 */

'use client'

import { useEffect, useState, useCallback } from 'react'
import { PaymentStatusTable } from '@/components/analytics/payment-status-table'
import { PaymentTransaction } from '@/lib/payment/types'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DatePicker } from '@/components/ui/date-picker'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CalendarIcon, CreditCardIcon, TrendingUpIcon } from 'lucide-react'
import { addDays, format } from 'date-fns'
import { useStore } from '@/contexts/store-context'
import { toast } from '@/hooks/use-toast'

const PAGE_SIZE = 25

export default function PaymentStatusPage() {
  const { currentStore } = useStore()
  const [payments, setPayments] = useState<PaymentTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [providerFilter, setProviderFilter] = useState<string>('all')
  const [startDate, setStartDate] = useState<Date>(addDays(new Date(), -30))
  const [endDate, setEndDate] = useState<Date>(new Date())
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(false)

  const fetchPaymentData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        storeId: currentStore.id,
        limit: String(PAGE_SIZE + 1),
        offset: String(page * PAGE_SIZE),
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      })
      if (statusFilter !== 'all') params.set('status', statusFilter)
      if (providerFilter !== 'all') params.set('provider', providerFilter)

      const response = await fetch(`/api/payments?${params.toString()}`, {
        credentials: 'include',
        cache: 'no-store',
      })
      if (!response.ok) {
        throw new Error(`Payment list failed: ${response.status}`)
      }
      const payload = (await response.json()) as { transactions: PaymentTransaction[] }
      setHasMore(payload.transactions.length > PAGE_SIZE)
      setPayments(payload.transactions.slice(0, PAGE_SIZE))
    } catch (error) {
      console.error('Failed to fetch payment data:', error)
      setPayments([])
      setHasMore(false)
      toast({ variant: 'destructive', description: '決済データの取得に失敗しました。' })
    } finally {
      setLoading(false)
    }
  }, [currentStore.id, endDate, page, providerFilter, startDate, statusFilter])

  useEffect(() => {
    fetchPaymentData()
  }, [fetchPaymentData])

  const refreshData = () => {
    fetchPaymentData()
  }

  return (
    <div className="container mx-auto space-y-6 py-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">決済ステータス管理</h1>
          <p className="text-gray-600">決済取引の状況とパフォーマンスを確認できます</p>
        </div>
        <Button onClick={refreshData} disabled={loading}>
          {loading ? '読み込み中...' : '更新'}
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            フィルター設定
          </CardTitle>
          <CardDescription>表示する決済データの条件を設定してください</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
            <div className="space-y-2">
              <label className="text-sm font-medium">開始日</label>
              <DatePicker selected={startDate} onSelect={(date) => date && setStartDate(date)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">終了日</label>
              <DatePicker selected={endDate} onSelect={(date) => date && setEndDate(date)} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">ステータス</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="ステータスを選択" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべて</SelectItem>
                  <SelectItem value="completed">完了</SelectItem>
                  <SelectItem value="pending">保留中</SelectItem>
                  <SelectItem value="processing">処理中</SelectItem>
                  <SelectItem value="failed">失敗</SelectItem>
                  <SelectItem value="cancelled">キャンセル</SelectItem>
                  <SelectItem value="refunded">返金済み</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">決済プロバイダー</label>
              <Select value={providerFilter} onValueChange={setProviderFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="プロバイダーを選択" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべて</SelectItem>
                  <SelectItem value="manual">手動登録</SelectItem>
                  <SelectItem value="cash">現金</SelectItem>
                  <SelectItem value="bank_transfer">銀行振込</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={refreshData} className="w-full">
                フィルター適用
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Status Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCardIcon className="h-5 w-5" />
            決済ステータス
          </CardTitle>
          <CardDescription>
            {startDate && endDate
              ? `${format(startDate, 'yyyy/MM/dd')} - ${format(endDate, 'yyyy/MM/dd')}`
              : '全期間'}{' '}
            の決済取引データ
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-gray-500">データを読み込み中...</div>
            </div>
          ) : (
            <>
              <PaymentStatusTable payments={payments} />
              <div className="mt-4 flex items-center justify-end gap-3">
                <Button variant="outline" disabled={page === 0} onClick={() => setPage(page - 1)}>
                  前へ
                </Button>
                <span className="text-sm text-muted-foreground">{page + 1}ページ</span>
                <Button variant="outline" disabled={!hasMore} onClick={() => setPage(page + 1)}>
                  次へ
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
