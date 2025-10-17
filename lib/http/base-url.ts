const FALLBACK_BASE_URL = 'http://localhost:3000'

function normalizeBaseUrl(url?: string | null): string | null {
  if (!url) return null
  const trimmed = url.trim()
  if (!trimmed) return null
  return trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed
}

function resolveServerBaseUrl(): string {
  const candidates: Array<string | undefined> = []

  if (typeof window === 'undefined') {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { env } = require('@/lib/config/env') as {
        env: {
          siteUrl: string
          nextAuth: { url: string }
        }
      }
      candidates.push(env.siteUrl, env.nextAuth.url)
    } catch {
      // Fall through to process.env based values
    }
  }

  candidates.push(
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.NEXTAUTH_URL,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined
  )

  for (const candidate of candidates) {
    const normalized = normalizeBaseUrl(candidate)
    if (normalized) {
      return normalized
    }
  }

  return FALLBACK_BASE_URL
}

export function resolveApiUrl(path: string): string {
  if (path.startsWith('http')) {
    return path
  }

  if (typeof window !== 'undefined') {
    return path
  }

  const baseUrl = resolveServerBaseUrl()
  const sanitizedPath = path.startsWith('/') ? path : `/${path}`
  return `${baseUrl}${sanitizedPath}`
}
