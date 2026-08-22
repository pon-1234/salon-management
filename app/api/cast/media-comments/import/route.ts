/**
 * @design_doc   EXT-01 媒体コメント取り込みは手入力を消さない
 * @related_to   planMediaCommentImport, Cast.mediaComment, StoreSettings.mediaCommentOverwrite
 * @known_issues Heaven/Benri の自動スクレイピングは未接続。管理画面からの取り込み専用。
 */
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/auth/utils'
import { db } from '@/lib/db'
import logger from '@/lib/logger'
import { planMediaCommentImport, type MediaCommentSource } from '@/lib/cast/media-comment-sync'
import { resolveStoreId, ensureStoreId } from '@/lib/store/server'

const importSchema = z.object({
  source: z.enum(['heaven', 'benri', 'official']),
  comments: z
    .array(
      z.object({
        castId: z.string().min(1),
        comment: z.string(),
      })
    )
    .min(1),
})

export async function POST(request: NextRequest) {
  try {
    const storeId = await ensureStoreId(await resolveStoreId(request))
    const authError = await requireAdmin({ permissions: 'cast:update', storeId })
    if (authError) return authError

    const parsed = importSchema.safeParse(await request.json())
    if (!parsed.success) {
      return NextResponse.json({ error: '取り込み内容が不正です' }, { status: 400 })
    }

    const settings = await db.storeSettings.findUnique({
      where: { storeId },
      select: { mediaCommentOverwrite: true },
    })
    const casts = await db.cast.findMany({
      where: { storeId, id: { in: parsed.data.comments.map((item) => item.castId) } },
      select: {
        id: true,
        mediaComment: true,
        mediaCommentSource: true,
        mediaSyncExcluded: true,
      },
    })

    const updates = planMediaCommentImport({
      overwriteEnabled: Boolean(settings?.mediaCommentOverwrite),
      source: parsed.data.source as MediaCommentSource,
      casts,
      comments: parsed.data.comments,
    })

    for (const update of updates) {
      await db.cast.update({
        where: { id: update.id },
        data: {
          mediaComment: update.mediaComment,
          mediaCommentSource: update.mediaCommentSource,
        },
      })
    }

    return NextResponse.json({
      updatedCount: updates.length,
      skippedCount: parsed.data.comments.length - updates.length,
      updatedIds: updates.map((update) => update.id),
    })
  } catch (error) {
    logger.error({ err: error }, 'Failed to import media comments')
    return NextResponse.json({ error: '媒体コメントの取り込みに失敗しました' }, { status: 500 })
  }
}
