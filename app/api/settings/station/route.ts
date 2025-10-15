/**
 * @design_doc   Station settings API endpoints
 * @related_to   Station settings page
 * @known_issues None currently
 */
import { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/auth/utils'
import { SuccessResponses } from '@/lib/api/responses'
import { ErrorResponses, handleApiError } from '@/lib/api/errors'
import { db } from '@/lib/db'

const stationSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, '駅名は必須です'),
  line: z.string().optional().nullable(),
  areaId: z.string().optional().nullable(),
  transportationFee: z.number().min(0).optional().nullable(),
  travelTime: z.number().min(0).optional().nullable(),
  description: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
  displayOrder: z.number().optional(),
})

export async function GET(request: NextRequest) {
  const authError = await requireAdmin()
  if (authError) return authError

  try {
    const areaId = request.nextUrl.searchParams.get('areaId') ?? undefined

    const stations = await db.stationInfo.findMany({
      where: areaId ? { areaId } : undefined,
      orderBy: { displayOrder: 'asc' },
      include: { area: true },
    })

    if (stations.length === 0) {
      const defaultStations = [
        {
          name: '渋谷駅',
          line: 'JR山手線',
          transportationFee: 0,
          travelTime: 10,
          displayOrder: 1,
        },
        {
          name: '新宿駅',
          line: 'JR山手線',
          transportationFee: 1000,
          travelTime: 20,
          displayOrder: 2,
        },
        {
          name: '池袋駅',
          line: 'JR山手線',
          transportationFee: 1500,
          travelTime: 25,
          displayOrder: 3,
        },
      ]

      await db.stationInfo.createMany({ data: defaultStations })

      const seeded = await db.stationInfo.findMany({
        orderBy: { displayOrder: 'asc' },
        include: { area: true },
      })

      return SuccessResponses.ok(seeded)
    }

    return SuccessResponses.ok(stations)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest) {
  const authError = await requireAdmin()
  if (authError) return authError

  try {
    const body = await request.json()
    const validated = stationSchema.parse(body)

    const station = await db.stationInfo.create({
      data: {
        name: validated.name,
        line: validated.line ?? null,
        areaId: validated.areaId ?? null,
        transportationFee: validated.transportationFee ?? 0,
        travelTime: validated.travelTime ?? 0,
        description: validated.description ?? null,
        isActive: validated.isActive ?? true,
        displayOrder: validated.displayOrder ?? 0,
      },
      include: { area: true },
    })

    return SuccessResponses.created(station, '駅情報を追加しました')
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
    const body = await request.json()
    const { id, ...rest } = body

    if (!id) {
      return ErrorResponses.badRequest('駅IDが必要です')
    }

    const validated = stationSchema.parse({ id, ...rest })

    const station = await db.stationInfo.update({
      where: { id },
      data: {
        name: validated.name,
        line: validated.line ?? null,
        areaId: validated.areaId ?? null,
        transportationFee: validated.transportationFee ?? 0,
        travelTime: validated.travelTime ?? 0,
        description: validated.description ?? null,
        isActive: validated.isActive ?? true,
        displayOrder: validated.displayOrder ?? 0,
      },
      include: { area: true },
    })

    return SuccessResponses.updated(station)
  } catch (error: any) {
    if (error?.code === 'P2025') {
      return ErrorResponses.notFound('駅')
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
    const id = request.nextUrl.searchParams.get('id')

    if (!id) {
      return ErrorResponses.badRequest('駅IDが必要です')
    }

    await db.stationInfo.delete({
      where: { id },
    })

    return SuccessResponses.deleted()
  } catch (error: any) {
    if (error?.code === 'P2025') {
      return ErrorResponses.notFound('駅')
    }
    return handleApiError(error)
  }
}
