/**
 * @design_doc   docs/SYSTEM_AUDIT_2026-07-26.md G-2 browser journey coverage
 * @related_to   storefront-and-auth.spec.ts verifies the warmed routes through Chromium
 * @known_issues Route warmup covers only the cold development compilations exercised by the E2E suite
 */
import { request, type FullConfig } from '@playwright/test'

const E2E_ROUTES = [
  '/ikebukuro/age-verification?callbackUrl=%2Fikebukuro%2Fservices',
  '/ikebukuro/services',
  '/ikebukuro/booking',
  '/admin/dashboard',
] as const

const ROUTE_WARMUP_TIMEOUT_MS = 120_000
const ROUTE_WARMUP_TRANSPORT_ATTEMPTS = 3

interface BrowserJourneyRequestContext {
  get: (
    path: string,
    options: { timeout: number }
  ) => Promise<{ ok: () => boolean; status: () => number }>
}

/**
 * Warms one cold route with a CI-sized timeout and bounded retries for transport failures only.
 */
export async function warmBrowserJourneyRoute(
  context: BrowserJourneyRequestContext,
  path: string
): Promise<void> {
  for (let attempt = 1; attempt <= ROUTE_WARMUP_TRANSPORT_ATTEMPTS; attempt += 1) {
    let response: Awaited<ReturnType<BrowserJourneyRequestContext['get']>>
    try {
      response = await context.get(path, { timeout: ROUTE_WARMUP_TIMEOUT_MS })
    } catch {
      if (attempt === ROUTE_WARMUP_TRANSPORT_ATTEMPTS) {
        throw new Error(
          `E2E route warmup failed for ${path} after ${ROUTE_WARMUP_TRANSPORT_ATTEMPTS} transport attempts.`
        )
      }
      continue
    }

    if (!response.ok()) {
      throw new Error(`E2E route warmup failed for ${path} with status ${response.status()}.`)
    }
    return
  }
}

export default async function warmBrowserJourneyRoutes(config: FullConfig): Promise<void> {
  const baseURL = config.projects[0]?.use.baseURL
  if (typeof baseURL !== 'string') {
    throw new Error('Playwright baseURL is required for E2E route warmup.')
  }

  const context = await request.newContext({
    baseURL,
    extraHTTPHeaders: {
      Cookie: 'salon_age_verified=1',
    },
  })

  try {
    for (const path of E2E_ROUTES) {
      await warmBrowserJourneyRoute(context, path)
    }
  } finally {
    await context.dispose()
  }
}
