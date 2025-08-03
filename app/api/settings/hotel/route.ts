/**
 * @design_doc   Hotel settings API endpoints
 * @related_to   Hotel settings page
 * @known_issues None currently
 */
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/auth/utils'
import { handleApiError, ErrorResponses } from '@/lib/api/errors'
import { SuccessResponses } from '@/lib/api/responses'
import { db } from '@/lib/db'

// Validation schema
const hotelSchema = z.object({
  id: z.string().optional(),
  hotelName: z.string().min(1),
  area: z.string().min(1),
  roomCount: z.number().min(0),
  hourlyRate: z.number().min(0),
  address: z.string().min(1),
  phone: z.string().min(1),
  checkInTime: z.string(),
  checkOutTime: z.string(),
  amenities: z.array(z.string()),
  notes: z.string().optional(),
})

export async function GET(request: NextRequest) {
  const authError = await requireAdmin()
  if (authError) return authError

  try {
    // Get all hotel settings from database
    const hotels = await db.hotelSettings.findMany({
      orderBy: { createdAt: 'asc' },
    })

    // If no hotels exist, create default hotels
    if (hotels.length === 0) {
      const defaultHotels = [
        {
          hotelName: 'アパホテル池袋',
          area: '池袋',
          roomCount: 20,
          hourlyRate: 3000,
          address: '東京都豊島区池袋1-1-1',
          phone: '03-1111-1111',
          checkInTime: '15:00',
          checkOutTime: '10:00',
          amenities: ['無料Wi-Fi', 'アメニティ完備', '24時間フロント'],
          notes: 'キャスト専用の入口あり',
        },
        {
          hotelName: 'ビジネスホテル新宿',
          area: '新宿',
          roomCount: 15,
          hourlyRate: 3500,
          address: '東京都新宿区新宿2-2-2',
          phone: '03-2222-2222',
          checkInTime: '14:00',
          checkOutTime: '11:00',
          amenities: ['無料Wi-Fi', '朝食付き', '駐車場'],
          notes: '駅近で便利な立地',
        },
      ]

      // Create default hotels
      for (const hotel of defaultHotels) {
        await db.hotelSettings.create({ data: hotel })
      }

      // Fetch again after creation
      const createdHotels = await db.hotelSettings.findMany({
        orderBy: { createdAt: 'asc' },
      })
      return SuccessResponses.ok(createdHotels)
    }

    return SuccessResponses.ok(hotels)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest) {
  const authError = await requireAdmin()
  if (authError) return authError

  try {
    const body = await request.json()

    // Validate request body
    const validatedData = hotelSchema.parse(body)

    // Create new hotel in database
    const newHotel = await db.hotelSettings.create({
      data: {
        hotelName: validatedData.hotelName,
        area: validatedData.area,
        roomCount: validatedData.roomCount,
        hourlyRate: validatedData.hourlyRate,
        address: validatedData.address,
        phone: validatedData.phone,
        checkInTime: validatedData.checkInTime,
        checkOutTime: validatedData.checkOutTime,
        amenities: validatedData.amenities,
        notes: validatedData.notes || '',
      },
    })

    return SuccessResponses.created(newHotel, 'ホテル情報が追加されました')
  } catch (error) {
    return handleApiError(error)
  }
}

export async function PUT(request: NextRequest) {
  const authError = await requireAdmin()
  if (authError) return authError

  try {
    const body = await request.json()
    const { id, ...updateData } = body

    if (!id) {
      return ErrorResponses.badRequest('Hotel ID is required')
    }

    // Validate update data
    const validatedData = hotelSchema.parse({ id, ...updateData })

    // Update hotel in database
    const updatedHotel = await db.hotelSettings.update({
      where: { id },
      data: {
        hotelName: validatedData.hotelName,
        area: validatedData.area,
        roomCount: validatedData.roomCount,
        hourlyRate: validatedData.hourlyRate,
        address: validatedData.address,
        phone: validatedData.phone,
        checkInTime: validatedData.checkInTime,
        checkOutTime: validatedData.checkOutTime,
        amenities: validatedData.amenities,
        notes: validatedData.notes || '',
      },
    })

    return SuccessResponses.updated(updatedHotel)
  } catch (error: any) {
    if (error?.code === 'P2025') {
      return ErrorResponses.notFound('ホテル')
    }
    return handleApiError(error)
  }
}

export async function DELETE(request: NextRequest) {
  const authError = await requireAdmin()
  if (authError) return authError

  try {
    const searchParams = request.nextUrl.searchParams
    const id = searchParams.get('id')

    if (!id) {
      return ErrorResponses.badRequest('ホテルIDが必要です')
    }

    // Delete hotel from database
    await db.hotelSettings.delete({
      where: { id },
    })

    return SuccessResponses.deleted()
  } catch (error: any) {
    if (error?.code === 'P2025') {
      return ErrorResponses.notFound('ホテル')
    }
    return handleApiError(error)
  }
}
