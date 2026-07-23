'use client'

/**
 * @design_doc   docs/ROUTING_STRUCTURE.md secure LINE cast registration flow
 * @related_to   Admin cast detail issues the one-time command; LINE webhook consumes it
 * @known_issues Casts must receive each short-lived command from an authorized administrator
 */
import Link from 'next/link'
import { MessageCircle, ShieldCheck } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

const LINE_OFFICIAL_URL = 'https://lin.ee/eht43Ug'

export function CastLineLinkGuide() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>LINE連携のやり方</CardTitle>
          <CardDescription>
            管理者が発行した短時間有効・一度限りの招待コマンドでLINEを紐づけます。
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <Step title="1. 公式LINEを追加" description="下のボタンから友だち追加してください。" />
            <Step
              title="2. 招待コマンドを受け取る"
              description="店舗の管理者にLINE連携用の招待コマンドを発行してもらってください。"
            />
            <Step
              title="3. コマンドを送信"
              description="受け取ったコマンドを有効期限内にトークへ貼り付けてください。"
            />
          </div>
          <div className="rounded-lg border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
            すでに別のキャストに紐づいているLINEアカウントは自動でブロックされ、失敗メッセージが送られます。
          </div>
        </CardContent>
      </Card>

      <Button asChild>
        <Link href={LINE_OFFICIAL_URL} target="_blank" rel="noreferrer">
          <MessageCircle className="mr-2 h-4 w-4" />
          公式LINEを開く
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>うまくいかないとき</CardTitle>
          <CardDescription>下記を確認して再度お試しください。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <TroubleshootingItem text="公式LINEが友だち追加されているか確認してください。" />
          <TroubleshootingItem text="招待コマンドの有効期限が切れていないか、使用済みでないか確認してください。" />
          <TroubleshootingItem text="別のLINEアカウントに紐づけ済みの場合は、そちらの紐づけ解除が必要です。" />
        </CardContent>
      </Card>
    </div>
  )
}

function Step({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-lg border bg-white/70 p-3 shadow-sm">
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <ShieldCheck className="h-4 w-4 text-emerald-600" />
        <span>{title}</span>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  )
}

function TroubleshootingItem({ text }: { text: string }) {
  return (
    <div className="flex gap-2">
      <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-muted-foreground/70" />
      <p>{text}</p>
    </div>
  )
}
