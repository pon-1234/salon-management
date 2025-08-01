/**
 * @design_doc   Hotel settings API endpoints
 * @related_to   Hotel settings page
 * @known_issues Hotel data is stored in memory (not persisted to database)
 */
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/auth/utils'
import { handleApiError, ErrorResponses } from '@/lib/api/errors'
import { SuccessResponses } from '@/lib/api/responses'

// In-memory storage for demo purposes
// In production, this should be stored in database
let hotelSettings: Array<{
  id: string
  hotelName: string
  area: string
  roomCount: number
  hourlyRate: number
  address: string
  phone: string
  checkInTime: string
  checkOutTime: string
  amenities: string[]
  notes: string
}> = [
  {
    id: '1',
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
    id: '2',
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

  // TODO: Hotel settings should be persisted to database instead of memory
  return SuccessResponses.ok(hotelSettings)
}

export async function POST(request: NextRequest) {
  const authError = await requireAdmin()
  if (authError) return authError

  try {
    const body = await request.json()

    // Validate request body
    const validatedData = hotelSchema.parse(body)

    // Generate ID if not provided
    const newHotel = {
      ...validatedData,
      id: validatedData.id || Date.now().toString(),
    }

    // Add to list with default notes if not provided
    hotelSettings.push({
      ...newHotel,
      notes: newHotel.notes || '',
    })

    // TODO: Hotel settings should be persisted to database instead of memory
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
      return NextResponse.json({ error: 'Hotel ID is required' }, { status: 400 })
    }

    // Validate update data
    const validatedData = hotelSchema.parse({ id, ...updateData })

    // Find and update hotel
    const hotelIndex = hotelSettings.findIndex((h) => h.id === id)

    if (hotelIndex === -1) {
      return NextResponse.json({ error: 'Hotel not found' }, { status: 404 })
    }

    hotelSettings[hotelIndex] = {
      ...validatedData,
      id: id,
      notes: validatedData.notes || '',
    }

    // TODO: Hotel settings should be persisted to database instead of memory
    return SuccessResponses.updated(hotelSettings[hotelIndex])
  } catch (error) {
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

    // Find hotel index
    const hotelIndex = hotelSettings.findIndex((h) => h.id === id)

    if (hotelIndex === -1) {
      return ErrorResponses.notFound('ホテル')
    }

    // Remove hotel
    hotelSettings.splice(hotelIndex, 1)

    // TODO: Hotel deletion should be persisted to database
    return SuccessResponses.deleted()
  } catch (error) {
    return handleApiError(error)
  }
}
