/**
 * @design_doc   refactor-instructions.md D-1 current route documentation
 * @related_to   Cast portal navigation: links to this external diary bridge page
 * @known_issues External diary URL is configured by environment variables outside this module
 */
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth/config'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default async function CastDiaryRedirectPage() {
  const session = await getServerSession(authOptions)

  if (!session || session.user.role !== 'cast') {
    redirect('/cast/login')
  }

  const diaryUrl =
    process.env.HEAVEN_MY_PAGE_URL || process.env.NEXT_PUBLIC_HEAVEN_MY_PAGE_URL || ''

  if (diaryUrl) {
    redirect(diaryUrl)
  }

  return (
    <div className="mx-auto max-w-xl">
      <Card>
        <CardHeader>
          <CardTitle>写メ日記のリンクが未設定です</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          <p>外部のマイページURLを設定すると、自動で遷移できるようになります。</p>
          <div className="text-xs">
            <p>環境変数に `HEAVEN_MY_PAGE_URL` を設定してください。</p>
          </div>
          <Button asChild variant="outline">
            <Link href="/cast/dashboard">ダッシュボードに戻る</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
