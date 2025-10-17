'use client'

import Link from 'next/link'
import { Header } from '@/components/header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, FileText, MessageSquare } from 'lucide-react'

export default function TemplatesSettingsPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-6 pb-12 pt-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="h-8 w-8 text-purple-600" />
            <div>
              <h1 className="text-2xl font-semibold">定型文</h1>
              <p className="text-sm text-muted-foreground">
                メッセージ・メール・チャット対応で使い回す定型文を管理する画面です。まずはUIの土台のみ用意しています。
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
            <CardTitle>定型文コレクション（準備中）</CardTitle>
            <CardDescription>
              自動返信やフォローアップメールなど、用途別にグループ化して管理する想定です。API連携は後続タスクで実施します。
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {['予約関連', '顧客対応', '支払い／請求', 'その他'].map((category) => (
              <div
                key={category}
                className="flex flex-col gap-3 rounded-md border border-dashed border-muted-foreground/40 p-4"
              >
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{category}</Badge>
                  <MessageSquare className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">
                  このカテゴリーの定型文をここに表示します。本文・差し込み変数・利用チャネルなどを後で設定できるようにします。
                </p>
                <Button variant="ghost" size="sm" disabled>
                  下書きを追加（準備中）
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>運用メモ</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              - 後ほどテンプレートのカテゴリ、件名、本文、差し込み変数、最終更新者などのフィールドを検討します。
            </p>
            <p>
              - メールだけでなくSMSやチャットbotでの利用も想定して、チャネルごとの対応状況を UI に加える予定です。
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
