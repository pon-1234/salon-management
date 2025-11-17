'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from '@/hooks/use-toast'

export function PointExpirationPanel() {
  const [loading, setLoading] = useState(false)

  const handleExpirePoints = async () => {
    if (!confirm('有効期限切れポイントを失効させますか？')) {
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/customer/points/expire', {
        method: 'POST',
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error('失効処理に失敗しました')
      }

      const payload = await response.json()
      toast({
        title: '完了',
        description: `${payload.processedCount}件のポイントを失効させました`,
      })
    } catch (error) {
      toast({
        title: 'エラー',
        description: error instanceof Error ? error.message : 'ポイント失効処理に失敗しました',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>ポイント有効期限管理</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-600">
          Cron ジョブとは別に、手動で有効期限切れポイントの失効処理を実行できます。
        </p>
        <Button onClick={handleExpirePoints} disabled={loading} className="mt-4">
          {loading ? '処理中...' : 'ポイント失効処理を実行'}
        </Button>
      </CardContent>
    </Card>
  )
}
