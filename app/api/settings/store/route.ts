/**
 * @design_doc   Store settings API endpoints
 * @related_to   Store settings page
 * @known_issues Store data is stored in memory (not persisted to database)
 */
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/auth/utils'
import { handleApiError } from '@/lib/api/errors'
import { SuccessResponses } from '@/lib/api/responses'

// In-memory storage for demo purposes
// In production, this should be stored in database
let storeSettings: {
  storeName: string
  address: string
  phone: string
  email: string
  website: string
  businessHours: string
  description: string
  zipCode: string
  prefecture: string
  city: string
  building: string
  businessDays: string
  lastOrder: string
  parkingInfo: string
} = {
  storeName: '金の玉クラブ(池袋)',
  address: '東京都豊島区池袋2-1-1',
  phone: '03-1234-5678',
  email: 'info@example.com',
  website: 'https://example.com',
  businessHours: '10:00 - 24:00',
  description: '池袋エリアの高級メンズエステサロンです。',
  zipCode: '171-0014',
  prefecture: '東京都',
  city: '豊島区',
  building: '池袋ビル3F',
  businessDays: '年中無休',
  lastOrder: '23:30',
  parkingInfo: '近隣にコインパーキングあり',
}

// Validation schema
const storeSettingsSchema = z.object({
  storeName: z.string().min(1),
  address: z.string().min(1),
  phone: z.string().min(1),
  email: z.string().email(),
  website: z.string().url().optional(),
  businessHours: z.string(),
  description: z.string(),
  zipCode: z.string(),
  prefecture: z.string(),
  city: z.string(),
  building: z.string().optional(),
  businessDays: z.string(),
  lastOrder: z.string(),
  parkingInfo: z.string().optional(),
})

export async function GET(request: NextRequest) {
  const authError = await requireAdmin()
  if (authError) return authError

  // TODO: Store settings should be persisted to database instead of memory
  return SuccessResponses.ok(storeSettings)
}

export async function PUT(request: NextRequest) {
  const authError = await requireAdmin()
  if (authError) return authError

  try {
    const body = await request.json()

    // Validate request body
    const validatedData = storeSettingsSchema.parse(body)

    // Update settings with defaults for optional fields
    storeSettings = {
      ...validatedData,
      website: validatedData.website || '',
      building: validatedData.building || '',
      parkingInfo: validatedData.parkingInfo || '',
    }

    // TODO: Store settings should be persisted to database instead of memory
    return SuccessResponses.updated(storeSettings)
  } catch (error) {
    return handleApiError(error)
  }
}
