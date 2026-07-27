/**
 * @design_doc   docs/VPS_DEPLOYMENT.md point-expiration fail-closed policy
 * @related_to   Point settings page and disabled point-expiration APIs
 * @known_issues FIFO point-lot allocation, migration, and reconciliation are not approved
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function PointExpirationPanel() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>ポイント有効期限管理</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-amber-700">
          安全のため失効処理を停止しています。FIFOポイントロットの配賦、旧データ移行、残高照合が承認されるまで、手動実行と自動実行は利用できません。
        </p>
      </CardContent>
    </Card>
  )
}
