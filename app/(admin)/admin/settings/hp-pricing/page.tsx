/**
 * @design_doc   ui-improvement-instructions.md U-6 admin page header
 * @related_to   CourseInfoPage and OptionInfoPage persist the public pricing sources
 * @known_issues Additional-fee persistence requires an approved store-scoped model
 */
import NextLink from 'next/link'
import { PageHeader } from '@/components/admin/page-header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, BookOpen, CreditCard, Package } from 'lucide-react'

const pricingSources = [
  {
    title: 'コース料金',
    description: 'コース名・時間・料金・公開状態を編集します。',
    href: '/admin/settings/course-info',
    icon: BookOpen,
  },
  {
    title: 'オプション料金',
    description: 'オプション名・料金・公開範囲・売上配分を編集します。',
    href: '/admin/settings/option-info',
    icon: Package,
  },
] as const

export default function HpPricingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-6 pb-12 pt-8">
        <PageHeader
          title="HP料金情報"
          description="公開サイトに表示する料金データの編集先です。"
          backHref="/admin/settings"
          backLabel="設定一覧へ戻る"
          backIcon={ArrowLeft}
          icon={CreditCard}
        />

        <Card>
          <CardHeader>
            <CardTitle>料金データの編集</CardTitle>
            <CardDescription>
              公開サイトの料金は、この2つの実データから表示されます。変更内容は各編集画面で保存してください。
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            {pricingSources.map((source) => {
              const Icon = source.icon
              return (
                <div key={source.href} className="flex flex-col gap-4 rounded-lg border p-5">
                  <div className="flex items-center gap-3">
                    <Icon className="h-5 w-5 text-emerald-600" />
                    <h2 className="font-semibold">{source.title}</h2>
                  </div>
                  <p className="flex-1 text-sm text-muted-foreground">{source.description}</p>
                  <Button asChild>
                    <NextLink href={source.href}>{source.title}を編集</NextLink>
                  </Button>
                </div>
              )
            })}
          </CardContent>
        </Card>

        <p className="text-sm text-muted-foreground">
          保存後は公開ページの料金表示と予約画面の選択肢に反映されます。公開前に料金・時間・公開状態をご確認ください。
        </p>
      </main>
    </div>
  )
}
