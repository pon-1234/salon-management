'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Coins, TrendingUp, TrendingDown, Gift, Info, RefreshCw } from 'lucide-react'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'

interface PointHistoryProps {
  customerId: string
  initialBalance?: number
}

type HistoryEntry = {
  id: string
  type: 'earned' | 'used' | 'expired' | 'adjusted'
  amount: number
  description: string
  relatedService?: string | null
  balance: number
  createdAt: Date
}

type ExpiringInfo = {
  amount: number
  expiryDate: string
} | null

const PAGE_SIZE = 20

export function PointHistory({ customerId, initialBalance = 0 }: PointHistoryProps) {
  const [balance, setBalance] = useState(initialBalance)
  const [balanceLoading, setBalanceLoading] = useState(initialBalance === 0)
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [historyLoading, setHistoryLoading] = useState(true)
  const [historyError, setHistoryError] = useState<string | null>(null)
  const [expiringPoints, setExpiringPoints] = useState<ExpiringInfo>(null)
  const [offset, setOffset] = useState(0)
  const [paginationMeta, setPaginationMeta] = useState({ total: 0, hasMore: false })

  useEffect(() => {
    setBalance(initialBalance)
  }, [initialBalance])

  useEffect(() => {
    let active = true
    const fetchBalance = async () => {
      setBalanceLoading(true)
      try {
        const response = await fetch(
          `/api/customer/points/balance?customerId=${encodeURIComponent(customerId)}`,
          { credentials: 'include', cache: 'no-store' }
        )
        if (!response.ok) {
          throw new Error('ポイント残高の取得に失敗しました')
        }
        const payload = await response.json()
        if (!active) return
        setBalance(payload.balance ?? 0)
        setExpiringPoints(payload.expiringPoints)
      } catch (error) {
        console.error(error)
      } finally {
        if (active) {
          setBalanceLoading(false)
        }
      }
    }

    fetchBalance()
    return () => {
      active = false
    }
  }, [customerId])

  useEffect(() => {
    let active = true
    const fetchHistory = async () => {
      setHistoryLoading(true)
      setHistoryError(null)
      try {
        const response = await fetch(
          `/api/customer/points?customerId=${encodeURIComponent(customerId)}&limit=${PAGE_SIZE}&offset=${offset}`,
          { credentials: 'include', cache: 'no-store' }
        )

        if (!response.ok) {
          throw new Error('ポイント履歴の取得に失敗しました')
        }

        const payload = await response.json()
        if (!active) return

        const entries: HistoryEntry[] = Array.isArray(payload.data)
          ? payload.data.map((entry: any) => ({
              id: entry.id,
              type: entry.type,
              amount: entry.amount,
              description: entry.description,
              relatedService: entry.relatedService,
              balance: entry.balance,
              createdAt: entry.createdAt ? new Date(entry.createdAt) : new Date(),
            }))
          : []

        setHistory(entries)
        setPaginationMeta({
          total: payload.pagination?.total ?? entries.length,
          hasMore: Boolean(payload.pagination?.hasMore),
        })
      } catch (error) {
        setHistoryError(
          error instanceof Error ? error.message : 'ポイント履歴の取得に失敗しました'
        )
      } finally {
        if (active) {
          setHistoryLoading(false)
        }
      }
    }

    fetchHistory()
    return () => {
      active = false
    }
  }, [customerId, offset])

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'earned':
        return <TrendingUp className="h-4 w-4 text-green-600" />
      case 'used':
        return <TrendingDown className="h-4 w-4 text-red-600" />
      case 'adjusted':
        return <RefreshIcon />
      case 'expired':
        return <Gift className="h-4 w-4 text-gray-500" />
      default:
        return <Coins className="h-4 w-4 text-gray-600" />
    }
  }

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'earned':
        return <Badge className="bg-green-100 text-green-800">獲得</Badge>
      case 'used':
        return <Badge variant="destructive">利用</Badge>
      case 'adjusted':
        return <Badge className="bg-blue-100 text-blue-800">調整</Badge>
      case 'expired':
        return <Badge variant="secondary">期限切れ</Badge>
      default:
        return <Badge variant="secondary">その他</Badge>
    }
  }

  const renderAmount = (entry: HistoryEntry) => {
    const isPositive = entry.amount > 0
    const color =
      entry.type === 'used' || entry.type === 'expired'
        ? 'text-red-600'
        : isPositive
          ? 'text-green-600'
          : 'text-gray-600'
    return (
      <p className={`font-bold ${color}`}>
        {isPositive ? '+' : ''}
        {entry.amount.toLocaleString()}pt
      </p>
    )
  }

  const renderHistoryContent = () => {
    if (historyLoading) {
      return (
        <div className="space-y-4">
          {[1, 2, 3].map((skeleton) => (
            <div key={skeleton} className="animate-pulse rounded-lg border p-4">
              <div className="h-4 w-1/3 rounded bg-gray-200" />
              <div className="mt-2 h-3 w-1/2 rounded bg-gray-200" />
              <div className="mt-2 h-3 w-1/4 rounded bg-gray-200" />
            </div>
          ))}
        </div>
      )
    }

    if (historyError) {
      return (
        <Alert variant="destructive">
          <AlertDescription>ポイント履歴の取得に失敗しました: {historyError}</AlertDescription>
        </Alert>
      )
    }

    if (history.length === 0) {
      return (
        <div className="flex flex-col items-center rounded-lg border border-dashed p-8 text-center">
          <Coins className="mb-3 h-10 w-10 text-gray-400" />
          <p className="font-medium text-gray-700">ポイント履歴がありません</p>
          <p className="text-sm text-gray-500">予約のご利用でポイントが貯まります</p>
        </div>
      )
    }

    return (
      <div className="space-y-4">
        {history.map((entry) => (
          <div
            key={entry.id}
            className="rounded-lg border p-4 transition-colors hover:bg-gray-50 md:flex md:items-center md:justify-between"
          >
            <div className="flex flex-1 items-start gap-3">
              <div className="mt-1">{getTypeIcon(entry.type)}</div>
              <div>
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <span className="font-medium">{entry.description}</span>
                  {getTypeBadge(entry.type)}
                </div>
                {entry.relatedService && (
                  <p className="text-sm text-gray-600">{entry.relatedService}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  {format(entry.createdAt, 'yyyy年MM月dd日 HH:mm', { locale: ja })}
                </p>
              </div>
            </div>
            <div className="mt-4 text-right md:mt-0">
              {renderAmount(entry)}
              <p className="mt-1 text-xs text-gray-500">
                残高: {entry.balance.toLocaleString()}pt
              </p>
            </div>
          </div>
        ))}
      </div>
    )
  }

  const from = history.length === 0 ? 0 : Math.min(offset + 1, paginationMeta.total)
  const to =
    history.length === 0
      ? 0
      : Math.min(offset + history.length, Math.max(paginationMeta.total, history.length))

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>ポイント残高</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-6 text-center">
            {balanceLoading ? (
              <div className="mx-auto h-10 w-32 animate-pulse rounded bg-gray-200" />
            ) : (
              <p className="mb-2 text-4xl font-bold text-purple-600">
                {balance.toLocaleString()}
                <span className="ml-1 text-lg">pt</span>
              </p>
            )}
            <p className="text-sm text-gray-500">現在の保有ポイント</p>
          </div>

          {expiringPoints && (
            <Alert className="border-yellow-500 bg-yellow-50">
              <Info className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800">
                {expiringPoints.amount.toLocaleString()}ポイントが
                {format(new Date(expiringPoints.expiryDate), 'yyyy年MM月dd日', { locale: ja })}
                に有効期限を迎えます
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <h3 className="mb-4 font-semibold">ポイントについて</h3>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-2">
              <div className="mt-2 h-1 w-1 rounded-full bg-gray-400" />
              <div>
                <p className="font-medium">獲得ルール</p>
                <p className="text-gray-600">ご利用金額に応じてポイントが還元されます</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="mt-2 h-1 w-1 rounded-full bg-gray-400" />
              <div>
                <p className="font-medium">利用方法</p>
                <p className="text-gray-600">1ポイント = 1円として次回予約時に利用可能</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="mt-2 h-1 w-1 rounded-full bg-gray-400" />
              <div>
                <p className="font-medium">有効期限</p>
                <p className="text-gray-600">ポイントには有効期限があります。期限前にご利用ください。</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>ポイント履歴</CardTitle>
        </CardHeader>
        <CardContent>
          {renderHistoryContent()}
          {history.length > 0 && (
            <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <Button
                variant="outline"
                disabled={offset === 0}
                onClick={() => setOffset((prev) => Math.max(0, prev - PAGE_SIZE))}
              >
                前へ
              </Button>
              <span className="text-sm text-gray-500">
                {paginationMeta.total}件中 {from}-{to}件
              </span>
              <Button
                variant="outline"
                disabled={!paginationMeta.hasMore}
                onClick={() => setOffset((prev) => prev + PAGE_SIZE)}
              >
                次へ
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function RefreshIcon() {
  return <RefreshCw className="h-4 w-4 text-blue-600" />
}
