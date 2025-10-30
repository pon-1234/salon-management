/**
 * @design_doc   Area settings API endpoints
 * @related_to   Area settings page
 * @known_issues None currently
 */
import { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/auth/utils'
import { SuccessResponses } from '@/lib/api/responses'
import { ErrorResponses, handleApiError } from '@/lib/api/errors'
import { db } from '@/lib/db'
import { resolveStoreId, ensureStoreId } from '@/lib/store/server'

const areaSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'エリア名は必須です'),
  prefecture: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  displayOrder: z.number().optional(),
  isActive: z.boolean().optional(),
})

export async function GET(request: NextRequest) {
  const authError = await requireAdmin()
  if (authError) return authError

  try {
    const storeId = await ensureStoreId(await resolveStoreId(request))
    const areas = await db.areaInfo.findMany({
      where: { storeId },
      orderBy: { displayOrder: 'asc' },
      include: {
        stations: {
          where: { storeId },
          orderBy: { displayOrder: 'asc' },
        },
      },
    })

    if (areas.length === 0) {
      const defaults = [
        {
          name: '渋谷エリア',
          prefecture: '東京都',
          city: '渋谷区',
          description: '渋谷駅周辺および表参道・原宿エリア',
          displayOrder: 1,
        },
        {
          name: '新宿エリア',
          prefecture: '東京都',
          city: '新宿区',
          description: '歌舞伎町・西新宿・東新宿エリア',
          displayOrder: 2,
        },
        {
          name: '池袋エリア',
          prefecture: '東京都',
          city: '豊島区',
          description: '池袋駅東口・西口エリア',
          displayOrder: 3,
        },
      ]

      await db.areaInfo.createMany({
        data: defaults.map((entry) => ({ ...entry, storeId })),
      })

      const seeded = await db.areaInfo.findMany({
        where: { storeId },
        orderBy: { displayOrder: 'asc' },
        include: {
          stations: {
            where: { storeId },
            orderBy: { displayOrder: 'asc' },
          },
        },
      })

      return SuccessResponses.ok(seeded)
    }

    return SuccessResponses.ok(areas)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest) {
  const authError = await requireAdmin()
  if (authError) return authError

  try {
    const storeId = await ensureStoreId(await resolveStoreId(request))
    const body = await request.json()
    const validated = areaSchema.parse(body)

    const area = await db.areaInfo.create({
      data: {
        storeId,
        name: validated.name,
        prefecture: validated.prefecture ?? null,
        city: validated.city ?? null,
        description: validated.description ?? null,
        displayOrder: validated.displayOrder ?? 0,
        isActive: validated.isActive ?? true,
      },
    })

    return SuccessResponses.created(area, 'エリア情報を追加しました')
  } catch (error) {
    if (error instanceof z.ZodError) {
      return ErrorResponses.badRequest(error.errors.map((e) => e.message).join('\n'))
    }
    return handleApiError(error)
  }
}

export async function PUT(request: NextRequest) {
  const authError = await requireAdmin()
  if (authError) return authError

  try {
    const storeId = await ensureStoreId(await resolveStoreId(request))
    const body = await request.json()
    const { id, ...rest } = body

    if (!id) {
      return ErrorResponses.badRequest('エリアIDが必要です')
    }

    const validated = areaSchema.parse({ id, ...rest })

    const existing = await db.areaInfo.findFirst({
      where: { id, storeId },
    })

    if (!existing) {
      return ErrorResponses.notFound('エリア')
    }

    const area = await db.areaInfo.update({
      where: { id },
      data: {
        name: validated.name,
        prefecture: validated.prefecture ?? null,
        city: validated.city ?? null,
        description: validated.description ?? null,
        displayOrder: validated.displayOrder ?? 0,
        isActive: validated.isActive ?? true,
      },
      include: {
        stations: {
          where: { storeId },
          orderBy: { displayOrder: 'asc' },
        },
      },
    })

    return SuccessResponses.updated(area)
  } catch (error: any) {
    if (error?.code === 'P2025') {
      return ErrorResponses.notFound('エリア')
    }
    if (error instanceof z.ZodError) {
      return ErrorResponses.badRequest(error.errors.map((e) => e.message).join('\n'))
    }
    return handleApiError(error)
  }
}

export async function DELETE(request: NextRequest) {
  const authError = await requireAdmin()
  if (authError) return authError

  try {
    const storeId = await ensureStoreId(await resolveStoreId(request))
    const id = request.nextUrl.searchParams.get('id')

    if (!id) {
      return ErrorResponses.badRequest('エリアIDが必要です')
    }

    const deleted = await db.areaInfo.deleteMany({
      where: { id, storeId },
    })

    if (deleted.count === 0) {
      return ErrorResponses.notFound('エリア')
    }

    return SuccessResponses.deleted()
  } catch (error: any) {
    if (error?.code === 'P2025') {
      return ErrorResponses.notFound('エリア')
    }
    return ErrorResponses.internalError(error)
  }
}
