'use client'

/**
 * @design_doc   ui-improvement-instructions.md U-4 destructive confirmation dialogs
 * @related_to   ConfirmDialog: replaces native confirm for point expiration
 * @known_issues Existing API call and toast behavior are unchanged
 */
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from '@/hooks/use-toast'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'

export function PointExpirationPanel() {
  const [loading, setLoading] = useState(false)

  const handleExpirePoints = async () => {
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
        <ConfirmDialog
          title="有効期限切れポイントを失効させますか？"
          description="対象ポイントを一括で失効します。この操作の結果は取り消せません。"
          confirmLabel="失効処理を実行"
          onConfirm={handleExpirePoints}
        >
          <Button disabled={loading} className="mt-4">
            {loading ? '処理中...' : 'ポイント失効処理を実行'}
          </Button>
        </ConfirmDialog>
      </CardContent>
    </Card>
  )
}
