/**
 * @design_doc   docs/SYSTEM_AUDIT_2026-07-26.md A-4
 * @related_to   InfiniTalk HTML/URL screen popup; CTIProvider incoming overlay
 * @known_issues InfiniTalk still has to allow this URL in its client popup setting
 */
import { Phone } from 'lucide-react'
import { PageHeader } from '@/components/admin/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { INFINITALK_POPUP_PATH } from '@/lib/cti/incoming-call-params'

export default function IncomingCallPage() {
  const popupUrl = `${INFINITALK_POPUP_PATH}?telno={発信番号}&calledno={着信番号}`

  return (
    <div className="bg-gray-50 p-6">
      <PageHeader
        title="着信ポップアップ"
        description="InfiniTalkから着信番号をHTML/URL連携で受け取り、顧客カードを表示します。"
        icon={Phone}
      />
      <Card className="max-w-3xl">
        <CardHeader>
          <CardTitle className="text-base">InfiniTalkに登録する画面ポップアップURL</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-gray-700">
          <code className="block break-all rounded bg-gray-100 p-3">{popupUrl}</code>
          <p>
            管理画面を開いた状態で着信すると、この画面または他の管理タブに着信ポップアップが出ます。
            InfiniTalk側のポップアップがブラウザにブロックされる場合は、このURLを画面ポップアップ先に指定してください。
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
