import type { Prisma } from '@prisma/client'
import type { ChatAttachment } from '@/lib/types/chat'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function normalizeChatAttachments(
  raw: Prisma.JsonValue | ChatAttachment[] | null | undefined
): ChatAttachment[] {
  if (!raw) {
    return []
  }

  const candidates: unknown = Array.isArray(raw) ? raw : raw
  if (!Array.isArray(candidates)) {
    return []
  }

  return candidates
    .filter((item): item is Record<string, unknown> => isRecord(item))
    .map((item) => ({
      type: (item.type ?? 'image') as ChatAttachment['type'],
      url: String(item.url ?? ''),
      name: typeof item.name === 'string' ? item.name : undefined,
      size: typeof item.size === 'number' ? item.size : undefined,
      contentType: typeof item.contentType === 'string' ? item.contentType : undefined,
      width: typeof item.width === 'number' ? item.width : undefined,
      height: typeof item.height === 'number' ? item.height : undefined,
    }))
    .filter((item) => item.url.trim().length > 0)
}

export function buildChatPreview(
  content?: string | null,
  attachments?: Prisma.JsonValue | ChatAttachment[] | null
): string {
  const trimmed = (content ?? '').trim()
  if (trimmed.length > 0) {
    return trimmed
  }

  const files = normalizeChatAttachments(attachments)
  if (files.length === 0) {
    return ''
  }

  if (files.length === 1) {
    return '画像が送信されました'
  }
  return `画像が${files.length}件送信されました`
}
