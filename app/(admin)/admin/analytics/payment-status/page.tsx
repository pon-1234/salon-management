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

export default function PaymentStatusPage() {
  const [payments, setPayments] = useState<PaymentTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [providerFilter, setProviderFilter] = useState<string>('all')
  const [startDate, setStartDate] = useState<Date>(addDays(new Date(), -30))
  const [endDate, setEndDate] = useState<Date>(new Date())

  const fetchPaymentData = useCallback(async () => {
    setLoading(true)
    try {
      // Mock data for demonstration - in real implementation, this would fetch from API
      const mockPayments: PaymentTransaction[] = [
        {
          id: 'txn_001',
          reservationId: 'res_001',
          customerId: 'cust_001',
          amount: 15000,
          currency: 'jpy',
          provider: 'stripe',
          paymentMethod: 'card',
          status: 'completed',
          processedAt: new Date('2024-01-15T10:30:00'),
          createdAt: new Date('2024-01-15T10:25:00'),
          updatedAt: new Date('2024-01-15T10:30:00'),
        },
        {
          id: 'txn_002',
          reservationId: 'res_002',
          customerId: 'cust_002',
          amount: 25000,
          currency: 'jpy',
          provider: 'stripe',
          paymentMethod: 'card',
          status: 'pending',
          createdAt: new Date('2024-01-15T11:00:00'),
          updatedAt: new Date('2024-01-15T11:00:00'),
        },
        {
          id: 'txn_003',
          reservationId: 'res_003',
          customerId: 'cust_003',
          amount: 18000,
          currency: 'jpy',
          provider: 'payjp',
          paymentMethod: 'card',
          status: 'failed',
          errorMessage: 'Card declined',
          createdAt: new Date('2024-01-15T12:00:00'),
          updatedAt: new Date('2024-01-15T12:01:00'),
        },
        {
          id: 'txn_004',
          reservationId: 'res_004',
          customerId: 'cust_004',
          amount: 30000,
          currency: 'jpy',
          provider: 'stripe',
          paymentMethod: 'card',
          status: 'refunded',
          refundAmount: 15000,
          processedAt: new Date('2024-01-14T14:00:00'),
          refundedAt: new Date('2024-01-15T09:00:00'),
          createdAt: new Date('2024-01-14T14:00:00'),
          updatedAt: new Date('2024-01-15T09:00:00'),
        },
        {
          id: 'txn_005',
          reservationId: 'res_005',
          customerId: 'cust_005',
          amount: 12000,
          currency: 'jpy',
          provider: 'stripe',
          paymentMethod: 'card',
          status: 'processing',
          createdAt: new Date('2024-01-15T13:30:00'),
          updatedAt: new Date('2024-01-15T13:30:00'),
        },
      ]

      // Apply filters
      let filteredPayments = mockPayments

      if (statusFilter !== 'all') {
        filteredPayments = filteredPayments.filter((p) => p.status === statusFilter)
      }

      if (providerFilter !== 'all') {
        filteredPayments = filteredPayments.filter((p) => p.provider === providerFilter)
      }

      if (startDate && endDate) {
        filteredPayments = filteredPayments.filter((p) => {
          const paymentDate = new Date(p.createdAt)
          return paymentDate >= startDate && paymentDate <= endDate
        })
      }

      setPayments(filteredPayments)
    } catch (error) {
      console.error('Failed to fetch payment data:', error)
    } finally {
      setLoading(false)
    }
  }, [startDate, endDate, statusFilter, providerFilter])

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
                  <SelectItem value="stripe">Stripe</SelectItem>
                  <SelectItem value="payjp">PAY.JP</SelectItem>
                  <SelectItem value="cash">現金</SelectItem>
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
            <PaymentStatusTable payments={payments} />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
