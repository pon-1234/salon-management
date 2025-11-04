'use client'

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { format } from 'date-fns'
import { ja } from 'date-fns/locale'
import { Loader2, Send } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useToast } from '@/components/ui/use-toast'
import type { Message } from '@/lib/types/chat'
import { cn } from '@/lib/utils'

const ENDPOINT = '/api/cast-portal/chat'

export function CastChatPanel() {
  const { toast } = useToast()
  const [messages, setMessages] = useState<Message[]>([])
  const [draft, setDraft] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isPending, startTransition] = useTransition()
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  const loadMessages = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await fetch(ENDPOINT, {
        cache: 'no-store',
      })
      if (!response.ok) {
        throw new Error('チャット履歴の取得に失敗しました。')
      }

      const payload = await response.json()
      const data = Array.isArray(payload) ? payload : []
      setMessages(data)
    } catch (error) {
      toast({
        title: '読み込みエラー',
        description: error instanceof Error ? error.message : undefined,
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }, [toast])

  useEffect(() => {
    void loadMessages()
  }, [loadMessages])

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight
    }
  }, [messages])

  const handleSend = useCallback(() => {
    if (!draft.trim()) {
      return
    }

    startTransition(async () => {
      try {
        const response = await fetch(ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ content: draft.trim() }),
        })

        if (!response.ok) {
          const payload = await response.json().catch(() => ({}))
          throw new Error(payload.error ?? 'メッセージの送信に失敗しました。')
        }

        const created = await response.json()
        setMessages((prev) => [...prev, created])
        setDraft('')
      } catch (error) {
        toast({
          title: '送信エラー',
          description: error instanceof Error ? error.message : undefined,
          variant: 'destructive',
        })
      }
    })
  }, [draft, toast])

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        handleSend()
      }
    },
    [handleSend]
  )

  const hasMessages = messages.length > 0

  return (
    <Card className="min-h-[480px]">
      <CardHeader className="flex flex-col gap-3 space-y-0 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle className="text-lg">店舗スタッフとのチャット</CardTitle>
          <p className="text-sm text-muted-foreground">
            運営スタッフとの連絡にご利用ください。要対応の内容はできるだけ本文の先頭に記載してください。
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => void loadMessages()} disabled={isLoading || isPending}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            再読み込み
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex h-[480px] flex-col gap-4">
        <div className="flex-1 overflow-hidden rounded-md border">
          <ScrollArea className="h-full" ref={scrollAreaRef}>
            {isLoading ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 読み込み中です...
              </div>
            ) : hasMessages ? (
              <div className="space-y-4 p-4">
                {messages.map((message) => (
                  <ChatBubble key={message.id} message={message} />
                ))}
              </div>
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
                <p>まだメッセージはありません。</p>
                <p>問い合わせや報告があれば、下のフォームから送信してください。</p>
              </div>
            )}
          </ScrollArea>
        </div>

        <div className="space-y-2">
          <Textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="スタッフへのメッセージを入力してください (⌘/Ctrl + Enter で送信)"
            rows={3}
            className="resize-none"
            disabled={isPending}
          />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>最大 1000 文字</span>
            <Button onClick={handleSend} disabled={isPending || !draft.trim()}>
              {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              送信
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function ChatBubble({ message }: { message: Message }) {
  const isSelf = message.sender === 'cast'
  const timestampLabel = useMemo(() => {
    const date = new Date(message.timestamp)
    if (Number.isNaN(date.getTime())) {
      return ''
    }
    return format(date, 'M月d日 HH:mm', { locale: ja })
  }, [message.timestamp])

  return (
    <div className={cn('flex gap-3', isSelf ? 'justify-end' : 'justify-start')}>
      {!isSelf && (
        <Avatar className="h-8 w-8">
          <AvatarFallback className="bg-primary/10 text-primary">運営</AvatarFallback>
        </Avatar>
      )}
      <div className={cn('max-w-lg rounded-2xl px-4 py-3 text-sm shadow-sm', isSelf ? 'bg-primary text-white' : 'bg-muted text-foreground')}
      >
        <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
        <div className={cn('mt-2 flex items-center gap-2 text-[11px]', isSelf ? 'text-primary-foreground/70' : 'text-muted-foreground/80')}>
          <span>{timestampLabel}</span>
          {isSelf ? (
            <span>{message.readStatus === '既読' ? '既読' : '送信済み'}</span>
          ) : null}
        </div>
      </div>
      {isSelf && (
        <Avatar className="h-8 w-8">
          <AvatarFallback className="bg-primary/10 text-primary">自分</AvatarFallback>
        </Avatar>
      )}
    </div>
  )
}
