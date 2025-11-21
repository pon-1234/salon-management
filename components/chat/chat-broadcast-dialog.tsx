'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import { useChatAttachments } from '@/hooks/use-chat-attachments'
import { ChatAttachmentPreviewList } from '@/components/chat/chat-attachment-previews'
import { cn } from '@/lib/utils'

type BroadcastTarget = 'customers' | 'casts'

interface ChatBroadcastDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const TARGET_META: Record<BroadcastTarget, { label: string; description: string }> = {
  customers: {
    label: '全顧客',
    description: '会員登録しているすべてのお客様にメッセージを送信します。',
  },
  casts: {
    label: '全キャスト',
    description: '在籍キャスト全員にメッセージを送信します。',
  },
}

export function ChatBroadcastDialog({ open, onOpenChange }: ChatBroadcastDialogProps) {
  const { toast } = useToast()
  const [target, setTarget] = useState<BroadcastTarget>('customers')
  const [message, setMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { drafts, addFiles, removeAttachment, reset, readyAttachments, hasUploading } =
    useChatAttachments(5)

  const handleClose = () => {
    if (isSubmitting) return
    setMessage('')
    setTarget('customers')
    reset()
    onOpenChange(false)
  }

  const handleSubmit = async () => {
    if (hasUploading) {
      toast({
        title: 'アップロード中です',
        description: '画像アップロード完了後に送信してください。',
      })
      return
    }

    if (message.trim().length === 0 && readyAttachments.length === 0) {
      toast({
        title: '内容を入力してください',
        variant: 'destructive',
      })
      return
    }

    setIsSubmitting(true)
    try {
      const response = await fetch('/api/chat/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          target,
          content: message,
          attachments: readyAttachments,
        }),
      })

      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(payload?.error ?? '一括送信に失敗しました')
      }

      toast({
        title: '一括送信が完了しました',
        description: `${TARGET_META[target].label}へ ${payload?.data?.count ?? 0} 件送信`,
      })
      setMessage('')
      reset()
      onOpenChange(false)
    } catch (error) {
      toast({
        title: '送信エラー',
        description: error instanceof Error ? error.message : undefined,
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>チャット一括送信</DialogTitle>
          <DialogDescription>
            選択した対象に、チャット通知を一括送信します。送信内容は編集できませんのでご注意ください。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium">送信対象</Label>
            <RadioGroup
              value={target}
              onValueChange={(value) => setTarget((value as BroadcastTarget) ?? 'customers')}
              className="mt-3 grid gap-3 sm:grid-cols-2"
            >
              {Object.entries(TARGET_META).map(([key, meta]) => (
                <div
                  key={key}
                  className={cn(
                    'flex items-start gap-3 rounded-lg border p-3',
                    target === key ? 'border-purple-500 bg-purple-50' : 'border-gray-200'
                  )}
                >
                  <RadioGroupItem value={key} id={`target-${key}`} className="mt-1" />
                  <Label htmlFor={`target-${key}`} className="space-y-1">
                    <div className="font-semibold">{meta.label}</div>
                    <p className="text-xs text-muted-foreground">{meta.description}</p>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div>
            <Label className="text-sm font-medium">メッセージ本文</Label>
            <Textarea
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="全員に送る重要なお知らせを入力してください"
              rows={6}
              className="mt-2"
            />
            <div className="mt-1 text-right text-xs text-muted-foreground">
              {message.length}/1000
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">画像（最大5枚）</Label>
              <label
                htmlFor="broadcast-attachment"
                className={cn(
                  'inline-flex cursor-pointer items-center rounded-md border px-2 py-1 text-xs',
                  hasUploading ? 'opacity-50' : 'hover:bg-muted'
                )}
              >
                <input
                  id="broadcast-attachment"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  multiple
                  className="hidden"
                  onChange={(event) => {
                    const files = event.target.files
                    if (files?.length) {
                      void addFiles(files)
                      event.target.value = ''
                    }
                  }}
                  disabled={drafts.length >= 5}
                />
                <span>画像を追加</span>
              </label>
            </div>
            <ChatAttachmentPreviewList attachments={drafts} onRemove={removeAttachment} />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
            閉じる
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? '送信中...' : '一括送信'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
