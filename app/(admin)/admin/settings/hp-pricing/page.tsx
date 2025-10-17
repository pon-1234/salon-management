'use client'

import Link from 'next/link'
import { Header } from '@/components/header'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, CreditCard, Edit, PlusCircle } from 'lucide-react'

export default function HpPricingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-6 pb-12 pt-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CreditCard className="h-8 w-8 text-emerald-600" />
            <div>
              <h1 className="text-2xl font-semibold">HP料金情報</h1>
              <p className="text-sm text-muted-foreground">
                ホームページに掲載する料金表の構成を管理します。まずは下書きレイアウトを作成し、後から内容を更新できます。
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

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>料金テーブル（準備中）</CardTitle>
              <CardDescription>
                ここにホームページ用の料金プランやオプション料金を配置します。後ほど実際のAPI/DBと接続して更新できます。
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center justify-center gap-4 rounded-md border border-dashed border-muted-foreground/30 py-12 text-center text-muted-foreground">
              <CreditCard className="h-10 w-10 text-muted-foreground/60" />
              <div>
                <p className="text-base font-medium text-foreground">料金セクションを作成しましょう</p>
                <p className="text-sm">
                  「コース」「オプション」「追加料金」などホームページに掲載するカテゴリーを決めたら、ここに入力欄を追加してください。
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <Button disabled>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  新しい料金ブロックを追加
                </Button>
                <Button variant="ghost" disabled>
                  <Edit className="mr-2 h-4 w-4" />
                  既存レイアウトを編集
                </Button>
              </div>
              <small className="text-xs text-muted-foreground">
                ※ 現段階ではUIのみが用意されています。後ほど管理画面/APIと接続し実データを保存します。
              </small>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>ヒント</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground">
              <div>
                <Badge variant="outline" className="mb-2">
                  構成案
                </Badge>
                <p>
                  「基本コース」「延長料金」「オプション」「各種割引」など、サイトでよく参照される順序を意識して構成しましょう。
                </p>
              </div>
              <div>
                <Badge variant="outline" className="mb-2">
                  公開前チェック
                </Badge>
                <p>
                  料金表は頻繁に変更されます。公開前に利用中の価格と差異がないか、担当スタッフとレビューするフローを準備することをおすすめします。
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
