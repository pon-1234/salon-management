'use client'

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from 'react'
import { Loader2, RefreshCcw, Send, ImagePlus } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useToast } from '@/components/ui/use-toast'
import { cn } from '@/lib/utils'
import type { Message } from '@/lib/types/chat'
import { ChatAttachmentGallery } from '@/components/chat/chat-attachment-gallery'
import { ChatAttachmentPreviewList } from '@/components/chat/chat-attachment-previews'
import { useChatAttachments } from '@/hooks/use-chat-attachments'

interface SimpleChatPanelProps {
  endpoint: string
  title: string
  description: string
  senderRole: 'cast' | 'customer'
  placeholder?: string
  emptyState?: {
    title: string
    description: string
  }
  maxAttachments?: number
}

export function SimpleChatPanel({
  endpoint,
  title,
  description,
  senderRole,
  placeholder = 'メッセージを入力してください',
  emptyState = {
    title: 'まだメッセージはありません。',
    description: '連絡事項があれば、下のフォームから送信してください。',
  },
  maxAttachments = 5,
}: SimpleChatPanelProps) {
  const { toast } = useToast()
  const [messages, setMessages] = useState<Message[]>([])
  const [draft, setDraft] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isPending, startTransition] = useTransition()
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { drafts: attachmentDrafts, addFiles, removeAttachment, reset, readyAttachments, hasUploading } =
    useChatAttachments(maxAttachments)

  const loadMessages = useCallback(async () => {
    setIsLoading(true)
    try {
      const response = await fetch(endpoint, { cache: 'no-store' })
      if (!response.ok) {
        throw new Error('チャット履歴の取得に失敗しました。')
      }
      const payload = await response.json()
      const data = Array.isArray(payload) ? payload : []
      setMessages(
        data.map((message) => ({
          ...message,
          attachments: Array.isArray(message.attachments) ? message.attachments : [],
        }))
      )
    } catch (error) {
      toast({
        title: '読み込みエラー',
        description: error instanceof Error ? error.message : undefined,
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }, [endpoint, toast])

  useEffect(() => {
    void loadMessages()
  }, [loadMessages])

  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight
    }
  }, [messages])

  const handleSend = useCallback(() => {
    if (hasUploading) {
      toast({
        title: 'アップロード中です',
        description: '画像のアップロード完了をお待ちください。',
      })
      return
    }

    const trimmed = draft.trim()
    if (!trimmed && readyAttachments.length === 0) {
      return
    }

    startTransition(async () => {
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            content: trimmed,
            attachments: readyAttachments,
          }),
        })

        if (!response.ok) {
          const payload = await response.json().catch(() => ({}))
          throw new Error(payload.error ?? 'メッセージの送信に失敗しました。')
        }

        const created = await response.json()
        setMessages((prev) => [
          ...prev,
          {
            ...created,
            attachments: Array.isArray(created.attachments) ? created.attachments : [],
          },
        ])
        setDraft('')
        reset()
      } catch (error) {
        toast({
          title: '送信エラー',
          description: error instanceof Error ? error.message : undefined,
          variant: 'destructive',
        })
      }
    })
  }, [draft, endpoint, hasUploading, readyAttachments, reset, toast])

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
  const canSend = !isPending && !hasUploading && (draft.trim().length > 0 || readyAttachments.length > 0)

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (files?.length) {
      void addFiles(files)
      event.target.value = ''
    }
  }

  return (
    <Card className="min-h-[420px] md:min-h-[500px]">
      <CardHeader className="flex flex-col gap-3 space-y-0 md:flex-row md:items-center md:justify-between">
        <div>
          <CardTitle className="text-lg">{title}</CardTitle>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => void loadMessages()} disabled={isLoading || isPending}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCcw className="mr-2 h-4 w-4" />}
            再読み込み
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex h-[65vh] flex-col gap-4 md:h-[480px]">
        <div className="flex-1 overflow-hidden rounded-md border">
          <div className="h-full overflow-y-auto" ref={scrollContainerRef}>
            {isLoading ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 読み込み中です...
              </div>
            ) : hasMessages ? (
              <div className="space-y-4 p-4">
                {messages.map((message) => (
                  <ChatBubble key={message.id} message={message} selfSender={senderRole} />
                ))}
              </div>
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-sm text-muted-foreground text-center px-4">
                <p>{emptyState.title}</p>
                <p>{emptyState.description}</p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`${placeholder} (⌘/Ctrl + Enter で送信)`}
            rows={3}
            className="resize-none"
            disabled={isPending}
          />

          <ChatAttachmentPreviewList attachments={attachmentDrafts} onRemove={removeAttachment} />

          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept="image/png,image/jpeg,image/webp"
                multiple
                onChange={handleFileChange}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-xs text-primary"
                onClick={() => fileInputRef.current?.click()}
                disabled={attachmentDrafts.length >= maxAttachments}
              >
                <ImagePlus className="mr-2 h-4 w-4" />
                画像を添付
              </Button>
              <span>
                {attachmentDrafts.length}/{maxAttachments} 件の画像
              </span>
            </div>
            <Button onClick={handleSend} disabled={!canSend}>
              {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              送信
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function ChatBubble({ message, selfSender }: { message: Message; selfSender: 'cast' | 'customer' }) {
  const isSelf = message.sender === selfSender
  const timestampLabel = useMemo(() => {
    const date = new Date(message.timestamp)
    if (Number.isNaN(date.getTime())) {
      return ''
    }
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }, [message.timestamp])

  const attachments = Array.isArray(message.attachments) ? message.attachments : []

  return (
    <div className={cn('flex gap-3', isSelf ? 'justify-end' : 'justify-start')}>
      {!isSelf && (
        <Avatar className="h-8 w-8">
          <AvatarFallback className="bg-primary/10 text-primary">運営</AvatarFallback>
        </Avatar>
      )}
      <div
        className={cn(
          'max-w-lg rounded-2xl px-4 py-3 text-sm shadow-sm',
          isSelf ? 'bg-primary text-white' : 'bg-muted text-foreground'
        )}
      >
        {message.content?.trim() ? (
          <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
        ) : attachments.length === 0 ? (
          <p className="italic text-white/80">画像を送信しました</p>
        ) : null}
        <ChatAttachmentGallery attachments={attachments} align={isSelf ? 'right' : 'left'} />
        <div
          className={cn(
            'mt-2 flex items-center gap-2 text-[11px]',
            isSelf ? 'text-primary-foreground/70' : 'text-muted-foreground/80'
          )}
        >
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
