'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Check, Copy, MessageCircle, ShieldCheck } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'

interface CastLineLinkGuideProps {
  castId: string
}

const LINE_OFFICIAL_URL = 'https://lin.ee/eht43Ug'

export function CastLineLinkGuide({ castId }: CastLineLinkGuideProps) {
  const [copied, setCopied] = useState(false)
  const { toast } = useToast()

  const registrationCommand = `reg ${castId}`

  const copyCommand = async () => {
    try {
      await navigator.clipboard.writeText(registrationCommand)
      setCopied(true)
      toast({
        title: 'コピーしました',
        description: 'LINEのトークに貼り付けて送信してください。',
      })
      setTimeout(() => setCopied(false), 1800)
    } catch (error) {
      console.error('Failed to copy LINE registration command:', error)
      toast({
        title: 'コピーに失敗しました',
        description: 'ブラウザの設定でコピーを許可するか、手動で選択してください。',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>LINE連携のやり方</CardTitle>
          <CardDescription>公式LINEに1行送るだけで、マイページとLINEを紐づけできます。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <Step
              title="1. 公式LINEを追加"
              description="下のボタンから友だち追加してください。"
            />
            <Step
              title="2. コマンドを送信"
              description={`トークで「${registrationCommand}」を送ってください。`}
            />
            <Step
              title="3. 結果を確認"
              description="成功・失敗がLINEに返信されます。"
            />
          </div>
          <div className="rounded-lg border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
            すでに別のキャストに紐づいているLINEアカウントは自動でブロックされ、失敗メッセージが送られます。
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>LINEに送るコマンド</CardTitle>
            <CardDescription>この1行をそのままLINEに送信してください。</CardDescription>
          </div>
          <Badge variant="secondary" className="w-fit text-xs">
            あなたのID: {castId}
          </Badge>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <code className="flex-1 rounded-md bg-muted px-3 py-2 font-mono text-sm text-foreground">
              {registrationCommand}
            </code>
            <div className="flex gap-2 sm:w-auto">
              <Button variant="outline" onClick={copyCommand} className="w-full sm:w-auto">
                {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                {copied ? 'コピー済み' : 'コピー'}
              </Button>
              <Button asChild>
                <Link href={LINE_OFFICIAL_URL} target="_blank" rel="noreferrer">
                  <MessageCircle className="mr-2 h-4 w-4" />
                  LINEを開く
                </Link>
              </Button>
            </div>
          </div>
          <div className="rounded-md border border-dashed bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
            送信後、管理画面のキャスト詳細に「LINEユーザーID」が自動で表示されます。予約時のLINE通知にも使われます。
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>うまくいかないとき</CardTitle>
          <CardDescription>下記を確認して再度お試しください。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <TroubleshootingItem text="公式LINEが友だち追加されているか確認してください。" />
          <TroubleshootingItem text="コマンドのIDが間違っていないかご確認ください（上のコピー推奨）。" />
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
