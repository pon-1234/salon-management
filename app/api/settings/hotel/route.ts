/**
 * @design_doc   docs/HOTEL_DATA_MODEL.md
 * @related_to   HotelSettings; HotelServiceArea; HotelRate; hotel settings page
 * @known_issues Service-area and rate mutation is intentionally delegated to dedicated endpoints
 */
import { NextRequest } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/auth/utils'
import { ErrorResponses, handleApiError } from '@/lib/api/errors'
import { SuccessResponses } from '@/lib/api/responses'
import { db } from '@/lib/db'
import { ensureStoreId, resolveStoreId } from '@/lib/store/server'

const nullableText = (maxLength: number) =>
  z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? null : value),
    z.string().trim().max(maxLength).nullable().optional()
  )

const hotelSchema = z.object({
  hotelName: z.string().trim().min(1, 'ホテル名は必須です').max(200),
  legacyId: nullableText(100),
  area: nullableText(200),
  station: nullableText(200),
  roomCount: z.number().int().min(0).nullable().optional(),
  hourlyRate: z.number().int().min(0).nullable().optional(),
  address: nullableText(500),
  phone: nullableText(50),
  checkInTime: nullableText(50),
  checkOutTime: nullableText(50),
  amenities: z.array(z.string().trim().min(1).max(100)).max(100).optional(),
  notes: nullableText(2000),
  rawText: nullableText(4000),
  displayOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
})

const activeHotelRelations = {
  serviceAreas: {
    where: { isActive: true },
    include: { area: true },
    orderBy: { displayOrder: 'asc' as const },
  },
  rates: {
    where: { isActive: true },
    orderBy: { displayOrder: 'asc' as const },
  },
}

function hotelData(storeId: string, validated: z.infer<typeof hotelSchema>) {
  return {
    storeId,
    hotelName: validated.hotelName,
    legacyId: validated.legacyId ?? null,
    area: validated.area ?? null,
    station: validated.station ?? null,
    roomCount: validated.roomCount ?? null,
    hourlyRate: validated.hourlyRate ?? null,
    address: validated.address ?? null,
    phone: validated.phone ?? null,
    checkInTime: validated.checkInTime ?? null,
    checkOutTime: validated.checkOutTime ?? null,
    amenities: validated.amenities ?? [],
    notes: validated.notes ?? null,
    rawText: validated.rawText ?? null,
    displayOrder: validated.displayOrder ?? 0,
    isActive: validated.isActive ?? true,
  }
}

function badRequestFor(error: z.ZodError) {
  return ErrorResponses.badRequest(error.errors.map((issue) => issue.message).join('\n'))
}

export async function GET(request: NextRequest) {
  try {
    const storeId = await ensureStoreId(await resolveStoreId(request))
    const authError = await requireAdmin({ permissions: 'settings:read', storeId })
    if (authError) return authError

    const hotels = await db.hotelSettings.findMany({
      where: { storeId, isActive: true },
      orderBy: [{ displayOrder: 'asc' }, { hotelName: 'asc' }],
      include: activeHotelRelations,
    })

    return SuccessResponses.ok(hotels)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const storeId = await ensureStoreId(await resolveStoreId(request))
    const authError = await requireAdmin({ permissions: 'settings:update', storeId })
    if (authError) return authError

    const validated = hotelSchema.parse(await request.json())
    const hotel = await db.hotelSettings.create({
      data: hotelData(storeId, validated),
      include: {
        serviceAreas: { include: { area: true } },
        rates: true,
      },
    })

    return SuccessResponses.created(hotel, 'ホテル情報が追加されました')
  } catch (error) {
    if (error instanceof z.ZodError) return badRequestFor(error)
    return handleApiError(error)
  }
}

export async function PUT(request: NextRequest) {
  try {
    const storeId = await ensureStoreId(await resolveStoreId(request))
    const authError = await requireAdmin({ permissions: 'settings:update', storeId })
    if (authError) return authError

    const body: unknown = await request.json()
    if (typeof body !== 'object' || body === null || !('id' in body) || !body.id) {
      return ErrorResponses.badRequest('ホテルIDが必要です')
    }

    const id = String(body.id)
    const validated = hotelSchema.parse(body)
    const existing = await db.hotelSettings.findFirst({
      where: { id, storeId },
      select: { id: true },
    })

    if (!existing) return ErrorResponses.notFound('ホテル')

    const hotel = await db.hotelSettings.update({
      where: { id, storeId },
      data: hotelData(storeId, validated),
      include: activeHotelRelations,
    })

    return SuccessResponses.updated(hotel)
  } catch (error) {
    if (error instanceof z.ZodError) return badRequestFor(error)
    return handleApiError(error)
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const storeId = await ensureStoreId(await resolveStoreId(request))
    const authError = await requireAdmin({ permissions: 'settings:update', storeId })
    if (authError) return authError

    const id = request.nextUrl.searchParams.get('id')
    if (!id) return ErrorResponses.badRequest('ホテルIDが必要です')

    const result = await db.hotelSettings.updateMany({
      where: { id, storeId, isActive: true },
      data: { isActive: false },
    })

    if (result.count === 0) return ErrorResponses.notFound('ホテル')

    return SuccessResponses.deleted()
  } catch (error) {
    return handleApiError(error)
  }
}
