/**
 * @design_doc   Store settings API endpoints
 * @related_to   Store settings page
 * @known_issues None currently
 */
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAdmin } from '@/lib/auth/utils'
import { handleApiError } from '@/lib/api/errors'
import { SuccessResponses } from '@/lib/api/responses'

import { db } from '@/lib/db'
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

  try {
    // Get store settings from database
    let settings = await db.storeSettings.findFirst()

    // If no settings exist, create default settings
    if (!settings) {
      settings = await db.storeSettings.create({
        data: {
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
        },
      })
    }

    return SuccessResponses.ok(settings)
  } catch (error) {
    return handleApiError(error)
  }
}

export async function PUT(request: NextRequest) {
  const authError = await requireAdmin()
  if (authError) return authError

  try {
    const body = await request.json()

    // Validate request body
    const validatedData = storeSettingsSchema.parse(body)

    // Find existing settings or create new one
    const existingSettings = await db.storeSettings.findFirst()

    let updatedSettings
    if (existingSettings) {
      // Update existing settings
      updatedSettings = await db.storeSettings.update({
        where: { id: existingSettings.id },
        data: {
          ...validatedData,
          website: validatedData.website || '',
          building: validatedData.building || '',
          parkingInfo: validatedData.parkingInfo || '',
        },
      })
    } else {
      // Create new settings
      updatedSettings = await db.storeSettings.create({
        data: {
          ...validatedData,
          website: validatedData.website || '',
          building: validatedData.building || '',
          parkingInfo: validatedData.parkingInfo || '',
        },
      })
    }

    return SuccessResponses.updated(updatedSettings)
  } catch (error) {
    return handleApiError(error)
  }
}
