/**
 * @design_doc   docs/VPS_DEPLOYMENT.md
 * @related_to   pruneMessageAttachments - Preserves metadata unless every storage deletion succeeds; Prisma Message - Stores attachment metadata
 * @known_issues docs/VPS_DEPLOYMENT.md
 */
import { Prisma, PrismaClient } from '@prisma/client'
import { getStorageService } from '@/lib/storage'
import {
  assertChatAttachmentPruneAcknowledged,
  parseChatAttachmentRetentionDays,
  pruneMessageAttachments,
} from '@/lib/chat/attachment-pruning'

async function main() {
  assertChatAttachmentPruneAcknowledged(process.env.CHAT_ATTACHMENT_PRUNE_ACKNOWLEDGEMENT)
  const retentionDays = parseChatAttachmentRetentionDays(process.env.CHAT_ATTACHMENT_RETENTION_DAYS)
  const prisma = new PrismaClient()
  const storage = getStorageService()
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000)

  try {
    console.log(
      `Pruning chat attachments older than ${retentionDays} days (before ${cutoff.toISOString()})`
    )

    const messages = await prisma.message.findMany({
      where: {
        timestamp: { lt: cutoff },
        attachments: { not: Prisma.JsonNull },
      },
      select: {
        id: true,
        attachments: true,
      },
    })

    let filesRemoved = 0
    let messagesCleared = 0
    for (const message of messages) {
      const result = await pruneMessageAttachments(message, {
        deleteFile: (path) => storage.delete(path),
        clearAttachments: async (messageId) => {
          await prisma.message.update({
            where: { id: messageId },
            data: { attachments: Prisma.JsonNull },
          })
        },
      })

      filesRemoved += result.filesRemoved
      if (result.cleared) {
        messagesCleared += 1
        console.log(`Cleared attachment metadata for message ${message.id}`)
      } else if (result.error) {
        console.warn(`Kept attachment metadata for message ${message.id}: ${result.error}`)
      }
    }

    console.log(
      `Cleared ${messagesCleared} of ${messages.length} messages and removed ${filesRemoved} files.`
    )
  } finally {
    await prisma.$disconnect()
  }
}

main().catch((error) => {
  console.error('Failed to prune chat attachments', error)
  process.exit(1)
})
