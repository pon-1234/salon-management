'use client'

import { useCallback, useMemo, useState } from 'react'
import imageCompression from 'browser-image-compression'
import type { ChatAttachment } from '@/lib/types/chat'

type DraftStatus = 'uploading' | 'ready' | 'error'

export interface AttachmentDraft {
  id: string
  name: string
  size: number
  status: DraftStatus
  url?: string
  type: 'image'
  error?: string
  contentType?: string
  path?: string
}

function generateId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return Math.random().toString(36).slice(2)
}

async function compressImage(file: File): Promise<File> {
  const options = {
    maxSizeMB: 1,
    maxWidthOrHeight: 1920,
    useWebWorker: true,
    initialQuality: 0.8,
  }
  try {
    return await imageCompression(file, options)
  } catch (error) {
    console.warn('Image compression failed, falling back to original file.', error)
    return file
  }
}

async function uploadImage(
  file: File
): Promise<{ url: string; filename: string; path?: string }> {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('folder', 'chat')

  const response = await fetch('/api/upload', {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}))
    throw new Error(payload.error ?? '画像のアップロードに失敗しました。')
  }

  const payload = await response.json()
  if (!payload?.url) {
    throw new Error('画像URLの取得に失敗しました。')
  }
  return {
    url: payload.url as string,
    filename: String(payload.filename ?? file.name),
    path: typeof payload.path === 'string' ? payload.path : undefined,
  }
}

export function useChatAttachments(maxCount = 5) {
  const [drafts, setDrafts] = useState<AttachmentDraft[]>([])

  const addFiles = useCallback(
    async (files: FileList | File[]) => {
      const currentReady = drafts.length
      const remainingSlots = Math.max(0, maxCount - currentReady)
      if (remainingSlots === 0) return

      const fileArray = Array.from(files).slice(0, remainingSlots)

      await Promise.all(
        fileArray.map(async (file) => {
          const id = generateId()
          setDrafts((prev) => [
            ...prev,
            {
              id,
              name: file.name,
              size: file.size,
              status: 'uploading',
              type: 'image',
              contentType: file.type,
            },
          ])

          try {
            const compressed = await compressImage(file)
            const { url, path } = await uploadImage(compressed)
            setDrafts((prev) =>
              prev.map((draft) =>
                draft.id === id
                  ? {
                      ...draft,
                      url,
                      status: 'ready',
                      size: compressed.size,
                      contentType: compressed.type || file.type,
                      path,
                    }
                  : draft
              )
            )
          } catch (error) {
            setDrafts((prev) =>
              prev.map((draft) =>
                draft.id === id
                  ? {
                      ...draft,
                      status: 'error',
                      error: error instanceof Error ? error.message : 'アップロードに失敗しました。',
                    }
                  : draft
              )
            )
          }
        })
      )
    },
    [drafts.length, maxCount]
  )

  const removeAttachment = useCallback((id: string) => {
    setDrafts((prev) => prev.filter((draft) => draft.id !== id))
  }, [])

  const reset = useCallback(() => {
    setDrafts([])
  }, [])

  const readyAttachments = useMemo(
    () =>
      drafts
        .filter((draft) => draft.status === 'ready' && draft.url)
        .map(
          (draft): ChatAttachment => ({
            type: 'image',
            url: draft.url as string,
            name: draft.name,
            size: draft.size,
            contentType: draft.contentType,
            path: draft.path,
          })
        ),
    [drafts]
  )

  const hasUploading = drafts.some((draft) => draft.status === 'uploading')

  return {
    drafts,
    addFiles,
    removeAttachment,
    reset,
    readyAttachments,
    hasUploading,
  }
}
