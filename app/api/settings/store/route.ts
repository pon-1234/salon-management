/**
 * @design_doc   Store settings API endpoints
 * @related_to   Store settings page
 * @known_issues None currently
 */
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import type { Prisma } from '@prisma/client'
import { requireAdmin } from '@/lib/auth/utils'
import { handleApiError } from '@/lib/api/errors'
import { SuccessResponses } from '@/lib/api/responses'

import { db } from '@/lib/db'
import { resolveStoreId, ensureStoreId } from '@/lib/store/server'
import { shouldUseMockFallbacks } from '@/lib/config/feature-flags'
import { normalizeOptionalUrl } from '@/lib/settings/store-input'
import { loadEnv } from '@/lib/config/env'
import {
  decryptMediaAccounts,
  encryptMediaAccounts,
  mergeMediaNamesIntoMarketingCatalog,
} from '@/lib/settings/media-accounts'
// Validation schema
const mediaAccountSchema = z.object({
  id: z.string().trim().min(1),
  name: z.string().trim().min(1),
  category: z.enum(['sales', 'recruitment', 'store']),
  publicUrl: z.preprocess(normalizeOptionalUrl, z.string().url().optional()),
  adminUrl: z.preprocess(normalizeOptionalUrl, z.string().url().optional()),
  loginId: z.string().optional(),
  password: z.string().optional(),
})

const storeSettingsSchema = z
  .object({
    storeName: z.string().min(1),
    address: z.string().min(1),
    phone: z.string().min(1),
    email: z.string().email(),
    website: z.preprocess(normalizeOptionalUrl, z.string().url().optional()),
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
    creditCardFeeRate: z.coerce
      .number()
      .refine((value) => value === 0 || value === 10)
      .optional(),
    mediaCommentOverwrite: z.boolean().optional(),
    marketingChannels: z.array(z.string().trim().min(1)).min(1).optional(),
    pointEarnRate: z.coerce.number().min(0).max(100).optional(),
    pointExpirationMonths: z.coerce.number().min(1).max(36).optional(),
    pointMinUsage: z.coerce.number().min(0).optional(),
    mediaAccounts: z.array(mediaAccountSchema).optional(),
  })
  .partial()

const DEFAULT_MARKETING_CHANNELS = ['店リピート', '電話', '紹介', 'SNS', 'WEB', 'Heaven']

export async function GET(request: NextRequest) {
  try {
    const storeId = await ensureStoreId(await resolveStoreId(request))
    const authError = await requireAdmin({ permissions: 'settings:read', storeId })
    if (authError) return authError

    // Get store settings from database
    let settings = await db.storeSettings.findUnique({ where: { storeId } })

    // If no settings exist, create default settings
    if (!settings && shouldUseMockFallbacks()) {
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

    if (!settings) {
      return NextResponse.json({ error: '店舗設定が登録されていません' }, { status: 404 })
    }

    return SuccessResponses.ok({
      ...settings,
      welfareExpenseRate: Number(settings.welfareExpenseRate ?? 10),
      creditCardFeeRate: Number(settings.creditCardFeeRate ?? 10) === 0 ? 0 : 10,
      mediaCommentOverwrite: Boolean(settings.mediaCommentOverwrite),
      marketingChannels:
        Array.isArray(settings.marketingChannels) && settings.marketingChannels.length > 0
          ? settings.marketingChannels
          : DEFAULT_MARKETING_CHANNELS,
      pointEarnRate: Number(settings.pointEarnRate ?? 1),
      pointExpirationMonths: Number(settings.pointExpirationMonths ?? 12),
      pointMinUsage: Number(settings.pointMinUsage ?? 100),
      mediaAccounts: decryptMediaAccounts(
        (settings as typeof settings & { mediaAccounts?: unknown }).mediaAccounts,
        loadEnv().nextAuth.secret
      ),
    })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function PUT(request: NextRequest) {
  try {
    const storeId = await ensureStoreId(await resolveStoreId(request))
    const authError = await requireAdmin({ permissions: 'settings:update', storeId })
    if (authError) return authError

    const body = await request.json()

    // Validate request body
    const validatedData = storeSettingsSchema.parse(body)
    // Find existing settings or create new one
    const existingSettings = await db.storeSettings.findUnique({ where: { storeId } })
    const mediaAccounts = validatedData.mediaAccounts
      ? encryptMediaAccounts(validatedData.mediaAccounts, loadEnv().nextAuth.secret)
      : undefined
    const baseChannels =
      validatedData.marketingChannels?.map((channel) => channel.trim()).filter(Boolean) ??
      (Array.isArray(existingSettings?.marketingChannels)
        ? existingSettings.marketingChannels
        : DEFAULT_MARKETING_CHANNELS)
    const marketingChannels = validatedData.mediaAccounts
      ? mergeMediaNamesIntoMarketingCatalog(baseChannels, validatedData.mediaAccounts)
      : validatedData.marketingChannels
        ? baseChannels
        : undefined
    const { mediaAccounts: _inputMediaAccounts, ...plainValidatedData } = validatedData
    const updateData: Prisma.StoreSettingsUpdateInput = {
      ...plainValidatedData,
      ...(validatedData.website !== undefined ? { website: validatedData.website || '' } : {}),
      ...(validatedData.building !== undefined ? { building: validatedData.building || '' } : {}),
      ...(validatedData.parkingInfo !== undefined
        ? { parkingInfo: validatedData.parkingInfo || '' }
        : {}),
      ...(marketingChannels ? { marketingChannels } : {}),
      ...(mediaAccounts
        ? { mediaAccounts: mediaAccounts as unknown as Prisma.InputJsonValue }
        : {}),
    }

    let updatedSettings
    if (existingSettings) {
      // Update existing settings
      updatedSettings = await db.storeSettings.update({
        where: { id: existingSettings.id, storeId },
        data: updateData,
      })
    } else {
      // Create new settings
      updatedSettings = await db.storeSettings.create({
        data: {
          storeId,
          storeName: validatedData.storeName ?? '',
          address: validatedData.address ?? '',
          phone: validatedData.phone ?? '',
          email: validatedData.email ?? '',
          businessHours: validatedData.businessHours ?? '',
          description: validatedData.description ?? '',
          zipCode: validatedData.zipCode ?? '',
          prefecture: validatedData.prefecture ?? '',
          city: validatedData.city ?? '',
          businessDays: validatedData.businessDays ?? '',
          lastOrder: validatedData.lastOrder ?? '',
          website: validatedData.website || '',
          building: validatedData.building || '',
          parkingInfo: validatedData.parkingInfo || '',
          welfareExpenseRate: validatedData.welfareExpenseRate ?? 10,
          creditCardFeeRate: validatedData.creditCardFeeRate === 0 ? 0 : 10,
          mediaCommentOverwrite: validatedData.mediaCommentOverwrite ?? false,
          marketingChannels: marketingChannels ?? DEFAULT_MARKETING_CHANNELS,
          mediaAccounts: (mediaAccounts ?? []) as unknown as Prisma.InputJsonValue,
          pointEarnRate: validatedData.pointEarnRate ?? 1,
          pointExpirationMonths: validatedData.pointExpirationMonths ?? 12,
          pointMinUsage: validatedData.pointMinUsage ?? 100,
        },
      })
    }

    return SuccessResponses.updated({
      ...updatedSettings,
      welfareExpenseRate: Number(updatedSettings.welfareExpenseRate ?? 10),
      creditCardFeeRate: Number(updatedSettings.creditCardFeeRate ?? 10) === 0 ? 0 : 10,
      mediaCommentOverwrite: Boolean(updatedSettings.mediaCommentOverwrite),
      marketingChannels:
        Array.isArray(updatedSettings.marketingChannels) &&
        updatedSettings.marketingChannels.length > 0
          ? updatedSettings.marketingChannels
          : DEFAULT_MARKETING_CHANNELS,
      pointEarnRate: Number(updatedSettings.pointEarnRate ?? 1),
      pointExpirationMonths: Number(updatedSettings.pointExpirationMonths ?? 12),
      pointMinUsage: Number(updatedSettings.pointMinUsage ?? 100),
      mediaAccounts: decryptMediaAccounts(
        (updatedSettings as typeof updatedSettings & { mediaAccounts?: unknown }).mediaAccounts,
        loadEnv().nextAuth.secret
      ),
    })
  } catch (error) {
    return handleApiError(error)
  }
}
