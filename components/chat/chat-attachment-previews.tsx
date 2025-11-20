'use client'

/* eslint-disable @next/next/no-img-element */

import { X, ImageIcon, AlertCircle } from 'lucide-react'
import { AttachmentDraft } from '@/hooks/use-chat-attachments'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ChatAttachmentPreviewListProps {
  attachments: AttachmentDraft[]
  onRemove: (id: string) => void
}

export function ChatAttachmentPreviewList({ attachments, onRemove }: ChatAttachmentPreviewListProps) {
  if (attachments.length === 0) {
    return null
  }

  return (
    <div className="rounded-md border border-dashed border-gray-300 bg-gray-50 p-3">
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-gray-600">
        <ImageIcon className="h-3.5 w-3.5" />
        添付画像
      </div>
      <div className="flex flex-wrap gap-3">
        {attachments.map((attachment) => (
          <div
            key={attachment.id}
            className={cn(
              'relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-md bg-white shadow-sm',
              attachment.status === 'error' ? 'border border-red-200' : 'border border-gray-200'
            )}
          >
            {attachment.url && attachment.status !== 'error' ? (
              <img
                src={attachment.url}
                alt={attachment.name}
                className="h-full w-full object-cover"
                draggable={false}
              />
            ) : attachment.status === 'uploading' ? (
              <div className="flex flex-col items-center justify-center text-[11px] text-gray-500">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-gray-500" />
                <span className="mt-1">アップロード中...</span>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-[11px] text-red-600">
                <AlertCircle className="h-5 w-5" />
                <span className="mt-1 text-center">{attachment.error ?? 'エラー'}</span>
              </div>
            )}
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="absolute right-1 top-1 h-6 w-6 rounded-full bg-white/90 text-gray-700 shadow"
              onClick={() => onRemove(attachment.id)}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  )
}
