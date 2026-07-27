/**
 * @design_doc   docs/VPS_DEPLOYMENT.md
 * @related_to   normalizeChatAttachments - Validates persisted attachment metadata; StorageService - Deletes retained files
 * @known_issues docs/VPS_DEPLOYMENT.md
 */
import type { Prisma } from '@prisma/client'
import { normalizeChatAttachments } from '@/lib/chat/attachments'
import type { DeleteResult } from '@/lib/storage'
import type { ChatAttachment } from '@/lib/types/chat'

export const CHAT_ATTACHMENT_PRUNE_ACKNOWLEDGEMENT = 'I_UNDERSTAND_THIS_MODIFIES_PRODUCTION_DATA'

const MIN_RETENTION_DAYS = 30
const MAX_RETENTION_DAYS = 36_500

interface PrunableMessage {
  id: string
  attachments: Prisma.JsonValue | ChatAttachment[] | null
}

interface PruneMessageDependencies {
  deleteFile: (path: string) => Promise<DeleteResult>
  clearAttachments: (messageId: string) => Promise<void>
}

export interface PruneMessageResult {
  cleared: boolean
  filesRemoved: number
  error: string | null
}

export function parseChatAttachmentRetentionDays(value: string | undefined): number {
  const normalized = value?.trim() ?? ''
  if (!/^\d+$/u.test(normalized)) {
    throw new Error('CHAT_ATTACHMENT_RETENTION_DAYS は整数で明示してください')
  }

  const days = Number(normalized)
  if (!Number.isSafeInteger(days) || days < MIN_RETENTION_DAYS || days > MAX_RETENTION_DAYS) {
    throw new Error(
      `CHAT_ATTACHMENT_RETENTION_DAYS は ${MIN_RETENTION_DAYS}〜${MAX_RETENTION_DAYS} の整数で指定してください`
    )
  }

  return days
}

export function assertChatAttachmentPruneAcknowledged(value: string | undefined): void {
  if (value !== CHAT_ATTACHMENT_PRUNE_ACKNOWLEDGEMENT) {
    throw new Error(
      `添付ファイル削除を実行するには CHAT_ATTACHMENT_PRUNE_ACKNOWLEDGEMENT=${CHAT_ATTACHMENT_PRUNE_ACKNOWLEDGEMENT} が必要です`
    )
  }
}

export async function pruneMessageAttachments(
  message: PrunableMessage,
  dependencies: PruneMessageDependencies
): Promise<PruneMessageResult> {
  const attachments = normalizeChatAttachments(message.attachments)
  if (attachments.length === 0) {
    return { cleared: false, filesRemoved: 0, error: null }
  }

  const paths: string[] = []
  for (const attachment of attachments) {
    const path = attachment.path?.trim()
    if (!path) {
      return {
        cleared: false,
        filesRemoved: 0,
        error: '添付ファイルにストレージパスがありません',
      }
    }
    paths.push(path)
  }

  let filesRemoved = 0
  for (const path of new Set(paths)) {
    let result: DeleteResult
    try {
      result = await dependencies.deleteFile(path)
    } catch (error) {
      return {
        cleared: false,
        filesRemoved,
        error: error instanceof Error ? error.message : 'ストレージからの削除に失敗しました',
      }
    }

    if (!result.success) {
      return {
        cleared: false,
        filesRemoved,
        error: result.error ?? 'ストレージからの削除に失敗しました',
      }
    }
    filesRemoved += 1
  }

  await dependencies.clearAttachments(message.id)
  return { cleared: true, filesRemoved, error: null }
}
