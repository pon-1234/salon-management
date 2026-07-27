/**
 * @design_doc   Centralized runtime configuration with production-safe defaults
 * @related_to   operations/readiness.ts, notification/readiness.ts, storage/index.ts
 * @known_issues Credential validity and dependency reachability are checked by runtime readiness probes
 */
import { z } from 'zod'

function isPostgresUrl(value: string): boolean {
  try {
    const parsed = new URL(value)
    return (
      (parsed.protocol === 'postgresql:' || parsed.protocol === 'postgres:') &&
      parsed.hostname.length > 0
    )
  } catch {
    return false
  }
}

function selectsPreviewDatabase(value: string): boolean {
  try {
    const parsed = new URL(value)
    return /^\/[a-z0-9][a-z0-9_-]*_preview$/u.test(decodeURIComponent(parsed.pathname))
  } catch {
    return false
  }
}

function hasPreviewPathSegment(value: string): boolean {
  return value
    .split('/')
    .filter(Boolean)
    .some((segment) => /(?:^|[-_])preview(?:[-_]|$)/iu.test(segment))
}

function normalizeProductionStorageRoot(value: string): string | null {
  if (!value.startsWith('/') || value.includes('\0')) return null
  const segments: string[] = []
  for (const segment of value.split('/')) {
    if (!segment || segment === '.') continue
    if (segment === '..') segments.pop()
    else segments.push(segment)
  }
  return segments.length > 0 ? `/${segments.join('/')}` : null
}

function normalizeHttpsUrl(value: string): string | null {
  try {
    const parsed = new URL(value)
    if (
      parsed.protocol !== 'https:' ||
      !parsed.hostname ||
      parsed.username ||
      parsed.password ||
      parsed.search ||
      parsed.hash
    ) {
      return null
    }
    return parsed.toString().replace(/\/+$/u, '')
  } catch {
    return null
  }
}

function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(value)) return false

  const parsed = new Date(`${value}T00:00:00.000Z`)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}

function normalizePreviewSnapshotCutoff(value: string | undefined): string | null {
  if (value === undefined) return null

  const trimmed = value.trim()
  if (trimmed === value && isValidIsoDate(trimmed)) return trimmed

  const timestampMatch = trimmed.match(
    /^(\d{4}-\d{2}-\d{2})T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})$/u
  )
  if (trimmed === value && timestampMatch && isValidIsoDate(timestampMatch[1])) {
    const parsed = new Date(trimmed)
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString()
  }

  throw new Error(
    '[env] PREVIEW_SNAPSHOT_CUTOFF must be an ISO date or a timezone-qualified ISO timestamp.'
  )
}

function createEnv() {
  const nodeEnv = process.env.NODE_ENV ?? 'development'
  const isProduction = nodeEnv === 'production'

  const rawEnvSchema = z.object({
    DATABASE_URL: z.string().optional(),
    DIRECT_URL: z.string().optional(),
    POSTGRES_URL: z.string().optional(),
    POSTGRES_PRISMA_URL: z.string().optional(),
    POSTGRES_URL_NON_POOLING: z.string().optional(),
    NEXTAUTH_URL: z.string().optional(),
    NEXTAUTH_SECRET: z.string().optional(),
    NEXT_PUBLIC_SITE_URL: z.string().optional(),
    NEXT_PUBLIC_SUPABASE_URL: z.string().optional(),
    SUPABASE_URL: z.string().optional(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional(),
    SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
    RESEND_API_KEY: z.string().optional(),
    FROM_EMAIL: z.string().optional(),
    BUSINESS_HOUR_START: z.string().optional(),
    BUSINESS_HOUR_END: z.string().optional(),
    USE_MOCK_FALLBACK: z.string().optional(),
    NEXT_PUBLIC_USE_MOCK_FALLBACK: z.string().optional(),
    INITIAL_ADMIN_PASSWORD: z.string().optional(),
    LINE_MESSAGING_CHANNEL_ACCESS_TOKEN: z.string().optional(),
    LINE_MESSAGING_CHANNEL_SECRET: z.string().optional(),
    LINE_MESSAGING_ENABLED: z.string().optional(),
    LINE_MESSAGING_DEFAULT_USER_ID: z.string().optional(),
    LINE_CHANNEL_SECRET: z.string().optional(),
    VONAGE_API_KEY: z.string().optional(),
    VONAGE_API_SECRET: z.string().optional(),
    VONAGE_SMS_FROM: z.string().optional(),
    NOTIFICATION_MOCK_ENABLED: z.string().optional(),
    STORAGE_ROOT: z.string().optional(),
    STORAGE_PUBLIC_BASE_URL: z.string().optional(),
    APP_RUNTIME_MODE: z.enum(['live', 'preview']).optional(),
    OUTBOUND_DELIVERY_MODE: z.enum(['provider', 'disabled']).optional(),
    PREVIEW_ACCESS_GATE_TOKEN: z.string().optional(),
    PREVIEW_TARGET_ID: z.string().optional(),
    PREVIEW_SNAPSHOT_CUTOFF: z.string().optional(),
  })

  const rawEnv = rawEnvSchema.parse({
    DATABASE_URL: process.env.DATABASE_URL,
    DIRECT_URL: process.env.DIRECT_URL,
    POSTGRES_URL: process.env.POSTGRES_URL,
    POSTGRES_PRISMA_URL: process.env.POSTGRES_PRISMA_URL,
    POSTGRES_URL_NON_POOLING: process.env.POSTGRES_URL_NON_POOLING,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_URL: process.env.SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    FROM_EMAIL: process.env.FROM_EMAIL,
    BUSINESS_HOUR_START: process.env.BUSINESS_HOUR_START,
    BUSINESS_HOUR_END: process.env.BUSINESS_HOUR_END,
    USE_MOCK_FALLBACK: process.env.USE_MOCK_FALLBACK,
    NEXT_PUBLIC_USE_MOCK_FALLBACK: process.env.NEXT_PUBLIC_USE_MOCK_FALLBACK,
    INITIAL_ADMIN_PASSWORD: process.env.INITIAL_ADMIN_PASSWORD,
    LINE_MESSAGING_CHANNEL_ACCESS_TOKEN: process.env.LINE_MESSAGING_CHANNEL_ACCESS_TOKEN,
    LINE_MESSAGING_CHANNEL_SECRET: process.env.LINE_MESSAGING_CHANNEL_SECRET,
    LINE_MESSAGING_ENABLED: process.env.LINE_MESSAGING_ENABLED,
    LINE_MESSAGING_DEFAULT_USER_ID: process.env.LINE_MESSAGING_DEFAULT_USER_ID,
    LINE_CHANNEL_SECRET: process.env.LINE_CHANNEL_SECRET,
    VONAGE_API_KEY: process.env.VONAGE_API_KEY,
    VONAGE_API_SECRET: process.env.VONAGE_API_SECRET,
    VONAGE_SMS_FROM: process.env.VONAGE_SMS_FROM,
    NOTIFICATION_MOCK_ENABLED: process.env.NOTIFICATION_MOCK_ENABLED,
    STORAGE_ROOT: process.env.STORAGE_ROOT,
    STORAGE_PUBLIC_BASE_URL: process.env.STORAGE_PUBLIC_BASE_URL,
    APP_RUNTIME_MODE: process.env.APP_RUNTIME_MODE,
    OUTBOUND_DELIVERY_MODE: process.env.OUTBOUND_DELIVERY_MODE,
    PREVIEW_ACCESS_GATE_TOKEN: process.env.PREVIEW_ACCESS_GATE_TOKEN,
    PREVIEW_TARGET_ID: process.env.PREVIEW_TARGET_ID,
    PREVIEW_SNAPSHOT_CUTOFF: process.env.PREVIEW_SNAPSHOT_CUTOFF,
  })

  const runtimeMode = rawEnv.APP_RUNTIME_MODE ?? 'live'
  const outboundDeliveryMode = rawEnv.OUTBOUND_DELIVERY_MODE ?? 'provider'
  if (runtimeMode === 'preview' && outboundDeliveryMode !== 'disabled') {
    throw new Error('[env] APP_RUNTIME_MODE=preview requires OUTBOUND_DELIVERY_MODE=disabled.')
  }
  if (isProduction && runtimeMode === 'live' && outboundDeliveryMode !== 'provider') {
    throw new Error(
      '[env] APP_RUNTIME_MODE=live requires OUTBOUND_DELIVERY_MODE=provider in production.'
    )
  }

  const configuredPreviewAccessGateToken = rawEnv.PREVIEW_ACCESS_GATE_TOKEN ?? ''
  const previewAccessGateToken = configuredPreviewAccessGateToken.trim()
  if (
    runtimeMode === 'preview' &&
    (previewAccessGateToken.length < 32 ||
      previewAccessGateToken !== configuredPreviewAccessGateToken)
  ) {
    throw new Error(
      '[env] APP_RUNTIME_MODE=preview requires PREVIEW_ACCESS_GATE_TOKEN with at least 32 characters.'
    )
  }
  const previewTargetId = rawEnv.PREVIEW_TARGET_ID?.trim() ?? ''
  if (runtimeMode === 'preview' && !/^[A-Za-z0-9][A-Za-z0-9_-]{19,127}$/u.test(previewTargetId)) {
    throw new Error('[env] APP_RUNTIME_MODE=preview requires a strong PREVIEW_TARGET_ID.')
  }
  const previewSnapshotCutoff =
    runtimeMode === 'preview'
      ? normalizePreviewSnapshotCutoff(rawEnv.PREVIEW_SNAPSHOT_CUTOFF)
      : null

  const previewOutboundConfiguration = [
    rawEnv.RESEND_API_KEY,
    rawEnv.FROM_EMAIL,
    rawEnv.VONAGE_API_KEY,
    rawEnv.VONAGE_API_SECRET,
    rawEnv.VONAGE_SMS_FROM,
    rawEnv.LINE_MESSAGING_CHANNEL_ACCESS_TOKEN,
    rawEnv.LINE_MESSAGING_CHANNEL_SECRET,
    rawEnv.LINE_CHANNEL_SECRET,
    rawEnv.LINE_MESSAGING_DEFAULT_USER_ID,
  ]
  if (
    runtimeMode === 'preview' &&
    (previewOutboundConfiguration.some((value) => Boolean(value?.trim())) ||
      rawEnv.LINE_MESSAGING_ENABLED?.trim().toLowerCase() === 'true')
  ) {
    throw new Error('[env] Preview runtime forbids outbound provider configuration.')
  }

  const configuredDatabaseUrl = rawEnv.DATABASE_URL?.trim()
  if (isProduction && !configuredDatabaseUrl) {
    throw new Error('[env] DATABASE_URL is required in production.')
  }
  if (isProduction && !isPostgresUrl(configuredDatabaseUrl ?? '')) {
    throw new Error('[env] DATABASE_URL must be a PostgreSQL URL in production.')
  }
  if (runtimeMode === 'preview' && !selectsPreviewDatabase(configuredDatabaseUrl ?? '')) {
    throw new Error(
      '[env] APP_RUNTIME_MODE=preview requires DATABASE_URL to select a _preview database.'
    )
  }
  const databaseUrl =
    configuredDatabaseUrl ?? rawEnv.POSTGRES_PRISMA_URL ?? rawEnv.POSTGRES_URL ?? ''
  const directDatabaseUrl =
    rawEnv.DIRECT_URL ?? rawEnv.POSTGRES_URL_NON_POOLING ?? rawEnv.POSTGRES_URL ?? databaseUrl

  const configuredNextAuthUrl = rawEnv.NEXTAUTH_URL?.trim()
  if (isProduction && !configuredNextAuthUrl) {
    throw new Error('[env] NEXTAUTH_URL is required in production. Set it to the public HTTPS URL.')
  }

  const normalizedProductionNextAuthUrl = configuredNextAuthUrl
    ? normalizeHttpsUrl(configuredNextAuthUrl)
    : null
  if (isProduction && !normalizedProductionNextAuthUrl) {
    throw new Error('[env] NEXTAUTH_URL must be an absolute HTTPS URL in production.')
  }
  const nextAuthUrl =
    normalizedProductionNextAuthUrl ?? configuredNextAuthUrl ?? 'http://localhost:3000'
  try {
    new URL(nextAuthUrl)
  } catch {
    throw new Error('[env] NEXTAUTH_URL must be an absolute URL.')
  }
  const defaultDevSecret = 'development-secret-key-not-for-production'
  const configuredNextAuthSecret = rawEnv.NEXTAUTH_SECRET?.trim()
  const nextAuthSecret = configuredNextAuthSecret ?? (isProduction ? undefined : defaultDevSecret)

  if (isProduction) {
    if (!nextAuthSecret) {
      throw new Error(
        '[env] NEXTAUTH_SECRET is required in production. Set it in your environment.'
      )
    }
    if (nextAuthSecret.length < 32) {
      throw new Error('[env] NEXTAUTH_SECRET must be at least 32 characters in production.')
    }
  }

  const supabaseUrl = rawEnv.NEXT_PUBLIC_SUPABASE_URL ?? rawEnv.SUPABASE_URL ?? ''
  const supabaseAnonKey = rawEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
  const supabaseServiceRoleKey = rawEnv.SUPABASE_SERVICE_ROLE_KEY ?? ''

  const resendApiKey = rawEnv.RESEND_API_KEY ?? ''
  const fromEmail = rawEnv.FROM_EMAIL ?? (isProduction ? '' : 'onboarding@resend.dev')

  const businessHourStart = rawEnv.BUSINESS_HOUR_START ?? '09:00'
  const businessHourEnd = rawEnv.BUSINESS_HOUR_END ?? '23:00'

  const mockFallbackPreference = rawEnv.NEXT_PUBLIC_USE_MOCK_FALLBACK ?? rawEnv.USE_MOCK_FALLBACK
  const mockFallbackRaw = mockFallbackPreference?.toLowerCase() ?? ''
  const useMockFallbacks =
    !isProduction &&
    (mockFallbackRaw === 'true' ? true : mockFallbackRaw === 'false' ? false : true)

  const initialAdminPassword = rawEnv.INITIAL_ADMIN_PASSWORD ?? ''
  const lineChannelAccessToken = rawEnv.LINE_MESSAGING_CHANNEL_ACCESS_TOKEN ?? ''
  const legacyLineChannelSecret = (rawEnv.LINE_MESSAGING_CHANNEL_SECRET ?? '').trim()
  const lineMessagingEnabledRaw = rawEnv.LINE_MESSAGING_ENABLED?.toLowerCase()
  const isLineMessagingExplicitlyEnabled =
    lineMessagingEnabledRaw === 'true'
      ? true
      : lineMessagingEnabledRaw === 'false'
        ? false
        : undefined
  const isLineMessagingEnabled =
    isLineMessagingExplicitlyEnabled ?? lineChannelAccessToken.trim().length > 0
  const lineDefaultUserId = rawEnv.LINE_MESSAGING_DEFAULT_USER_ID ?? ''
  const configuredLineChannelSecret = (rawEnv.LINE_CHANNEL_SECRET ?? '').trim()
  const lineWebhookChannelSecret =
    configuredLineChannelSecret.length > 0 ? configuredLineChannelSecret : legacyLineChannelSecret
  const vonageApiKey = rawEnv.VONAGE_API_KEY ?? ''
  const vonageApiSecret = rawEnv.VONAGE_API_SECRET ?? ''
  const vonageSmsFrom = rawEnv.VONAGE_SMS_FROM ?? ''
  const notificationMockEnabled =
    outboundDeliveryMode !== 'disabled' &&
    !isProduction &&
    rawEnv.NOTIFICATION_MOCK_ENABLED?.trim().toLowerCase() === 'true'

  const configuredStorageRoot = rawEnv.STORAGE_ROOT?.trim()
  if (isProduction && !configuredStorageRoot) {
    throw new Error('[env] STORAGE_ROOT is required in production.')
  }
  const productionStorageRoot = configuredStorageRoot
    ? normalizeProductionStorageRoot(configuredStorageRoot)
    : null
  if (isProduction && !productionStorageRoot) {
    throw new Error('[env] STORAGE_ROOT must be a non-root absolute path in production.')
  }
  const storageRoot = productionStorageRoot ?? configuredStorageRoot ?? '/var/lib/salon-storage'
  if (runtimeMode === 'preview' && !hasPreviewPathSegment(storageRoot)) {
    throw new Error(
      '[env] APP_RUNTIME_MODE=preview requires an isolated preview STORAGE_ROOT path segment.'
    )
  }

  const configuredStoragePublicBaseUrl = rawEnv.STORAGE_PUBLIC_BASE_URL?.trim()
  if (isProduction && !configuredStoragePublicBaseUrl) {
    throw new Error('[env] STORAGE_PUBLIC_BASE_URL is required in production.')
  }
  const productionStoragePublicBaseUrl = configuredStoragePublicBaseUrl
    ? normalizeHttpsUrl(configuredStoragePublicBaseUrl)
    : null
  if (isProduction && !productionStoragePublicBaseUrl) {
    throw new Error('[env] STORAGE_PUBLIC_BASE_URL must be an absolute HTTPS URL in production.')
  }
  const storagePublicBaseUrl =
    productionStoragePublicBaseUrl ??
    configuredStoragePublicBaseUrl?.replace(/\/+$/u, '') ??
    `${rawEnv.NEXT_PUBLIC_SITE_URL ?? nextAuthUrl}/salon-uploads`
  if (
    runtimeMode === 'preview' &&
    new URL(storagePublicBaseUrl).origin !== new URL(nextAuthUrl).origin
  ) {
    throw new Error(
      '[env] Preview STORAGE_PUBLIC_BASE_URL must use the NEXTAUTH_URL origin protected by the access gateway.'
    )
  }

  const siteUrl = rawEnv.NEXT_PUBLIC_SITE_URL ?? nextAuthUrl

  return {
    nodeEnv,
    isProduction,
    runtimeMode,
    outbound: {
      deliveryMode: outboundDeliveryMode,
    },
    preview: {
      accessGateToken: runtimeMode === 'preview' ? previewAccessGateToken : '',
      targetId: runtimeMode === 'preview' ? previewTargetId : '',
      snapshotCutoff: previewSnapshotCutoff,
    },
    database: {
      url: databaseUrl,
      directUrl: directDatabaseUrl,
    },
    nextAuth: {
      url: nextAuthUrl,
      secret: nextAuthSecret ?? '',
    },
    supabase: {
      url: supabaseUrl,
      anonKey: supabaseAnonKey,
      serviceRoleKey: supabaseServiceRoleKey,
    },
    resend: {
      apiKey: resendApiKey,
      fromEmail,
    },
    businessHours: {
      start: businessHourStart,
      end: businessHourEnd,
    },
    featureFlags: {
      useMockFallbacks,
    },
    seed: {
      initialAdminPassword,
    },
    siteUrl,
    line: {
      messaging: {
        enabled: isLineMessagingEnabled,
        channelAccessToken: lineChannelAccessToken,
        defaultUserId: lineDefaultUserId,
        channelSecret: lineWebhookChannelSecret,
      },
    },
    vonage: {
      apiKey: vonageApiKey,
      apiSecret: vonageApiSecret,
      smsFrom: vonageSmsFrom,
    },
    notification: {
      mockEnabled: notificationMockEnabled,
    },
    storage: {
      root: storageRoot,
      publicBaseUrl: storagePublicBaseUrl,
    },
  }
}

let cachedEnv: ReturnType<typeof createEnv> | null = null

export function loadEnv() {
  if (!cachedEnv) {
    cachedEnv = createEnv()
  }
  return cachedEnv
}

export function refreshEnv() {
  cachedEnv = createEnv()
  return cachedEnv
}

export const env = loadEnv()

export type AppEnv = ReturnType<typeof createEnv>
