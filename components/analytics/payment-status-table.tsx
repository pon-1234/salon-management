/**
 * @design_doc   Issue #5 - Payment System Integration
 * @related_to   PaymentService (payment data), Analytics UI (existing pattern)
 * @known_issues None identified
 */

'use client'

import { useEffect, useState } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { PaymentTransaction } from '@/lib/payment/types'

interface PaymentStatusTableProps {
  payments: PaymentTransaction[]
  className?: string
}

export function PaymentStatusTable({ payments, className }: PaymentStatusTableProps) {
  const [statusCounts, setStatusCounts] = useState({
    completed: 0,
    pending: 0,
    failed: 0,
    refunded: 0,
    cancelled: 0,
    processing: 0,
  })

  const [totals, setTotals] = useState({
    completedAmount: 0,
    refundedAmount: 0,
    totalTransactions: 0,
    totalAmount: 0,
  })

  useEffect(() => {
    const counts = payments.reduce(
      (acc, payment) => {
        acc[payment.status as keyof typeof acc] = (acc[payment.status as keyof typeof acc] || 0) + 1
        return acc
      },
      { completed: 0, pending: 0, failed: 0, refunded: 0, cancelled: 0, processing: 0 }
    )

    const amounts = payments.reduce(
      (acc, payment) => {
        acc.totalTransactions += 1
        acc.totalAmount += payment.amount

        if (payment.status === 'completed') {
          acc.completedAmount += payment.amount
        }
        if (payment.status === 'refunded' && payment.refundAmount) {
          acc.refundedAmount += payment.refundAmount
        }

        return acc
      },
      { completedAmount: 0, refundedAmount: 0, totalTransactions: 0, totalAmount: 0 }
    )

    setStatusCounts(counts)
    setTotals(amounts)
  }, [payments])

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      completed: {
        variant: 'default' as const,
        label: '完了',
        className: 'bg-green-100 text-green-800',
      },
      pending: {
        variant: 'secondary' as const,
        label: '保留中',
        className: 'bg-yellow-100 text-yellow-800',
      },
      processing: {
        variant: 'secondary' as const,
        label: '処理中',
        className: 'bg-blue-100 text-blue-800',
      },
      failed: {
        variant: 'destructive' as const,
        label: '失敗',
        className: 'bg-red-100 text-red-800',
      },
      cancelled: {
        variant: 'destructive' as const,
        label: 'キャンセル',
        className: 'bg-gray-100 text-gray-800',
      },
      refunded: {
        variant: 'secondary' as const,
        label: '返金済み',
        className: 'bg-purple-100 text-purple-800',
      },
    }

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending
    return (
      <Badge variant={config.variant} className={config.className}>
        {config.label}
      </Badge>
    )
  }

  const getProviderLabel = (provider: string) => {
    const providerLabels: Record<string, string> = {
      stripe: 'Stripe',
      payjp: 'PAY.JP',
      cash: '現金',
      bank_transfer: '銀行振込',
    }
    return providerLabels[provider] || provider
  }

  const getPaymentMethodLabel = (method: string) => {
    const methodLabels: Record<string, string> = {
      card: 'クレジットカード',
      bank_transfer: '銀行振込',
      cash: '現金',
    }
    return methodLabels[method] || method
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Status Summary */}
      <div className="grid grid-cols-3 gap-4 md:grid-cols-6">
        <div className="rounded-lg bg-green-50 p-3 text-center">
          <div className="text-lg font-bold text-green-800">{statusCounts.completed}</div>
          <div className="text-sm text-green-600">完了</div>
        </div>
        <div className="rounded-lg bg-yellow-50 p-3 text-center">
          <div className="text-lg font-bold text-yellow-800">{statusCounts.pending}</div>
          <div className="text-sm text-yellow-600">保留中</div>
        </div>
        <div className="rounded-lg bg-blue-50 p-3 text-center">
          <div className="text-lg font-bold text-blue-800">{statusCounts.processing}</div>
          <div className="text-sm text-blue-600">処理中</div>
        </div>
        <div className="rounded-lg bg-red-50 p-3 text-center">
          <div className="text-lg font-bold text-red-800">{statusCounts.failed}</div>
          <div className="text-sm text-red-600">失敗</div>
        </div>
        <div className="rounded-lg bg-gray-50 p-3 text-center">
          <div className="text-lg font-bold text-gray-800">{statusCounts.cancelled}</div>
          <div className="text-sm text-gray-600">キャンセル</div>
        </div>
        <div className="rounded-lg bg-purple-50 p-3 text-center">
          <div className="text-lg font-bold text-purple-800">{statusCounts.refunded}</div>
          <div className="text-sm text-purple-600">返金済み</div>
        </div>
      </div>

      {/* Amount Summary */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-lg bg-gray-50 p-3 text-center">
          <div className="text-lg font-bold">¥{totals.totalAmount.toLocaleString()}</div>
          <div className="text-sm text-gray-600">総取引額</div>
        </div>
        <div className="rounded-lg bg-green-50 p-3 text-center">
          <div className="text-lg font-bold text-green-800">
            ¥{totals.completedAmount.toLocaleString()}
          </div>
          <div className="text-sm text-green-600">完了取引額</div>
        </div>
        <div className="rounded-lg bg-purple-50 p-3 text-center">
          <div className="text-lg font-bold text-purple-800">
            ¥{totals.refundedAmount.toLocaleString()}
          </div>
          <div className="text-sm text-purple-600">返金額</div>
        </div>
        <div className="rounded-lg bg-blue-50 p-3 text-center">
          <div className="text-lg font-bold text-blue-800">
            {totals.totalTransactions > 0
              ? Math.round(totals.completedAmount / totals.totalTransactions).toLocaleString()
              : 0}
          </div>
          <div className="text-sm text-blue-600">平均取引額</div>
        </div>
      </div>

      {/* Payment Details Table */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>取引ID</TableHead>
              <TableHead>予約ID</TableHead>
              <TableHead>顧客ID</TableHead>
              <TableHead className="text-right">金額</TableHead>
              <TableHead>決済方法</TableHead>
              <TableHead>プロバイダー</TableHead>
              <TableHead>ステータス</TableHead>
              <TableHead className="text-right">返金額</TableHead>
              <TableHead>処理日時</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.map((payment) => (
              <TableRow key={payment.id}>
                <TableCell className="font-mono text-sm">{payment.id.slice(-8)}</TableCell>
                <TableCell className="font-mono text-sm">
                  {payment.reservationId.slice(-8)}
                </TableCell>
                <TableCell className="font-mono text-sm">{payment.customerId.slice(-8)}</TableCell>
                <TableCell className="text-right">¥{payment.amount.toLocaleString()}</TableCell>
                <TableCell>{getPaymentMethodLabel(payment.paymentMethod)}</TableCell>
                <TableCell>{getProviderLabel(payment.provider)}</TableCell>
                <TableCell>{getStatusBadge(payment.status)}</TableCell>
                <TableCell className="text-right">
                  {payment.refundAmount ? `¥${payment.refundAmount.toLocaleString()}` : '-'}
                </TableCell>
                <TableCell>
                  {payment.processedAt
                    ? new Date(payment.processedAt).toLocaleString('ja-JP')
                    : '-'}
                </TableCell>
              </TableRow>
            ))}
            {payments.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="py-8 text-center text-gray-500">
                  支払い取引がありません
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
