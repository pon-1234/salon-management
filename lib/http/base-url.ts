const FALLBACK_BASE_URL = 'http://localhost:3000'

function normalizeBaseUrl(url?: string | null): string {
  if (!url) return FALLBACK_BASE_URL
  return url.endsWith('/') ? url.slice(0, -1) : url
}

export function resolveApiUrl(path: string): string {
  if (path.startsWith('http')) {
    return path
  }

  if (typeof window !== 'undefined') {
    return path
  }

  const baseUrl =
    normalizeBaseUrl(process.env.NEXT_PUBLIC_SITE_URL) ||
    normalizeBaseUrl(process.env.NEXTAUTH_URL) ||
    normalizeBaseUrl(process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined)

  const sanitizedPath = path.startsWith('/') ? path : `/${path}`
  return `${baseUrl}${sanitizedPath}`
}
