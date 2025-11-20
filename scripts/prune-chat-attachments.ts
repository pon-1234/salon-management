import { Prisma, PrismaClient } from '@prisma/client'
import { getStorageService } from '@/lib/storage'
import { normalizeChatAttachments } from '@/lib/chat/attachments'

const RETENTION_DAYS = Number(process.env.CHAT_ATTACHMENT_RETENTION_DAYS ?? 180)

async function main() {
  const prisma = new PrismaClient()
  const storage = getStorageService()
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000)

  console.log(`Pruning chat attachments older than ${RETENTION_DAYS} days (before ${cutoff.toISOString()})`)

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
  for (const message of messages) {
    const attachments = normalizeChatAttachments(message.attachments as Prisma.JsonValue | null)
    if (attachments.length === 0) {
      continue
    }

    for (const attachment of attachments) {
      if (!attachment.path) {
        continue
      }
      const result = await storage.delete(attachment.path)
      if (result.success) {
        filesRemoved += 1
        console.log(`Deleted ${attachment.path}`)
      } else {
        console.warn(`Failed to delete ${attachment.path}: ${result.error}`)
      }
    }

    await prisma.message.update({
      where: { id: message.id },
      data: { attachments: Prisma.JsonNull },
    })
  }

  console.log(`Pruned ${messages.length} messages and removed ${filesRemoved} files.`)
  await prisma.$disconnect()
}

main().catch((error) => {
  console.error('Failed to prune chat attachments', error)
  process.exit(1)
})
