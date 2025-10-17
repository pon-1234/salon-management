'use client'

import Link from 'next/link'
import { Header } from '@/components/header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Link2, PlusCircle } from 'lucide-react'

export default function MutualLinksPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 pb-12 pt-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link2 className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-semibold">相互リンク</h1>
              <p className="text-sm text-muted-foreground">
                提携サイトやメディアとの相互リンクを管理します。リンクカードの一覧と詳細は後ほど接続できます。
              </p>
            </div>
          </div>
          <Button variant="outline" asChild>
            <Link href="/admin/settings">
              <ArrowLeft className="mr-2 h-4 w-4" />
              設定一覧へ戻る
            </Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>リンク一覧（準備中）</CardTitle>
            <CardDescription>
              ここにメディアや店舗との相互リンクをカード形式で表示します。現状はUIのみが用意されています。
            </CardDescription>
          </CardHeader>
          <CardContent className="rounded-md border border-dashed border-border py-12 text-center text-muted-foreground">
            <Link2 className="mx-auto mb-4 h-10 w-10 text-muted-foreground/60" />
            <p className="text-base font-medium text-foreground">相互リンク項目を追加しましょう</p>
            <p className="mx-auto mb-6 max-w-md text-sm">
              提携先のサイト名やURL、紹介文などを登録し、公開状態を切り替えられるUIを後で実装します。
            </p>
            <Button disabled>
              <PlusCircle className="mr-2 h-4 w-4" />
              新しいリンクを追加（準備中）
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>管理メモ</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <div>
              <Badge variant="outline" className="mb-2">
                推奨項目
              </Badge>
              <p>
                リンク名、URL、表示ステータス、紹介文、優先度などを保持できる設計を想定しています。必要に応じて追記してください。
              </p>
            </div>
            <div>
              <Badge variant="outline" className="mb-2">
                公開フロー
              </Badge>
              <p>
                今後ステータス管理（公開／非公開）やクリック数などのレポートを追加する場合は、この画面に指標カードを追加する予定です。
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
