/**
 * @design_doc   Store event banner settings API endpoints
 * @related_to   Admin settings -> トップバナー管理ページ
 * @known_issues None currently
 */
import { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/auth/utils'
import { SuccessResponses } from '@/lib/api/responses'
import { ErrorResponses, handleApiError } from '@/lib/api/errors'
import { db } from '@/lib/db'
import { resolveStoreId, ensureStoreId } from '@/lib/store/server'
import { getDefaultBanners } from '@/lib/store/public-fallbacks'

const optionalDateSchema = z.preprocess(
  (value) => {
    if (value === undefined || value === null || value === '') {
      return null
    }
    return value
  },
  z.coerce.date().nullable()
)

const bannerSchema = z
  .object({
    id: z.string().optional(),
    title: z.string().min(1, 'タイトルは必須です'),
    description: z.string().optional().nullable(),
    imageUrl: z.string().min(1, 'PCバナー画像は必須です'),
    mobileImageUrl: z.string().optional().nullable(),
    link: z.string().optional().nullable(),
    startDate: optionalDateSchema,
    endDate: optionalDateSchema,
    displayOrder: z.number().int().nonnegative().optional(),
    isActive: z.boolean().optional(),
  })
  .superRefine((value, ctx) => {
    if (value.startDate && value.endDate && value.startDate > value.endDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: '掲載終了日時は開始日時より後に設定してください',
        path: ['endDate'],
      })
    }
  })

const updateSchema = z.object({
  banners: z.array(bannerSchema).max(10, 'バナーは最大10件まで登録できます'),
})

function normalizeLink(link: string | null | undefined, storeSlug: string): string | null {
  if (!link) return null
  const trimmed = link.trim()
  if (!trimmed) return null

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed
  }

  if (trimmed.startsWith('/')) {
    return trimmed === '/' ? `/${storeSlug}` : trimmed
  }

  if (trimmed.startsWith(storeSlug)) {
    return trimmed.startsWith('/') ? trimmed : `/${trimmed}`
  }

  return `/${storeSlug}/${trimmed.replace(/^\//, '')}`
}

async function fetchStoreSlug(storeId: string): Promise<string> {
  const store = await db.store.findUnique({
    where: { id: storeId },
    select: { slug: true },
  })

  return store?.slug ?? storeId
}

export async function GET(request: NextRequest) {
  const authError = await requireAdmin()
  if (authError) return authError

  try {
    const storeId = await ensureStoreId(await resolveStoreId(request))
    const storeSlug = await fetchStoreSlug(storeId)

    let banners = await db.storeEventBanner.findMany({
      where: { storeId },
      orderBy: { displayOrder: 'asc' },
    })

    if (banners.length === 0) {
      const defaults = getDefaultBanners(storeSlug).map((banner, index) => ({
        storeId,
        title: banner.title,
        imageUrl: banner.imageUrl,
        mobileImageUrl: banner.mobileImageUrl,
        link: banner.link,
        displayOrder: index,
        isActive: true,
        startDate: null,
        endDate: null,
      }))

      if (defaults.length > 0) {
        await db.storeEventBanner.createMany({ data: defaults })
        banners = await db.storeEventBanner.findMany({
          where: { storeId },
          orderBy: { displayOrder: 'asc' },
        })
      }
    }

    return SuccessResponses.ok(banners)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function PUT(request: NextRequest) {
  const authError = await requireAdmin()
  if (authError) return authError

  try {
    const storeId = await ensureStoreId(await resolveStoreId(request))
    const storeSlug = await fetchStoreSlug(storeId)
    const body = await request.json()
    const { banners } = updateSchema.parse(body)

    if (banners.length === 0) {
      return ErrorResponses.badRequest('少なくとも1件のバナーを登録してください')
    }

    const normalized = banners.map((banner, index) => ({
      id: banner.id,
      title: banner.title.trim(),
      description: banner.description?.trim() || null,
      imageUrl: banner.imageUrl.trim(),
      mobileImageUrl: banner.mobileImageUrl?.trim() || null,
      link: normalizeLink(banner.link ?? null, storeSlug),
      startDate: banner.startDate ?? null,
      endDate: banner.endDate ?? null,
      displayOrder: Number.isFinite(banner.displayOrder) ? banner.displayOrder! : index,
      isActive: banner.isActive ?? true,
    }))

    const existing = await db.storeEventBanner.findMany({ where: { storeId } })
    const payloadIds = normalized.filter((banner) => banner.id).map((banner) => banner.id!)
    const deleteIds = existing
      .filter((banner) => !payloadIds.includes(banner.id))
      .map((banner) => banner.id)

    await db.$transaction(async (tx) => {
      if (deleteIds.length > 0) {
        await tx.storeEventBanner.deleteMany({ where: { storeId, id: { in: deleteIds } } })
      }

      for (const [index, banner] of normalized.entries()) {
        const displayOrder = banner.displayOrder ?? index
        if (banner.id) {
          await tx.storeEventBanner.update({
            where: { id: banner.id },
            data: {
              title: banner.title,
              description: banner.description,
              imageUrl: banner.imageUrl,
              mobileImageUrl: banner.mobileImageUrl,
              link: banner.link,
              startDate: banner.startDate,
              endDate: banner.endDate,
              displayOrder,
              isActive: banner.isActive,
            },
          })
        } else {
          await tx.storeEventBanner.create({
            data: {
              storeId,
              title: banner.title,
              description: banner.description,
              imageUrl: banner.imageUrl,
              mobileImageUrl: banner.mobileImageUrl,
              link: banner.link,
              startDate: banner.startDate,
              endDate: banner.endDate,
              displayOrder,
              isActive: banner.isActive,
            },
          })
        }
      }
    })

    const updated = await db.storeEventBanner.findMany({
      where: { storeId },
      orderBy: { displayOrder: 'asc' },
    })

    return SuccessResponses.updated(updated)
  } catch (error) {
    if (error instanceof z.ZodError) {
      const message = error.errors.map((err) => err.message).join('\n')
      return ErrorResponses.badRequest(message)
    }
    return handleApiError(error)
  }
}
