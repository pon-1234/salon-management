'use client'

/* eslint-disable @next/next/no-img-element */

import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import type { ChatAttachment } from '@/lib/types/chat'
import { cn } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface ChatAttachmentGalleryProps {
  attachments?: ChatAttachment[]
  align?: 'left' | 'right'
}

export function ChatAttachmentGallery({ attachments, align = 'left' }: ChatAttachmentGalleryProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const images = useMemo(
    () => (attachments ?? []).filter((attachment) => attachment.type === 'image'),
    [attachments]
  )

  if (images.length === 0) {
    return null
  }

  const open = activeIndex !== null
  const current = activeIndex !== null ? images[activeIndex] : null

  const handlePrev = () => {
    if (activeIndex === null) return
    setActiveIndex((prev) => {
      if (prev === null) return prev
      return (prev - 1 + images.length) % images.length
    })
  }

  const handleNext = () => {
    if (activeIndex === null) return
    setActiveIndex((prev) => {
      if (prev === null) return prev
      return (prev + 1) % images.length
    })
  }

  return (
    <>
      <div className={cn('mt-3 grid gap-2', images.length === 1 ? 'grid-cols-1' : 'grid-cols-2')}>
        {images.map((attachment, index) => (
          <button
            key={`${attachment.url}-${attachment.name ?? ''}`}
            type="button"
            className={cn(
              'overflow-hidden rounded-lg border border-white/20 shadow-sm transition-transform hover:scale-[1.02]',
              align === 'right' ? 'bg-white/10' : 'bg-white'
            )}
            onClick={() => setActiveIndex(index)}
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
      <Dialog open={open} onOpenChange={(next) => setActiveIndex(next ? activeIndex : null)}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-hidden bg-black/90 p-0 text-white">
          {current ? (
            <div className="relative flex h-full flex-col">
              <DialogHeader className="px-4 pt-4 text-left text-white">
                <DialogTitle>{current.name ?? '画像'}</DialogTitle>
                <DialogDescription className="text-sm text-white/70">
                  {activeIndex !== null ? `${activeIndex + 1} / ${images.length}` : ''}
                </DialogDescription>
              </DialogHeader>
              <button
                type="button"
                className="absolute right-4 top-4 rounded-full bg-black/50 p-1 text-white hover:bg-black/70"
                onClick={() => setActiveIndex(null)}
              >
                <X className="h-5 w-5" />
              </button>
              <div className="flex flex-1 items-center justify-center px-4 pb-10 pt-4">
                <img
                  src={current.url}
                  alt={current.name ?? 'チャット画像'}
                  className="max-h-full max-w-full object-contain"
                />
              </div>
              {images.length > 1 ? (
                <>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-black/40 text-white hover:bg-black/60"
                    onClick={handlePrev}
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-black/40 text-white hover:bg-black/60"
                    onClick={handleNext}
                  >
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                </>
              ) : null}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  )
}
