import { z } from 'zod'

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
    VERCEL_URL: z.string().optional(),
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
    VERCEL_URL: process.env.VERCEL_URL,
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
  })

  const databaseUrl =
    rawEnv.DATABASE_URL ??
    rawEnv.POSTGRES_PRISMA_URL ??
    rawEnv.POSTGRES_URL ??
    ''
  const directDatabaseUrl =
    rawEnv.DIRECT_URL ?? rawEnv.POSTGRES_URL_NON_POOLING ?? rawEnv.POSTGRES_URL ?? databaseUrl

  const nextAuthUrl = rawEnv.NEXTAUTH_URL ?? 'http://localhost:3000'
  const defaultDevSecret = 'development-secret-key-not-for-production'
  const nextAuthSecret =
    rawEnv.NEXTAUTH_SECRET ?? (isProduction ? undefined : defaultDevSecret)

  if (isProduction && !nextAuthSecret) {
    throw new Error(
      '[env] NEXTAUTH_SECRET is required in production. Set it in your environment.'
    )
  }

  const supabaseUrl =
    rawEnv.NEXT_PUBLIC_SUPABASE_URL ?? rawEnv.SUPABASE_URL ?? ''
  const supabaseAnonKey = rawEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
  const supabaseServiceRoleKey = rawEnv.SUPABASE_SERVICE_ROLE_KEY ?? ''

  const resendApiKey = rawEnv.RESEND_API_KEY ?? ''
  const fromEmail = rawEnv.FROM_EMAIL ?? 'onboarding@resend.dev'

  const businessHourStart = rawEnv.BUSINESS_HOUR_START ?? '09:00'
  const businessHourEnd = rawEnv.BUSINESS_HOUR_END ?? '23:00'

  const mockFallbackPreference =
    rawEnv.NEXT_PUBLIC_USE_MOCK_FALLBACK ?? rawEnv.USE_MOCK_FALLBACK
  const mockFallbackRaw = mockFallbackPreference?.toLowerCase() ?? ''
  const useMockFallbacks =
    mockFallbackRaw === 'true'
      ? true
      : mockFallbackRaw === 'false'
        ? false
        : !isProduction

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

  const siteUrl =
    rawEnv.NEXT_PUBLIC_SITE_URL ??
    nextAuthUrl ??
    (rawEnv.VERCEL_URL ? `https://${rawEnv.VERCEL_URL}` : '')

  return {
    nodeEnv,
    isProduction,
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
