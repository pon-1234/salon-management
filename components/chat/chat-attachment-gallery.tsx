'use client'

/* eslint-disable @next/next/no-img-element */

import type { ChatAttachment } from '@/lib/types/chat'
import { cn } from '@/lib/utils'

interface ChatAttachmentGalleryProps {
  attachments?: ChatAttachment[]
  align?: 'left' | 'right'
}

export function ChatAttachmentGallery({ attachments, align = 'left' }: ChatAttachmentGalleryProps) {
  if (!attachments || attachments.length === 0) {
    return null
  }

  return (
    <div className={cn('mt-3 grid gap-2', attachments.length === 1 ? 'grid-cols-1' : 'grid-cols-2')}>
      {attachments.map((attachment) => (
        <button
          key={`${attachment.url}-${attachment.name ?? ''}`}
          type="button"
          className={cn(
            'overflow-hidden rounded-lg border border-white/20 shadow-sm transition-transform hover:scale-[1.02]',
            align === 'right' ? 'bg-white/10' : 'bg-white'
          )}
          onClick={() => {
            window.open(attachment.url, '_blank', 'noopener,noreferrer')
          }}
        >
          <img
            src={attachment.url}
            alt={attachment.name ?? 'チャット画像'}
            className="h-32 w-full object-cover"
            loading="lazy"
          />
        </button>
      ))}
    </div>
  )
}
