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
import { resolveStoreId, ensureStoreId } from '@/lib/store/server'
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
  welfareExpenseRate: z.coerce.number().min(0).max(100).optional(),
  marketingChannels: z
    .array(z.string().trim().min(1))
    .min(1)
    .optional(),
  pointEarnRate: z.coerce.number().min(0).max(100).optional(),
  pointExpirationMonths: z.coerce.number().min(1).max(36).optional(),
  pointMinUsage: z.coerce.number().min(0).optional(),
})

const DEFAULT_MARKETING_CHANNELS = ['店リピート', '電話', '紹介', 'SNS', 'WEB', 'Heaven']

export async function GET(request: NextRequest) {
  const authError = await requireAdmin()
  if (authError) return authError

  try {
    const storeId = await ensureStoreId(await resolveStoreId(request))
    // Get store settings from database
    let settings = await db.storeSettings.findUnique({ where: { storeId } })

    // If no settings exist, create default settings
      if (!settings) {
        settings = await db.storeSettings.create({
          data: {
            storeId,
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
            welfareExpenseRate: 10,
            marketingChannels: DEFAULT_MARKETING_CHANNELS,
            pointEarnRate: 1,
            pointExpirationMonths: 12,
            pointMinUsage: 100,
          },
        })
      }

      return SuccessResponses.ok({
        ...settings,
        welfareExpenseRate: Number(settings.welfareExpenseRate ?? 10),
        marketingChannels: Array.isArray(settings.marketingChannels) && settings.marketingChannels.length > 0
          ? settings.marketingChannels
          : DEFAULT_MARKETING_CHANNELS,
        pointEarnRate: Number(settings.pointEarnRate ?? 1),
        pointExpirationMonths: Number(settings.pointExpirationMonths ?? 12),
        pointMinUsage: Number(settings.pointMinUsage ?? 100),
      })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function PUT(request: NextRequest) {
  const authError = await requireAdmin()
  if (authError) return authError

  try {
    const storeId = await ensureStoreId(await resolveStoreId(request))
    const body = await request.json()

    // Validate request body
    const validatedData = storeSettingsSchema.parse(body)
    const welfareExpenseRate = validatedData.welfareExpenseRate ?? 10
    const marketingChannels =
      validatedData.marketingChannels?.map((channel) => channel.trim()).filter(Boolean) ??
      DEFAULT_MARKETING_CHANNELS
    const pointEarnRate = validatedData.pointEarnRate ?? 1
    const pointExpirationMonths = validatedData.pointExpirationMonths ?? 12
    const pointMinUsage = validatedData.pointMinUsage ?? 100

    // Find existing settings or create new one
    const existingSettings = await db.storeSettings.findUnique({ where: { storeId } })

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
          welfareExpenseRate,
          marketingChannels,
          pointEarnRate,
          pointExpirationMonths,
          pointMinUsage,
        },
      })
    } else {
      // Create new settings
      updatedSettings = await db.storeSettings.create({
        data: {
          storeId,
          ...validatedData,
          website: validatedData.website || '',
          building: validatedData.building || '',
          parkingInfo: validatedData.parkingInfo || '',
          welfareExpenseRate,
          marketingChannels,
          pointEarnRate,
          pointExpirationMonths,
          pointMinUsage,
        },
      })
    }

    return SuccessResponses.updated({
      ...updatedSettings,
      welfareExpenseRate: Number(updatedSettings.welfareExpenseRate ?? 10),
      marketingChannels:
        Array.isArray(updatedSettings.marketingChannels) && updatedSettings.marketingChannels.length > 0
          ? updatedSettings.marketingChannels
          : DEFAULT_MARKETING_CHANNELS,
      pointEarnRate: Number(updatedSettings.pointEarnRate ?? 1),
      pointExpirationMonths: Number(updatedSettings.pointExpirationMonths ?? 12),
      pointMinUsage: Number(updatedSettings.pointMinUsage ?? 100),
    })
  } catch (error) {
    return handleApiError(error)
  }
}
