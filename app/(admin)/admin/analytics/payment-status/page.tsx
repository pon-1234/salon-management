/**
 * @design_doc   Issue #5 - Payment System Integration
 * @related_to   PaymentStatusTable (UI component), Analytics (existing system integration)
 * @known_issues None identified
 */

'use client'

import { useEffect, useState, useCallback } from 'react'
import { PaymentStatusTable } from '@/components/analytics/payment-status-table'
import type { PaymentTransaction, PaymentTransactionSummary } from '@/lib/payment/types'
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
import { CalendarIcon, CreditCardIcon } from 'lucide-react'
import { addDays, format, startOfDay } from 'date-fns'
import { useStore } from '@/contexts/store-context'
import { toast } from '@/hooks/use-toast'

const PAGE_SIZE = 25

function emptyPaymentSummary(): PaymentTransactionSummary {
  return {
    statusCounts: {
      completed: 0,
      pending: 0,
      processing: 0,
      failed: 0,
      cancelled: 0,
      refunded: 0,
    },
    completedAmount: 0,
    refundedAmount: 0,
    totalTransactions: 0,
    totalAmount: 0,
  }
}

export default function PaymentStatusPage() {
  const { currentStore } = useStore()
  const [payments, setPayments] = useState<PaymentTransaction[]>([])
  const [summary, setSummary] = useState<PaymentTransactionSummary>(emptyPaymentSummary)
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
      const endExclusive = startOfDay(addDays(endDate, 1))
      const params = new URLSearchParams({
        storeId: currentStore.id,
        limit: String(PAGE_SIZE + 1),
        offset: String(page * PAGE_SIZE),
        startDate: startOfDay(startDate).toISOString(),
        endDate: endExclusive.toISOString(),
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
      const payload = (await response.json()) as {
        transactions: PaymentTransaction[]
        summary: PaymentTransactionSummary
      }
      setHasMore(payload.transactions.length > PAGE_SIZE)
      setPayments(payload.transactions.slice(0, PAGE_SIZE))
      setSummary(payload.summary)
    } catch (error) {
      console.error('Failed to fetch payment data:', error)
      setPayments([])
      setSummary(emptyPaymentSummary())
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

  const handleStartDateChange = (date: Date | undefined) => {
    if (!date) return
    setPage(0)
    setStartDate(date)
  }

  const handleEndDateChange = (date: Date | undefined) => {
    if (!date) return
    setPage(0)
    setEndDate(date)
  }

  const handleStatusFilterChange = (value: string) => {
    setPage(0)
    setStatusFilter(value)
  }

  const handleProviderFilterChange = (value: string) => {
    setPage(0)
    setProviderFilter(value)
  }

  return (
    <div className="container mx-auto space-y-6 py-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">決済状況</h1>
          <p className="text-gray-600">
            予約の現金・カード支払いと管理番号を確認できます。カード番号は保存しません。
          </p>
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
              <DatePicker selected={startDate} onSelect={handleStartDateChange} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">終了日</label>
              <DatePicker selected={endDate} onSelect={handleEndDateChange} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">ステータス</label>
              <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
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
              <Select value={providerFilter} onValueChange={handleProviderFilterChange}>
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
              <PaymentStatusTable payments={payments} summary={summary} />
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
