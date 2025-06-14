'use client'

import { Store } from '@/lib/store/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Coins, TrendingUp, TrendingDown, Gift, Calendar, Info } from 'lucide-react'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'

interface PointHistoryProps {
  user: {
    points: number
  }
}

export function PointHistory({ user }: PointHistoryProps) {
  // Mock point history data
  const pointHistory = [
    {
      id: '1',
      date: new Date('2024-06-10'),
      type: 'use' as const,
      amount: -2000,
      description: '予約時に利用',
      details: 'すずか - 120分コース',
      balance: 2500,
    },
    {
      id: '2',
      date: new Date('2024-06-10'),
      type: 'earn' as const,
      amount: 340,
      description: '利用ポイント付与',
      details: '34,000円利用 (1%還元)',
      balance: 4500,
    },
    {
      id: '3',
      date: new Date('2024-05-28'),
      type: 'earn' as const,
      amount: 190,
      description: '利用ポイント付与',
      details: '19,000円利用 (1%還元)',
      balance: 4160,
    },
    {
      id: '4',
      date: new Date('2024-05-01'),
      type: 'bonus' as const,
      amount: 1000,
      description: '誕生月ボーナス',
      details: '5月誕生日特典',
      balance: 3970,
    },
    {
      id: '5',
      date: new Date('2024-01-15'),
      type: 'bonus' as const,
      amount: 1000,
      description: '新規登録ボーナス',
      details: '初回登録特典',
      balance: 2970,
    },
  ]

  // Points expiring soon
  const expiringPoints = {
    amount: 1000,
    expiryDate: new Date('2025-01-15'),
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'earn':
        return <TrendingUp className="h-4 w-4 text-green-600" />
      case 'use':
        return <TrendingDown className="h-4 w-4 text-red-600" />
      case 'bonus':
        return <Gift className="h-4 w-4 text-purple-600" />
      default:
        return <Coins className="h-4 w-4 text-gray-600" />
    }
  }

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'earn':
        return <Badge className="bg-green-100 text-green-800">獲得</Badge>
      case 'use':
        return <Badge variant="destructive">利用</Badge>
      case 'bonus':
        return <Badge className="bg-purple-100 text-purple-800">ボーナス</Badge>
      default:
        return <Badge variant="secondary">その他</Badge>
    }
  }

  return (
    <div className="space-y-6">
      {/* Current Points Summary */}
      <Card>
        <CardHeader>
          <CardTitle>ポイント残高</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center mb-6">
            <p className="text-4xl font-bold text-purple-600 mb-2">
              {user.points.toLocaleString()}
              <span className="text-lg ml-1">pt</span>
            </p>
            <p className="text-sm text-gray-500">現在の保有ポイント</p>
          </div>

          {/* Expiring Points Alert */}
          {expiringPoints.amount > 0 && (
            <Alert className="border-yellow-500 bg-yellow-50">
              <Info className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800">
                {expiringPoints.amount.toLocaleString()}ポイントが
                {format(expiringPoints.expiryDate, 'yyyy年MM月dd日', { locale: ja })}
                に有効期限を迎えます
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Point Rules */}
      <Card>
        <CardContent className="p-6">
          <h3 className="font-semibold mb-4">ポイントについて</h3>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-2">
              <div className="w-1 h-1 bg-gray-400 rounded-full mt-2" />
              <div>
                <p className="font-medium">獲得ルール</p>
                <p className="text-gray-600">ご利用金額の1%をポイント還元</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-1 h-1 bg-gray-400 rounded-full mt-2" />
              <div>
                <p className="font-medium">利用方法</p>
                <p className="text-gray-600">1ポイント = 1円として次回予約時に利用可能</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <div className="w-1 h-1 bg-gray-400 rounded-full mt-2" />
              <div>
                <p className="font-medium">有効期限</p>
                <p className="text-gray-600">最後の獲得日から1年間</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Point History */}
      <Card>
        <CardHeader>
          <CardTitle>ポイント履歴</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {pointHistory.map((history) => (
              <div
                key={history.id}
                className="flex items-start justify-between py-3 border-b last:border-0"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-1">{getTypeIcon(history.type)}</div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{history.description}</span>
                      {getTypeBadge(history.type)}
                    </div>
                    <p className="text-sm text-gray-600">{history.details}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {format(history.date, 'yyyy年MM月dd日 HH:mm', { locale: ja })}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-bold ${
                    history.amount > 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {history.amount > 0 ? '+' : ''}{history.amount.toLocaleString()}pt
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    残高: {history.balance.toLocaleString()}pt
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Load More */}
          <Button variant="outline" className="w-full mt-4">
            もっと見る
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}